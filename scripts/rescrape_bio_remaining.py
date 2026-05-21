#!/usr/bin/env python3
"""Rescrape SME for remaining 60 biology questions — images + tables."""
import json, urllib.request, re, requests, base64, time, subprocess
from collections import defaultdict

# Extract key
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

# Full SME topic URL mapping (all 21 topics)
SME = {
    1: "1-characteristics-and-classification-of-living-organisms/1-1-characteristics-classification-and-features-of-organisms",
    2: "2-organisation-of-the-organism/2-1-cell-structure-and-size-of-specimens",
    3: "3-movement-into-and-out-of-cells/3-1-diffusion-osmosis-and-active-transport",
    4: "4-biological-molecules/4-1-biological-molecules",
    5: "5-enzymes/5-1-enzymes",
    6: "6-plant-nutrition/6-1-photosynthesis-and-leaf-structure",
    7: "7-human-nutrition/7-1-human-diet-and-digestion",
    8: "8-transport-in-plants/8-1-transport-in-plants",
    9: "9-transport-in-animals/9-1-circulatory-systems-heart-and-blood-vessels",
    10: "10-diseases-and-immunity/10-1-diseases-and-immunity",
    11: "11-gas-exchange-in-humans/11-1-gas-exchange-in-humans",
    12: "12-respiration/12-1-respiration",
    13: "13-excretion-in-humans/13-1-excretion-in-humans",
    14: "14-coordination-and-response/14-1-coordination-response-and-homeostasis",
    15: "15-drugs/15-1-drugs-in-medicine",
    16: "16-reproduction/16-1-reproduction-in-plants-and-humans",
    17: "17-inheritance/17-1-inheritance-genes-and-cell-division",
    18: "18-variation-and-selection/18-1-variation-and-natural-selection",
    19: "19-organisms-and-their-environment/19-1-energy-and-feeding-relationships",
    20: "20-human-influences-on-ecosystems/20-1-human-impact-biodiversity-pollution-and-conservation",
    21: "21-biotechnology-and-genetic-modification/21-1-biotechnology-and-genetic-modification",
}

# Helpers
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

def extract_choices_content(choices):
    result = []
    labels = ['A', 'B', 'C', 'D']
    for i, ch in enumerate(choices):
        content = ch.get('content', [])
        # Convert content to text
        text = ''
        if isinstance(content, list):
            for c in content:
                if isinstance(c, str): text += c
                elif isinstance(c, dict) and c.get('text'): text += c['text']
                elif isinstance(c, dict) and 'content' in c: text += prose_to_text(c['content'])
        label = labels[i] if i < len(labels) else f'Option {i+1}'
        result.append(f"{label}. {text.strip()}")
    return result

def normalize(text):
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'Extended tier only\s*', '', text)
    text = re.sub(r'Separate:.*?\n', '', text)
    return ' '.join(text.lower().split()[:40])

# Build topic mapping
print("Building topic mapping...")
t_req = urllib.request.Request(f"{REST}/topics?select=id,slug&subject_id=eq.{BIO_ID}", headers=HEAD_GET)
with urllib.request.urlopen(t_req, timeout=15) as resp:
    topics = json.loads(resp.read())
topic_nums = {}
for t in topics:
    m = re.search(r'caie-biology-\d+-(\d+)-', t['slug'])
    if m: topic_nums[t['id']] = int(m.group(1))

st_req = urllib.request.Request(f"{REST}/subtopics?select=id,topic_id&limit=200", headers=HEAD_GET)
with urllib.request.urlopen(st_req, timeout=15) as resp:
    all_st = json.loads(resp.read())
st_to_tn = {s['id']: topic_nums.get(s['topic_id'], 0) for s in all_st}

# Get remaining questions (no data:image, references diagram)
print("Finding remaining questions...")
ref_kw = re.compile(r'(?:diagram|figure|shown|photograph|drawing|illustration|graph|which row|image).*(?:shows|below|above|illustrates)', re.IGNORECASE)

q_req = urllib.request.Request(f"{REST}/questions?select=id,question_text,options,correct_answer,difficulty,subtopic_id&subject_id=eq.{BIO_ID}&limit=600", headers=HEAD_GET)
with urllib.request.urlopen(q_req, timeout=60) as resp:
    all_qs = json.loads(resp.read())

remaining = []
for q in all_qs:
    qt = q.get('question_text', '')
    if 'data:image' in qt: continue
    if not ref_kw.search(qt): continue
    tn = st_to_tn.get(q.get('subtopic_id', ''), 0)
    remaining.append({
        'id': q['id'], 'text': qt, 'difficulty': q.get('difficulty', 'medium'),
        'tn': tn, 'st': q.get('subtopic_id'), 'options': q.get('options'),
        'answer': q.get('correct_answer')
    })

print(f"  Remaining: {len(remaining)}")

# Group by topic number
by_tn = defaultdict(list)
for f in remaining: by_tn[f['tn']].append(f)

# Pre-fetch ALL 21 SME pages
print("\nPre-fetching all SME pages...")
sme_pages = {}
for tn in range(1, 22):
    if tn not in SME: continue
    sme_url = f"https://www.savemyexams.com/igcse/biology/cie/23/topic-questions/{SME[tn]}/multiple-choice-questions/"
    try:
        r = sme.get(sme_url, allow_redirects=True, timeout=30)
        if r.status_code == 200 and '__NEXT_DATA__' in r.text:
            data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text).group(1))
            qs = data.get('props', {}).get('pageProps', {}).get('questions', [])
            
            sme_index = []
            for sq in qs:
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
                    'choices': extract_choices_content(choices),
                    'is_correct': [ch.get('is_correct', False) for ch in choices] if choices else [],
                })
            
            sme_pages[tn] = sme_index
            print(f"  [{tn:>2}] {len(sme_index)} questions")
            time.sleep(0.5)
        else:
            print(f"  [{tn:>2}] HTTP {r.status_code}")
    except Exception as e:
        print(f"  [{tn:>2}] ERROR: {e}")

# Match and fix
print("\nMatching and fixing...")
fixed_img = 0
fixed_table = 0
no_match = 0

for tn in sorted(by_tn.keys()):
    db_qs = by_tn[tn]
    
    # For NULL subtopic, try ALL pages
    pages_to_try = [tn] if tn > 0 else list(range(1, 22))
    
    for db_q in db_qs:
        db_words = set(normalize(db_q['text']).split())
        if not db_words: no_match += 1; continue
        
        best_sme = None
        best_score = 0
        best_topic = 0
        
        for ptn in pages_to_try:
            if ptn not in sme_pages: continue
            for sq in sme_pages[ptn]:
                s_words = set(sq['stem'].split())
                if not s_words: continue
                overlap = len(db_words & s_words) / max(len(db_words), len(s_words))
                if db_q['difficulty'] == sq['difficulty']: overlap += 0.2
                if overlap > best_score:
                    best_score = overlap
                    best_sme = sq
                    best_topic = ptn
        
        if not best_sme or best_score < 0.35:
            no_match += 1
            continue
        
        # Check if DB options are placeholder
        db_opts = db_q.get('options')
        is_placeholder = False
        if db_opts and isinstance(db_opts, list):
            is_placeholder = all(re.search(r'row.line\s*\d', str(o), re.IGNORECASE) for o in db_opts if o) or \
                           all(len(str(o).replace('A.','').replace('B.','').replace('C.','').replace('D.','').strip()) == 0 for o in db_opts if o)
        
        has_figure = len(best_sme['figures']) > 0
        has_choices = len(best_sme['choices']) >= 2
        
        new_qt = db_q['text']
        patch_body = {}
        img_fixed_this = False
        
        # Fix image
        if has_figure:
            data_uri = download_img(best_sme['figures'][0])
            if data_uri:
                img_md = f"\n\n![diagram]({data_uri})\n\n"
                for delim in ['\nA.', '\nA)', '\nA ']:
                    if delim in new_qt:
                        new_qt = new_qt.replace(delim, img_md + delim.lstrip('\n'), 1)
                        break
                else:
                    new_qt += img_md
                patch_body['question_text'] = new_qt  # ← always include
                fixed_img += 1
                img_fixed_this = True
        
        # Fix table
        if is_placeholder and has_choices:
            sme_opts = best_sme['choices']
            patch_body['options'] = sme_opts
            correct_idx = next((i for i, c in enumerate(best_sme['is_correct']) if c), 0)
            if correct_idx < len(['A','B','C','D']):
                patch_body['correct_answer'] = ['A','B','C','D'][correct_idx]
            fixed_table += 1
        
        # Also fix "which row" with non-matching options
        if 'which row' in new_qt.lower() and has_choices:
            sme_opts = best_sme['choices']
            if sme_opts and len(sme_opts) >= 2:
                db_opt_texts = [str(o).strip() for o in (db_opts or [])]
                sme_opt_short = [o[:50].strip() for o in sme_opts]
                if db_opt_texts != sme_opt_short:
                    patch_body['options'] = sme_opts
                    correct_idx = next((i for i, c in enumerate(best_sme['is_correct']) if c), 0)
                    if correct_idx < len(['A','B','C','D']):
                        patch_body['correct_answer'] = ['A','B','C','D'][correct_idx]
        
        if patch_body:
            patch_body['question_text'] = new_qt
            # Remove None values
            patch_body = {k: v for k, v in patch_body.items() if v is not None}
            data = json.dumps(patch_body).encode()
            try:
                req = urllib.request.Request(f"{REST}/questions?id=eq.{db_q['id']}", data=data, headers=HEAD_PATCH, method="PATCH")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status not in (200, 204):
                        print(f"    PATCH fail {db_q['id'][:12]}: HTTP {resp.status}")
            except Exception as e:
                print(f"    PATCH error {db_q['id'][:12]}: {str(e)[:80]}")

# Print final key line
print(f"\n{'='*50}")
print(f"✅ Images fixed: {fixed_img}")
print(f"📊 Tables fixed: {fixed_table}")
print(f"🔍 No match: {no_match}")
print(f"Tables+images: {fixed_img + fixed_table}")
