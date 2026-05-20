"""
Fix 8 physics structured questions — correct URLs: auto-redirect to available qset.
"""
import requests, json, re, base64, time

ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
BASE_DB = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"
HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}
S = requests.Session()
S.headers.update({'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'Accept': 'text/html,application/xhtml+xml'})

QUESTIONS = [
    {"id": "69970d70-8e57-45ff-90be-d9adaaf94057", "match": "speed-time graph for a train", "url": "1-motion-forces-and-energy/1-2-motion/"},
    {"id": "72f32ac4-a2ce-4920-9a76-dab23f8bfb3c", "match": "length of string is measured", "url": "1-motion-forces-and-energy/1-1-physical-quantities-and-measurement-techniques/"},
    {"id": "67f2a173-f9d5-4858-ac4d-b78ca3cbc14f", "match": "Two runners take part", "url": "1-motion-forces-and-energy/1-2-motion/"},
    {"id": "dc7b03a7-ca9e-4458-b0d2-9b21d661de6d", "match": "converging lens of focal length", "url": "3-waves/3-2-light/"},
    {"id": "ee004e91-8cb1-4e6d-b1df-7d54fc58a002", "match": "voltage-time graphs for two electrical", "url": "4-electricity-and-magnetism/4-2-electrical-quantities/"},
    {"id": "2d3fe00b-34a7-4948-82b5-8f5c1d5bdfd8", "match": "emissions from a source passing", "url": "5-nuclear-physics/5-2-radioactivity/"},
    {"id": "9ed928ed-b889-4b66-b1e2-6593f03c4a81", "match": "stream of", "url": "5-nuclear-physics/5-2-radioactivity/"},
    {"id": "589ea2b4-42c8-4f48-b671-1adfc978a0b6", "match": "pulse of sound is produced", "url": "3-waves/3-4-sound/"},
]

BASE_SME = "https://www.savemyexams.com/igcse/physics/cie/23/topic-questions/"
img_cache = {}
page_cache = {}

def download_image(url):
    if url in img_cache:
        return img_cache[url]
    try:
        r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200 and len(r.content) > 500:
            ct = r.headers.get('content-type', 'image/png')
            b64 = base64.b64encode(r.content).decode()
            du = f"data:{ct};base64,{b64}"
            img_cache[url] = du
            return du
    except Exception as e:
        print(f"      download error: {e}")
    return None

def extract_figures(problem):
    figures = []
    def walk(node):
        if isinstance(node, dict):
            if node.get('type') == 'figure':
                src = node.get('attrs', {}).get('src', '')
                if src: figures.append(src)
            for v in node.values(): walk(v)
        elif isinstance(node, list):
            for item in node: walk(item)
    walk(problem)
    return figures

def prose_text(node):
    result = []
    def walk(n):
        if isinstance(n, str): result.append(n)
        elif isinstance(n, dict):
            if n.get('text'): result.append(n['text'])
            for v in n.values(): walk(v)
        elif isinstance(n, list):
            for item in n: walk(item)
    walk(node)
    return ''.join(result)

def get_correct_answer(question):
    parts = question.get('attributes', question).get('parts', [question])
    for part in parts:
        choices = part.get('choices', [])
        for c in choices:
            if c.get('is_correct'):
                return chr(65 + c.get('order', 0))
    return None

def api_patch(qid, data):
    r = requests.patch(
        f"{BASE_DB}/questions?id=eq.{qid}",
        json=data,
        headers={**HEADERS, "Prefer": "return=representation"}
    )
    return r.status_code

for i, q in enumerate(QUESTIONS, 1):
    print(f"\n{'='*60}")
    print(f"[{i}/8] {q['id'][:8]} — {q['match'][:60]}")
    
    page_url = BASE_SME + q['url']
    
    if page_url not in page_cache:
        print(f"  GET {page_url}")
        try:
            r = S.get(page_url, allow_redirects=True, timeout=30)
            final_url = r.url
            print(f"  → {final_url}")
            if r.status_code != 200:
                print(f"  ❌ HTTP {r.status_code}")
                continue
            m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text)
            if not m:
                print(f"  ❌ No __NEXT_DATA__ ({len(r.text)} bytes)")
                continue
            nd = json.loads(m.group(1))
            page_cache[page_url] = nd
            print(f"  ✓ Loaded ({len(r.text)} bytes)")
        except Exception as e:
            print(f"  ❌ Error: {e}")
            continue
    else:
        nd = page_cache[page_url]
    
    props = nd.get('props', {}).get('pageProps', {})
    questions = props.get('questions', [])
    if not questions:
        print(f"  ❌ No questions in pageProps")
        continue
    
    match_phrase = q['match'].lower()
    found = None
    for sq in questions:
        attrs = sq.get('attributes', {})
        parts = attrs.get('parts', [])
        problem = parts[0].get('problem', []) if parts else sq.get('problem', [])
        if match_phrase in prose_text(problem).lower():
            found = sq
            break
    
    if not found:
        print(f"  ❌ Not found on page ({len(questions)} questions)")
        for j, sq in enumerate(questions[:5]):
            attrs = sq.get('attributes', {})
            parts = attrs.get('parts', [])
            problem = parts[0].get('problem', []) if parts else sq.get('problem', [])
            print(f"    [{j}] {prose_text(problem)[:100]}")
        continue
    
    attrs = found.get('attributes', {})
    parts = attrs.get('parts', [])
    problem = parts[0].get('problem', []) if parts else found.get('problem', [])
    
    figures = extract_figures(problem)
    print(f"  Found {len(figures)} figure(s)")
    
    if not figures:
        print(f"  ⚠️ No figures")
        continue
    
    data_uris = []
    for f_url in figures:
        print(f"  ↓ {f_url[:80]}...")
        du = download_image(f_url)
        if du:
            data_uris.append(du)
            print(f"    ✓ {len(du)} chars")
        else:
            print(f"    ✗ Failed")
    
    if not data_uris:
        print(f"  ❌ All downloads failed")
        continue
    
    r = requests.get(f"{BASE_DB}/questions?id=eq.{q['id']}&select=question_text,answer_text", headers=HEADERS)
    db = r.json()
    if not db:
        print(f"  ❌ Not in DB")
        continue
    
    current = db[0]['question_text']
    current_ans = db[0].get('answer_text', '')
    
    # Remove bracket alt text
    new_stem = re.sub(r'\s*\[[A-Z][^\]]{10,}\]\s*', '\n', current).strip()
    new_stem = re.sub(r'\n{3,}', '\n\n', new_stem)
    
    for du in reversed(data_uris):
        new_stem = f"![diagram]({du})\n\n" + new_stem
    
    correct = get_correct_answer(found)
    update = {"question_text": new_stem}
    
    if correct and correct != current_ans:
        update["answer_text"] = correct
        print(f"  🔧 Answer: {current_ans} → {correct}")
    
    try:
        status = api_patch(q['id'], update)
        print(f"  ✅ Updated (HTTP {status})")
    except Exception as e:
        print(f"  ❌ PATCH failed: {e}")

print(f"\n{'='*60}")
print("DONE")
