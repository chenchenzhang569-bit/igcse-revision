#!/usr/bin/env python3
"""Scrape SME biology topic questions: images + tables for missing DB questions."""
import json, urllib.request, re, requests, base64, time
from collections import defaultdict

# === Config ===
import subprocess
# Extract full service key via hex dump (truncated in display)
result = subprocess.run(
    "sed -n '3p' /home/ubuntu/igcse-site/.env.local | cut -d= -f2- | od -A n -t x1 | tr -d ' \\n'",
    shell=True, capture_output=True, text=True, timeout=5
)
SK = bytes.fromhex(result.stdout.strip()).decode('utf-8').strip()
BIO_ID = "2dcd4850-8512-4913-b922-559a2d3412bc"
REST = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"
HEAD_GET = {"apikey": SK, "Authorization": f"Bearer {SK}"}
HEAD_PATCH = {"apikey": SK, "Authorization": f"Bearer {SK}", "Content-Type": "application/json", "Prefer": "return=minimal"}

sme = requests.Session()
sme.headers.update({'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'Accept': 'text/html,application/xhtml+xml'})
img_cache = {}

# === SME URL mapping ===
SME = {1:"1-characteristics-and-classification-of-living-organisms/1-1-characteristics-classification-and-features-of-organisms",
2:"2-organisation-of-the-organism/2-1-cell-structure-and-size-of-specimens",3:"3-movement-into-and-out-of-cells/3-1-diffusion-osmosis-and-active-transport",
4:"4-biological-molecules/4-1-biological-molecules",5:"5-enzymes/5-1-enzymes",6:"6-plant-nutrition/6-1-photosynthesis-and-leaf-structure",
7:"7-human-nutrition/7-1-human-diet-and-digestion",8:"8-transport-in-plants/8-1-transport-in-plants",9:"9-transport-in-animals/9-1-circulatory-systems-heart-and-blood-vessels",
10:"10-diseases-and-immunity/10-1-diseases-and-immunity",11:"11-gas-exchange-in-humans/11-1-gas-exchange-in-humans",12:"12-respiration/12-1-respiration",
13:"13-excretion-in-humans/13-1-excretion-in-humans",14:"14-coordination-and-response/14-1-coordination-response-and-homeostasis",
15:"15-drugs/15-1-drugs-in-medicine",16:"16-reproduction/16-1-reproduction-in-plants-and-humans",17:"17-inheritance/17-1-inheritance-genes-and-cell-division",
18:"18-variation-and-selection/18-1-variation-and-natural-selection",19:"19-organisms-and-their-environment/19-1-energy-and-feeding-relationships",
20:"20-human-influences-on-ecosystems/20-1-human-impact-biodiversity-pollution-and-conservation",21:"21-biotechnology-and-genetic-modification/21-1-biotechnology-and-genetic-modification"}

# === Helpers ===
def download_img(url):
    if url in img_cache: return img_cache[url]
    try:
        r = sme.get(url, timeout=15)
        if r.status_code == 200:
            ct = r.headers.get('content-type', 'image/png')
            b64 = base64.b64encode(r.content).decode()
            img_cache[url] = f"data:{ct};base64,{b64}"
            return img_cache[url]
    except: pass
    return None

def extract_figures(node):
    figs = []
    if isinstance(node, list):
        for n in node: figs.extend(extract_figures(n))
    elif isinstance(node, dict):
        if node.get('type') == 'figure':
            src = node.get('attrs', {}).get('src', '')
            if src: figs.append(src)
        if 'content' in node: figs.extend(extract_figures(node['content']))
    return figs

def prose_to_text(node):
    if isinstance(node, str): return node
    if isinstance(node, list): return ' '.join(prose_to_text(n) for n in node if n)
    if isinstance(node, dict):
        if node.get('text'): return node['text']
        if 'content' in node: return prose_to_text(node['content'])
    return ''

def prose_to_markdown(node):
    """Convert ProseMirror to markdown preserving images and tables."""
    if isinstance(node, str): return node
    if isinstance(node, list): return ''.join(prose_to_markdown(n) for n in node if n is not None)
    if isinstance(node, dict):
        t = node.get('type', '')
        content = node.get('content', [])
        text = node.get('text', '')
        marks = node.get('marks', [])
        if text:
            for mk in marks:
                if mk.get('type') == 'bold': text = f"**{text}**"
                elif mk.get('type') == 'italic': text = f"*{text}*"
                elif mk.get('type') == 'subscript': text = f"_{text}_"
                elif mk.get('type') == 'superscript': text = f"^{text}^"
            return text
        if t == 'hardBreak': return '\n'
        if t == 'paragraph': return prose_to_markdown(content) + '\n'
        if t == 'bulletList': return '\n'.join('• ' + prose_to_markdown(li) for li in content) + '\n'
        if t == 'orderedList': return '\n'.join(f"{i+1}. {prose_to_markdown(li)}" for i, li in enumerate(content)) + '\n'
        if t == 'listItem': return prose_to_markdown(content)
        if t == 'figure':
            src = node.get('attrs', {}).get('src', '')
            alt = node.get('attrs', {}).get('alt', 'diagram')
            # Download image as data URI
            data_uri = download_img(src) if src else ''
            if data_uri: return f'\n![{alt}]({data_uri})\n'
            if src: return f'\n![{alt}]({src})\n'
            return ''
        if t == 'table':
            rows = []
            for rn in content:
                if rn.get('type') != 'tableRow': continue
                cells = [prose_to_markdown(cn).strip().replace('\n', ' ') for cn in rn.get('content', [])]
                rows.append(cells)
            if not rows: return ''
            md = '| ' + ' | '.join(rows[0]) + ' |\n'
            md += '|' + '|'.join('---' for _ in rows[0]) + '|\n'
            for row in rows[1:]:
                md += '| ' + ' | '.join(row) + ' |\n'
            return md + '\n'
        if t in ('tableRow', 'tableCell', 'tableHeader'):
            return prose_to_markdown(content)
        if content: return prose_to_markdown(content)
    return ''

def extract_choices_content(choices):
    """Extract option text from SME choices array."""
    result = []
    labels = ['A', 'B', 'C', 'D']
    for i, ch in enumerate(choices):
        content = ch.get('content', [])
        text = prose_to_markdown(content).strip()
        label = labels[i] if i < len(labels) else f'Option {i+1}'
        result.append(f"{label}. {text}")
    return result

def normalize(text):
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'Extended tier only\s*', '', text)
    text = re.sub(r'Separate:.*?\n', '', text)
    return ' '.join(text.lower().split()[:40])

def api_patch(qid, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{REST}/questions?id=eq.{qid}", data=data, headers=HEAD_PATCH, method="PATCH")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status

# === Step 1: Build DB topic→num mapping ===
print("Step 1: Building mappings...")
t_req = urllib.request.Request(f"{REST}/topics?select=id,slug&subject_id=eq.{BIO_ID}", headers=HEAD_GET)
with urllib.request.urlopen(t_req, timeout=15) as resp:
    topics = json.loads(resp.read())
topic_nums = {}
for t in topics:
    m = re.search(r'caie-biology-\d+-(\d+)-', t['slug'])
    if m: topic_nums[t['id']] = int(m.group(1))

st_req = urllib.request.Request(f"{REST}/subtopics?select=id,display_name,topic_id&limit=200", headers=HEAD_GET)
with urllib.request.urlopen(st_req, timeout=15) as resp:
    all_st = json.loads(resp.read())
st_map = {s['id']: s for s in all_st}
st_to_tn = {s['id']: topic_nums.get(s['topic_id'], 0) for s in all_st}

# === Step 2: Find all DB questions needing images/tables ===
print("Step 2: Finding DB questions needing images/tables...")
ref_kw = re.compile(r'(?:diagram|figure|shown|photograph|drawing|illustration|graph|which row|image).*(?:shows|below|above|illustrates)', re.IGNORECASE)

q_req = urllib.request.Request(f"{REST}/questions?select=id,question_text,options,correct_answer,difficulty,subtopic_id&subject_id=eq.{BIO_ID}&limit=600", headers=HEAD_GET)
with urllib.request.urlopen(q_req, timeout=60) as resp:
    all_qs = json.loads(resp.read())

to_fix = []
for q in all_qs:
    qt = q.get('question_text', '')
    if 'data:image' in qt: continue
    if not ref_kw.search(qt): continue
    tn = st_to_tn.get(q.get('subtopic_id', ''), 0)
    if tn not in SME: continue
    to_fix.append({
        'id': q['id'], 'text': qt, 'difficulty': q.get('difficulty', 'medium'),
        'tn': tn, 'st': q.get('subtopic_id'), 'options': q.get('options'),
        'answer': q.get('correct_answer')
    })

by_tn = defaultdict(list)
for f in to_fix: by_tn[f['tn']].append(f)
print(f"  Questions to fix: {len(to_fix)} across {len(by_tn)} topics")

# === Step 3: Scrape SME and match ===
print("\nStep 3: Scraping SME pages...")
fixed_img = 0
fixed_table = 0
no_fig = 0
no_match = 0
errors = 0

for tn in sorted(by_tn.keys()):
    db_qs = by_tn[tn]
    sme_url = f"https://www.savemyexams.com/igcse/biology/cie/23/topic-questions/{SME[tn]}/multiple-choice-questions/"
    
    try:
        r = sme.get(sme_url, allow_redirects=True, timeout=30)
        if r.status_code != 200 or '__NEXT_DATA__' not in r.text:
            print(f"  [{tn}] HTTP {r.status_code} — skip ({len(db_qs)} qs)")
            errors += len(db_qs)
            continue
        
        data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text).group(1))
        sme_qs = data.get('props', {}).get('pageProps', {}).get('questions', [])
        if not sme_qs:
            print(f"  [{tn}] 0 questions — skip")
            errors += len(db_qs)
            continue
        
        # Build SME index with full data
        sme_index = []
        for sq in sme_qs:
            attrs = sq.get('attributes', {})
            parts = attrs.get('parts', [])
            if not parts: continue
            part = parts[0]
            problem = part.get('problem', [])
            choices = part.get('choices', [])
            sme_index.append({
                'difficulty': attrs.get('difficulty', 'medium'),
                'stem': normalize(prose_to_text(problem)),
                'figures': extract_figures(problem),
                'problem_md': prose_to_markdown(problem),
                'choices': extract_choices_content(choices),
                'is_correct': [ch.get('is_correct', False) for ch in choices] if choices else [],
            })
        
        local_img = 0
        local_table = 0
        
        for db_q in db_qs:
            db_words = set(normalize(db_q['text']).split())
            if not db_words: no_match += 1; continue
            
            best, best_score = None, 0
            for sq in sme_index:
                s_words = set(sq['stem'].split())
                if not s_words: continue
                overlap = len(db_words & s_words) / max(len(db_words), len(s_words))
                if db_q['difficulty'] == sq['difficulty']: overlap += 0.2
                if overlap > best_score: best_score = overlap; best = sq
            
            if not best or best_score < 0.35:
                no_match += 1
                continue
            
            sme_best = best
            
            # Check if DB options are placeholder ("row/line N")
            is_placeholder = False
            db_opts = db_q.get('options')
            if db_opts and isinstance(db_opts, list):
                is_placeholder = all(re.search(r'row.line\s*\d', str(o), re.IGNORECASE) for o in db_opts if o)
            
            # Determine if we need image or table or both
            has_figure = len(sme_best['figures']) > 0
            has_table_data = bool(sme_best['choices']) and len(sme_best['choices']) > 0
            has_table_in_problem = 'table' in sme_best['problem_md'] or '|' in sme_best['problem_md']
            
            # Build new question_text
            new_qt = db_q['text']
            patch_body = {}
            
            # Handle images
            if has_figure:
                data_uri = download_img(sme_best['figures'][0])
                if data_uri:
                    img_md = f"\n\n![diagram]({data_uri})\n\n"
                    for delim in ['\nA.', '\nA)', '\nA ']:
                        if delim in new_qt:
                            new_qt = new_qt.replace(delim, img_md + delim.lstrip('\n'), 1)
                            break
                    else:
                        new_qt += img_md
                    local_img += 1
            
            # Handle tables — replace placeholder options with SME choices
            if is_placeholder and has_table_data:
                # Replace placeholder options with SME choices
                sme_opts = sme_best['choices']
                if sme_opts:
                    patch_body['options'] = sme_opts
                    # Also set correct_answer from SME
                    correct_idx = next((i for i, c in enumerate(sme_best['is_correct']) if c), 0)
                    patch_body['correct_answer'] = ['A','B','C','D'][correct_idx] if correct_idx < 4 else None
                    local_table += 1
            
            # Also handle "which row" with data but option text differs from SME
            elif 'which row' in new_qt.lower() and has_table_data:
                sme_opts = sme_best['choices']
                if sme_opts and len(sme_opts) >= 2:
                    # Check if current options differ from SME
                    db_opt_texts = [str(o).strip() for o in (db_opts or [])]
                    sme_opt_short = [o[:40].strip() for o in sme_opts]
                    if db_opt_texts != sme_opt_short:
                        patch_body['options'] = sme_opts
                        correct_idx = next((i for i, c in enumerate(sme_best['is_correct']) if c), 0)
                        patch_body['correct_answer'] = ['A','B','C','D'][correct_idx] if correct_idx < 4 else None
                        local_table += 1
            
            if 'question_text' in patch_body or patch_body.get('options'):
                patch_body['question_text'] = new_qt
                status = api_patch(db_q['id'], patch_body)
        
        print(f"  [{tn:>2}] img={local_img} table={local_table} / {len(db_qs)} qs")
        fixed_img += local_img
        fixed_table += local_table
        time.sleep(0.3)
        
    except Exception as e:
        print(f"  [{tn}] ERROR: {str(e)[:80]}")
        errors += len(db_qs)

print(f"\n{'='*50}")
print(f"✅ Images fixed: {fixed_img}")
print(f"📊 Tables fixed: {fixed_table}")
print(f"❌ No figure: {no_fig} | 🔍 No match: {no_match} | ⚠️ Errors: {errors}")
