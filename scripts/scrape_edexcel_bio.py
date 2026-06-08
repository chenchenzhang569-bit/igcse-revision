#!/usr/bin/env python3
"""Scrape SME Edexcel IGCSE Biology (4BI1) topic questions → questions table.
Handles: multi-part questions, figures (images), tables, structured answers.
"""
import requests, json, re, sys, time, uuid, os, base64

SME_EMAIL = "inspiringchermann@vmail.dev"
SME_PASS = "WXVm8Chqq2"
SME_BASE = "https://www.savemyexams.com/igcse/biology/edexcel/19/topic-questions"

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
BASE = f"{SUPABASE_URL}/rest/v1"
# Service role key for INSERT — read from .env.local or env var
SR_KEY = None
if os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
    SR_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
else:
    # Try reading from .env.local
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SR_KEY = line.strip().split("=", 1)[1]
                    break
    if not SR_KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in env or .env.local")
        sys.exit(1)
H = {"apikey": SR_KEY, "Authorization": f"Bearer {SR_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"}

SUBJECT_ID = "bd4cf51a-3265-4257-a984-b4adc51d2614"

# Known SME CDN images — try to download as data URIs to avoid hotlink 403
def try_download_as_datauri(url):
    """Try to download an image and return as data URI. Fallback to original URL."""
    if not url or url.startswith('data:'):
        return url
    try:
        r = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.savemyexams.com/',
        })
        if r.status_code == 200 and len(r.content) > 100:
            ctype = r.headers.get('content-type', 'image/webp')
            b64 = base64.b64encode(r.content).decode()
            return f"data:{ctype};base64,{b64}"
    except:
        pass
    return url  # fallback

# ─── ProseMirror → markdown ───
def prose_to_md(node):
    if isinstance(node, str): return node
    if isinstance(node, list): return ''.join(prose_to_md(n) for n in node if n is not None)
    if isinstance(node, dict):
        t = node.get('type', '')
        content = node.get('content', [])
        text = node.get('text', '')
        marks = node.get('marks', [])
        attrs = node.get('attrs', {})
        
        if text:
            for m in marks:
                mt = m.get('type')
                if mt == 'bold': text = f"**{text}**"
                elif mt == 'italic': text = f"*{text}*"
                elif mt == 'subscript': text = f"_{text}_"
                elif mt == 'superscript': text = f"^{text}^"
            return text
        if t == 'hardBreak': return '\n'
        if t == 'paragraph':
            inner = prose_to_md(content)
            if inner and inner.strip() == '':
                return '\n'
            return inner + '\n'
        if t == 'bulletList':
            items = []
            for li in content:
                txt = prose_to_md(li.get('content', []) if li.get('type') == 'listItem' else li).strip()
                if txt:
                    items.append(f"• {txt}")
            return '\n'.join(items) + '\n' if items else ''
        if t == 'orderedList':
            items = []
            for i, li in enumerate(content):
                txt = prose_to_md(li.get('content', []) if li.get('type') == 'listItem' else li).strip()
                if txt:
                    items.append(f"{i+1}. {txt}")
            return '\n'.join(items) + '\n' if items else ''
        if t == 'listItem': return prose_to_md(content)
        if t == 'figure':
            src = attrs.get('src', '')
            alt = attrs.get('alt', 'diagram')
            if src:
                # Try to download image as data URI
                data_src = try_download_as_datauri(src)
                if data_src != src:
                    return f'\n![{alt}]({data_src})\n'
                return f'\n![{alt}]({src})\n'
            return ''
        if t == 'image':
            src = attrs.get('src', '')
            alt = attrs.get('alt', 'diagram')
            if src:
                data_src = try_download_as_datauri(src)
                return f'\n![{alt}]({data_src})\n' if data_src else ''
            return ''
        if t == 'equation':
            alt = attrs.get('alt', '')
            return f' ${alt}$ ' if alt else ''
        if t == 'table':
            rows = []
            for rn in content:
                if rn.get('type') != 'tableRow': continue
                cells = []
                for cn in rn.get('content', []):
                    cell_text = prose_to_md(cn.get('content', [])).strip().replace('\n', ' ')
                    cells.append(cell_text)
                rows.append(cells)
            if not rows: return ''
            # Build markdown table
            md = '| ' + ' | '.join(rows[0]) + ' |\n'
            md += '|' + '|'.join('---' for _ in rows[0]) + '|\n'
            for row in rows[1:]:
                md += '| ' + ' | '.join(row) + ' |\n'
            return md + '\n'
        if t == 'tableRow': return prose_to_md(content)
        if t in ('tableCell', 'tableHeader'): return prose_to_md(content)
        if content: return prose_to_md(content)
    return ''

def sme_login():
    s = requests.Session()
    s.headers.update({'User-Agent': 'Mozilla/5.0', 'Origin': 'https://www.savemyexams.com', 'Content-Type': 'application/json'})
    r = s.post('https://www.savemyexams.com/api/auth/v1/supertokens/signin/', json={
        "formFields": [{"id": "email", "value": SME_EMAIL}, {"id": "password", "value": SME_PASS}]
    })
    token = r.headers.get('st-access-token', '')
    if not token: print("LOGIN FAIL!"); sys.exit(1)
    s.headers.update({'Authorization': f'Bearer {token}'})
    print("✓ Logged in to SME")
    return s

def get_db_map():
    r = requests.get(f"{BASE}/topics?select=id,slug&subject_id=eq.{SUBJECT_ID}", headers=H)
    topics = {t["slug"]: {"id": t["id"]} for t in r.json()}
    tids = [t["id"] for t in r.json()]
    in_clause = "in.(" + ",".join(tids) + ")"
    r = requests.get(f"{BASE}/subtopics?select=id,slug,topic_id&topic_id={in_clause}&order=sort_order.asc", headers=H)
    sub_map = {st["slug"]: {"id": st["id"], "topic_id": st["topic_id"]} for st in r.json()}
    print(f"✓ Loaded {len(sub_map)} subtopics from DB")
    return topics, sub_map

def scrape_questions(session, section_slug, topic_slug):
    url = f"{SME_BASE}/{section_slug}/{topic_slug}/exam-questions/"
    r = session.get(url)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.DOTALL)
    if not m: return []
    data = json.loads(m.group(1))
    questions = data.get("props", {}).get("pageProps", {}).get("questions", [])
    return questions

def build_question(q, subtopic_id, topic_id):
    """Convert SME question to DB format. Handles multi-part (a)(b)(c)."""
    attrs = q["attributes"]
    order = attrs.get("order", 0)
    difficulty = attrs.get("difficulty", "medium")
    parts = attrs.get("parts", [])
    if not parts: return None

    total_marks = sum(p.get("marks", 0) for p in parts)
    labels = [chr(97 + i) for i in range(len(parts))]
    stems = []
    answers = []
    
    for i, p in enumerate(parts):
        stem = prose_to_md(p.get("problem", [])).strip()
        ans = prose_to_md(p.get("solution", [])).strip()
        
        if len(parts) > 1:
            label = f"({labels[i]}) "
            stems.append(label + stem if stem else label)
            answers.append(label + ans if ans else label)
        else:
            stems.append(stem)
            answers.append(ans)

    return {
        "id": str(uuid.uuid4()),
        "subtopic_id": subtopic_id,
        "topic_id": topic_id,
        "question_type": "structured",
        "question_text": "\n\n".join(stems),
        "answer_text": "\n\n".join(answers),
        "difficulty": difficulty,
        "marks": total_marks,
        "sort_order": order,
        "correct_answer": "",
        "options": [],
    }

def main():
    session = sme_login()
    topics, sub_map = get_db_map()

    section_slugs = [
        "1-the-nature-and-variety-of-living-organisms",
        "2-structure-and-function-in-living-organisms",
        "3-reproduction-and-inheritance",
        "4-ecology-and-the-environment",
        "5-use-of-biological-resources",
    ]

    total_inserted = 0
    total_updated = 0

    for sec_slug in section_slugs:
        topic_id = topics.get(sec_slug, {}).get("id")
        if not topic_id:
            print(f"\n✗ Topic not found: {sec_slug}")
            continue

        subtopics = {k: v for k, v in sub_map.items() if v["topic_id"] == topic_id}

        for sub_slug, sub_info in subtopics.items():
            print(f"\n{'='*60}")
            print(f"{sec_slug} / {sub_slug}")
            print(f"{'='*60}")

            # Check existing
            r = requests.get(
                f"{BASE}/questions?select=sort_order&subtopic_id=eq.{sub_info['id']}&question_type=eq.structured",
                headers=H
            )
            existing_orders = set(q.get("sort_order") for q in r.json()) if r.ok else set()
            print(f"  Existing DB: {len(existing_orders)} questions")

            try:
                sme_qs = scrape_questions(session, sec_slug, sub_slug)
            except Exception as e:
                print(f"  ✗ Error: {e}")
                continue

            if not sme_qs:
                print(f"  - No questions (SME page has no data)")
                continue

            print(f"  SME has {len(sme_qs)} questions")

            count_new = 0
            count_upd = 0
            for sq in sme_qs:
                q = build_question(sq, sub_info["id"], topic_id)
                if not q: continue

                if q["sort_order"] in existing_orders:
                    r = requests.patch(
                        f"{BASE}/questions?subtopic_id=eq.{sub_info['id']}&sort_order=eq.{q['sort_order']}&question_type=eq.structured",
                        json={"question_text": q["question_text"], "answer_text": q["answer_text"],
                               "difficulty": q["difficulty"], "marks": q["marks"]},
                        headers=H
                    )
                    if r.status_code == 204:
                        count_upd += 1
                    else:
                        print(f"  ~ Q{q['sort_order']}: update FAILED ({r.status_code})", flush=True)
                else:
                    r = requests.post(f"{BASE}/questions", json=q, headers=H)
                    if r.status_code == 201:
                        count_new += 1
                    else:
                        print(f"  ✗ Q{q['sort_order']}: insert FAILED ({r.status_code}) {r.text[:100]}", flush=True)

            if count_new or count_upd:
                print(f"  → {count_new} new, {count_upd} updated", flush=True)
            total_inserted += count_new
            total_updated += count_upd

            time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"Done! New: {total_inserted}, Updated: {total_updated}")

if __name__ == "__main__":
    main()
