"""
Fix 8 physics questions with missing images — no Playwright, use requests.
SME topic pages return __NEXT_DATA__ without login.
"""
import requests, json, re, base64, urllib.parse

ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
BASE_DB = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"
HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

QUESTIONS = [
    {"id": "69970d70-8e57-45ff-90be-d9adaaf94057", "match": "speed-time graph for a train", "page": "general-physics/general-physics-motion/"},
    {"id": "72f32ac4-a2ce-4920-9a76-dab23f8bfb3c", "match": "length of string is measured", "page": "general-physics/general-physics-physical-quantities/"},
    {"id": "67f2a173-f9d5-4858-ac4d-b78ca3cbc14f", "match": "Two runners take part", "page": "general-physics/general-physics-motion/"},
    {"id": "dc7b03a7-ca9e-4458-b0d2-9b21d661de6d", "match": "converging lens of focal length", "page": "physics-0625-properties-of-waves/physics-0625-properties-of-waves-light/"},
    {"id": "ee004e91-8cb1-4e6d-b1df-7d54fc58a002", "match": "voltage-time graphs for two electrical", "page": "physics-0625-electricity-and-magnetism/physics-0625-electricity-and-magnetism-electrical-quantities/"},
    {"id": "2d3fe00b-34a7-4948-82b5-8f5c1d5bdfd8", "match": "emissions from a source passing into the electric field", "page": "physics-0625-atomic-physics/physics-0625-atomic-physics-radioactivity/"},
    {"id": "9ed928ed-b889-4b66-b1e2-6593f03c4a81", "match": "stream of .-particles travelling", "page": "physics-0625-atomic-physics/physics-0625-atomic-physics-radioactivity/"},
    {"id": "589ea2b4-42c8-4f48-b671-1adfc978a0b6", "match": "pulse of sound is produced at the bottom", "page": "physics-0625-properties-of-waves/physics-0625-properties-of-waves-sound/"},
]

BASE_SME = "https://www.savemyexams.com/igcse/physics/cie/23/topics/"

def download_image(url):
    """Download image and return as data URI."""
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200 and len(r.content) > 500:
            ct = r.headers.get('content-type', 'image/png')
            b64 = base64.b64encode(r.content).decode()
            return f"data:{ct};base64,{b64}"
        else:
            print(f"    HTTP {r.status_code}, {len(r.content)} bytes")
            return None
    except Exception as e:
        print(f"    Error: {e}")
        return None

def get_figures_from_problem(problem):
    """Extract figure src from ProseMirror problem nodes."""
    figures = []
    def walk(node):
        if isinstance(node, dict):
            if node.get('type') == 'figure':
                src = node.get('attrs', {}).get('src', '')
                if src: figures.append(src)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)
    walk(problem)
    return figures

def get_choices_data(question):
    """Extract choices and correct answer."""
    choices = question.get('choices', [])
    result = []
    correct = None
    for c in choices:
        order = c.get('order', 0)
        is_correct = c.get('is_correct', False)
        content = c.get('content', [])
        text = ''.join(str(n.get('text','')) for n in content if isinstance(n, dict))
        result.append({'order': order, 'text': text, 'correct': is_correct})
        if is_correct:
            correct = chr(65 + order)
    return result, correct

def api_patch(qid, data):
    r = requests.patch(
        f"{BASE_DB}/questions?id=eq.{qid}",
        json=data,
        headers={**HEADERS, "Prefer": "return=representation"}
    )
    return r.status_code

# Cache page content
page_cache = {}

for i, q in enumerate(QUESTIONS, 1):
    print(f"\n{'='*60}")
    print(f"[{i}/8] ID={q['id'][:8]} — {q['match'][:60]}")
    
    page_url = BASE_SME + q['page']
    
    # Fetch page (with cache)
    if page_url not in page_cache:
        print(f"  Fetching: {page_url}")
        try:
            r = requests.get(page_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
            if r.status_code != 200:
                print(f"  ❌ HTTP {r.status_code}")
                continue
            # Extract __NEXT_DATA__
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">([^<]+)</script>', r.text)
            if not match:
                print(f"  ❌ __NEXT_DATA__ not found")
                print(f"  Page snippet: {r.text[:500]}")
                continue
            nd = json.loads(match.group(1))
            page_cache[page_url] = nd
        except Exception as e:
            print(f"  ❌ Error: {e}")
            continue
    else:
        nd = page_cache[page_url]
        print(f"  (cached page)")
    
    # Get questions
    page_props = nd.get('props', {}).get('pageProps', {})
    questions = page_props.get('questions', [])
    if not questions:
        # Try alternate locations
        questions = page_props.get('topicQuestions', [])
    if not questions:
        # Try deep search
        def find_questions(obj, depth=0):
            if depth > 10: return None
            if isinstance(obj, list) and obj and isinstance(obj[0], dict) and 'problem' in obj[0]:
                return obj
            if isinstance(obj, dict):
                for k, v in obj.items():
                    r = find_questions(v, depth+1)
                    if r: return r
            return None
        questions = find_questions(nd) or []
    
    if not questions:
        print(f"  ❌ No questions in __NEXT_DATA__")
        continue
    
    print(f"  {len(questions)} questions on page")
    
    # Helper to extract all text from ProseMirror
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
    
    # Find matching question
    match_phrase = q['match'].lower()
    found = None
    for sq in questions:
        problem = sq.get('problem', sq.get('question', []))
        if match_phrase in prose_text(problem).lower():
            found = sq
            break
    
    if not found:
        print(f"  ❌ Match not found")
        for j, sq in enumerate(questions[:5]):
            problem = sq.get('problem', sq.get('question', []))
            print(f"    [{j}] {prose_text(problem)[:100]}")
        continue
    
    # Extract figures
    problem = found.get('problem', found.get('question', []))
    figures = get_figures_from_problem(problem)
    print(f"  Found {len(figures)} figure(s)")
    
    if not figures:
        print(f"  ⚠️ No figures")
        continue
    
    # Download images
    data_uris = []
    for f_url in figures:
        print(f"  Downloading: {f_url[:80]}...")
        du = download_image(f_url)
        if du:
            data_uris.append(du)
            print(f"    ✓ {len(du)} chars")
        else:
            print(f"    ✗ Failed")
    
    if not data_uris:
        print(f"  ❌ No images downloaded")
        continue
    
    # Get current DB data
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
    
    # Prepend image(s)
    for du in data_uris:
        new_stem = f"![diagram]({du})\n\n" + new_stem
    
    # Check correct answer from SME
    choices, correct_letter = get_choices_data(found)
    update = {"question_text": new_stem}
    
    if correct_letter and correct_letter != current_ans:
        update["answer_text"] = correct_letter
        print(f"  🔧 Answer: {current_ans} → {correct_letter}")
    
    try:
        status = api_patch(q['id'], update)
        print(f"  ✅ DB updated (HTTP {status})")
    except Exception as e:
        print(f"  ❌ DB update failed: {e}")

print(f"\n{'='*60}")
print("DONE")
