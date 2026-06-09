"""
Scrape Edexcel Physics structured questions from SME and import to DB.
Each subtopic × 3 difficulties (easy/medium/hard) → ~60 questions per subtopic.
Inserts into `questions` table with proper subtopic_id, topic_id.
"""
import requests, json, re, html, time, sys, os
from urllib.parse import quote

# === CONFIG ===
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
SERVICE_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
SUBJECT_UUID = "bc5149b5-9700-4b2a-a2f5-8d908a88be38"
SME_BASE = "https://www.savemyexams.com/igcse/physics/edexcel/19/topic-questions"

# === ProseMirror → Markdown ===
def pm_to_md(nodes):
    if not nodes: return ""
    if isinstance(nodes, dict): nodes = [nodes]
    return ''.join(_render_node(n) for n in nodes).strip()

def _render_node(node):
    if not node or not isinstance(node, dict): return ""
    t = node.get('type', '')
    content = node.get('content', [])
    
    if t == 'doc': return pm_to_md(content)
    elif t == 'paragraph':
        text = _render_inline(content)
        align = node.get('attrs', {}).get('textAlign', '')
        return text + '\n\n'
    elif t == 'text':
        text = node.get('text', '')
        for m in node.get('marks', []):
            mt = m.get('type')
            if mt == 'bold': text = f'**{text}**'
            elif mt in ('italic', 'emphasis'): text = f'*{text}*'
            elif mt == 'code': text = f'`{text}`'
        return text
    elif t == 'figure':
        a = node.get('attrs', {})
        src, alt = a.get('src', ''), a.get('alt', 'diagram')
        w = a.get('width', '')
        return f'![]({src})\n\n' if not w else f'![]({src})\n\n'
    elif t == 'image':
        a = node.get('attrs', {})
        src, alt = a.get('src', ''), a.get('alt', '')
        return f'![{alt}]({src})\n\n'
    elif t == 'bulletList':
        items = []
        for li in content:
            if li.get('type') == 'listItem':
                items.append(f'- {_render_inline(li.get("content",[]))}')
        return '\n'.join(items) + '\n\n'
    elif t == 'orderedList':
        items = []
        for i, li in enumerate(content):
            if li.get('type') == 'listItem':
                items.append(f'{i+1}. {_render_inline(li.get("content",[]))}')
        return '\n'.join(items) + '\n\n'
    elif t == 'table':
        rows = ''
        for row in content:
            if row.get('type') != 'tableRow': continue
            cells = ''
            for c in row.get('content', []):
                ct = 'th' if c.get('type') == 'tableHeader' else 'td'
                cells += f'<{ct} class="border border-gray-300 px-3 py-1.5">{_render_inline(c.get("content",[]))}</{ct}>'
            rows += f'<tr>{cells}</tr>'
        return f'<table class="w-full text-sm border-collapse border border-gray-300 mb-4"><tbody>{rows}</tbody></table>\n\n'
    elif t == 'hardBreak': return '\n'
    elif t == 'horizontalRule': return '---\n\n'
    elif t in ('inlineLaTeX', 'latex', 'math'):
        return f'${node.get("attrs",{}).get("data","") or node.get("text","")}$'
    elif t == 'blockLaTeX':
        return f'$${node.get("attrs",{}).get("data","") or node.get("text","")}$$\n\n'
    elif t == 'heading':
        level = node.get('attrs', {}).get('level', 1)
        return f'{"#"*level} {_render_inline(content)}\n\n'
    return _render_inline(content)

def _render_inline(nodes):
    if not nodes: return ""
    if isinstance(nodes, dict): nodes = [nodes]
    return ''.join(_render_node(n) for n in nodes).strip()

def extract_clean_text(nodes):
    """Extract plain text for answer grading"""
    if not nodes: return ''
    if isinstance(nodes, dict): nodes = [nodes]
    texts = []
    for node in nodes:
        t = node.get('type', '')
        if t == 'text': texts.append(node.get('text', ''))
        elif t in ('inlineLaTeX', 'latex', 'math'):
            texts.append(node.get('attrs', {}).get('data', '') or node.get('text', ''))
        else:
            texts.append(extract_clean_text(node.get('content', [])))
    return ' '.join(filter(None, texts)).strip()

# === STEP 1: Get SME structure ===
def get_sme_structure():
    r = requests.get(SME_BASE, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.DOTALL)
    if not match: raise Exception("No __NEXT_DATA__ found")
    data = json.loads(html.unescape(match.group(1)))
    pp = data['props']['pageProps']
    
    # Build section slug map
    sections = {}
    for s in pp['sections']:
        sections[s['id']] = {'slug': s['attributes']['slug'], 'name': s['attributes']['name']}
    
    # Build topic (subtopic) list with section mapping
    sme_topics = []
    for t in pp['topics']:
        sec_id = t['relationships']['section']['data']['id']
        sme_topics.append({
            'id': t['id'],
            'slug': t['attributes']['slug'],
            'name': t['attributes']['name'],
            'section_slug': sections[sec_id]['slug'],
        })
    
    # Build question set -> topic mapping (for difficulty info)
    qset_to_topic = {}
    for qs in pp['questionSets']:
        top_id = qs['relationships']['topic']['data']['id']
        qset_to_topic[qs['id']] = top_id
    
    return sme_topics, qset_to_topic

# === STEP 2: Get DB subtopics ===
def get_db_subtopics():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/topics", params={
        "select": "id,name,sort_order",
        "subject_id": f"eq.{SUBJECT_UUID}",
        "order": "sort_order.asc"
    }, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
    topics = r.json()
    topic_ids = [t['id'] for t in topics]
    
    r2 = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics", params={
        "select": "id,name,display_name,slug,topic_id",
        "topic_id": f"in.({','.join(topic_ids)})",
        "order": "sort_order.asc"
    }, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
    subtopics = r2.json()
    
    # Build lookup: SME slug → DB subtopic
    # SME slug: "1-1-movement-and-position" → strip prefix → "movement-and-position"
    lookup = {}
    for s in subtopics:
        db_slug = s['slug']  # e.g., "1-1-movement-and-position"
        # Try exact match
        lookup[db_slug] = s
        # Try stripped (remove "1-1-")
        stripped = re.sub(r'^\d+-\d+-', '', db_slug)
        lookup[stripped] = s
        # Try display_name based
        dn = s.get('display_name') or s['name']
        key = re.sub(r'[^a-z0-9]+', '-', dn.lower()).strip('-')
        lookup[key] = s
    
    return subtopics, lookup, {t['id']: t for t in topics}

# === STEP 3: Fetch questions for a subtopic ===
def fetch_questions(section_slug, sme_subtopic_slug, difficulty):
    """Fetch questions for a specific subtopic and difficulty"""
    url = f"{SME_BASE}/{section_slug}/{sme_subtopic_slug}/exam-questions/?difficulty={difficulty}"
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        if r.status_code != 200: return []
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.DOTALL)
        if not match: return []
        data = json.loads(html.unescape(match.group(1)))
        questions = data.get('props', {}).get('pageProps', {}).get('questions', [])
        return questions
    except:
        return []

# === STEP 4: Process questions into DB records ===
LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

def process_question(q_item, subtopic_id, topic_id, global_order):
    """Process one SME question into individual part records"""
    attrs = q_item['attributes']
    difficulty = attrs['difficulty']
    parts = attrs.get('parts', [])
    
    records = []
    for pi, part in enumerate(parts):
        qtype = 'mcq' if part.get('question_type') == 'multiple_choice' else 'structured'
        marks = part.get('marks', 1)
        order = part.get('order', pi)
        
        # Part label (a), (b), (c)...
        label = ''
        if len(parts) > 1:
            label_chr = chr(97 + pi)  # a, b, c...
            label = f'**({label_chr})** '
        
        # Convert problem to markdown
        problem = part.get('problem', [])
        stem_md = pm_to_md(problem)
        
        # Handle MCQ choices
        choices = part.get('choices', None)
        if choices:
            choice_lines = []
            for ci, choice in enumerate(sorted(choices, key=lambda c: c.get('order', 0))):
                ch_text = pm_to_md(choice.get('content', []))
                ch_label = LABELS[ci] if ci < len(LABELS) else f'?{ci}'
                choice_lines.append(f'{ch_label}. {ch_text}')
            stem_md = stem_md + '\n' + '\n'.join(choice_lines)
        
        # Convert solution
        solution = part.get('solution', [])
        answer_md = pm_to_md(solution)
        if answer_md:
            answer_md = label + answer_md
        
        clean_answer = extract_clean_text(solution)
        
        question_text = label + stem_md
        
        records.append({
            'question_text': question_text,
            'answer_text': answer_md if answer_md else '',
            'clean_answer_text': clean_answer,
            'question_type': qtype,
            'difficulty': difficulty,
            'marks': marks,
            'sort_order': global_order,
            'subtopic_id': subtopic_id,
            'topic_id': topic_id,
            'subject_id': SUBJECT_UUID,
        })
        global_order += 1
    
    return records, global_order

# === MAIN ===
def main():
    # Step 1: Get SME structure
    print("Fetching SME structure...")
    sme_topics, _ = get_sme_structure()
    print(f"Found {len(sme_topics)} SME subtopics")
    
    # Step 2: Get DB subtopics
    db_subtopics, db_lookup, topic_map = get_db_subtopics()
    print(f"Found {len(db_subtopics)} DB subtopics")
    
    # Step 3: Map SME → DB subtopics
    mapping = []
    unmapped = []
    for st in sme_topics:
        sme_slug = st['slug']
        db_st = db_lookup.get(sme_slug) or db_lookup.get(re.sub(r'^\d+-\d+-', '', sme_slug))
        if db_st:
            mapping.append((st['section_slug'], sme_slug, db_st['id'], db_st['topic_id'], db_st.get('display_name') or db_st['name']))
        else:
            unmapped.append(st['name'])
    
    print(f"Mapped: {len(mapping)}, Unmapped: {len(unmapped)}")
    if unmapped:
        for u in unmapped:
            print(f"  ❌ {u}")
        return
    
    # Step 4: Fetch questions for each subtopic × 3 difficulties
    all_records = []
    global_order = 1
    os.makedirs("/tmp/edexcel_phys_questions", exist_ok=True)
    
    for i, (sec_slug, sme_slug, stid, topid, st_name) in enumerate(mapping):
        print(f"\n[{i+1}/{len(mapping)}] {st_name}: fetching...", end=" ")
        
        subtopic_records = []
        for diff in ['easy', 'medium', 'hard']:
            questions = fetch_questions(sec_slug, sme_slug, diff)
            for q in questions:
                recs, global_order = process_question(q, stid, topid, global_order)
                subtopic_records.extend(recs)
            time.sleep(0.5)  # Rate limit
        
        print(f"{len(subtopic_records)} parts")
        all_records.extend(subtopic_records)
    
    print(f"\nTotal question parts: {len(all_records)}")
    
    if len(all_records) == 0:
        print("❌ No questions fetched!")
        return
    
    # Save to JSON for review
    with open('/tmp/edexcel_phys_questions/all_questions.json', 'w') as f:
        json.dump(all_records, f, indent=2)
    print(f"Saved to /tmp/edexcel_phys_questions/all_questions.json")
    
    # Step 5: Insert into DB
    print("\nInserting into DB...")
    BATCH_SIZE = 50
    inserted = 0
    for batch_start in range(0, len(all_records), BATCH_SIZE):
        batch = all_records[batch_start:batch_start+BATCH_SIZE]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/questions",
            json=batch,
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                     "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"}
        )
        if r.status_code in (200, 201):
            inserted += len(batch)
            print(f"  ✅ Inserted {inserted}/{len(all_records)}")
        else:
            print(f"  ❌ Batch failed ({r.status_code}): {r.text[:200]}")
    
    print(f"\n✅ Done! Inserted {inserted} question parts")

if __name__ == "__main__":
    import os
    main()
