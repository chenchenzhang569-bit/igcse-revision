"""
Fix 8 physics questions with missing images — scrape SME, download figures, update DB.
"""
import asyncio, json, re, base64, time, sys
import urllib.request, urllib.parse
from playwright.async_api import async_playwright

# ─── Config ───
SME_EMAIL = "condescendingahoover@vmail.dev"
SME_PASS = "WXVm8Chqq2"
ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
BASE = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"
HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

# ─── 8 questions → SME pages ───
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

def prose_to_markdown(node):
    """Convert ProseMirror to markdown, preserving images and tables."""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return ''.join(prose_to_markdown(n) for n in node if n is not None)
    if isinstance(node, dict):
        t = node.get('type', '')
        content = node.get('content', [])
        text = node.get('text', '')
        marks = node.get('marks', [])
        
        if text:
            for mark in marks:
                if mark.get('type') == 'bold': text = f"**{text}**"
                elif mark.get('type') == 'italic': text = f"*{text}*"
                elif mark.get('type') == 'subscript': text = f"_{text}_"
                elif mark.get('type') == 'superscript': text = f"^{text}^"
            return text
        
        if t == 'hardBreak': return '\n'
        if t == 'paragraph': return prose_to_markdown(content) + '\n'
        if t == 'bulletList':
            return '\n'.join('• ' + prose_to_markdown(li) for li in content) + '\n'
        if t == 'orderedList':
            return '\n'.join(f"{i+1}. {prose_to_markdown(li)}" for i, li in enumerate(content)) + '\n'
        if t == 'listItem': return prose_to_markdown(content)
        if t == 'figure':
            src = node.get('attrs', {}).get('src', '')
            alt = node.get('attrs', {}).get('alt', 'diagram')
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
        if t == 'tableRow': return prose_to_markdown(content)
        if t in ('tableCell', 'tableHeader'): return prose_to_markdown(content)
        if content: return prose_to_markdown(content)
    return ''

def extract_figures(problem_nodes):
    """Extract figure src URLs from ProseMirror problem nodes."""
    figures = []
    def walk(node):
        if isinstance(node, dict):
            if node.get('type') == 'figure':
                src = node.get('attrs', {}).get('src', '')
                if src:
                    figures.append(src)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)
    walk(problem_nodes)
    return figures

async def download_image_as_data_uri(page, url):
    """Download an image and return as data URI."""
    try:
        resp = await page.request.get(url, timeout=15000)
        if resp.status == 200:
            body = await resp.body()
            content_type = resp.headers.get('content-type', 'image/png')
            b64 = base64.b64encode(body).decode()
            return f"data:{content_type};base64,{b64}"
        else:
            print(f"    HTTP {resp.status} for {url[:80]}")
            return None
    except Exception as e:
        print(f"    Error downloading {url[:80]}: {e}")
        return None

def api_patch(qid, data):
    """PATCH a question in Supabase."""
    req = urllib.request.Request(
        f"{BASE}/questions?id=eq.{qid}",
        data=json.dumps(data).encode(),
        headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=representation"},
        method="PATCH"
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.status

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/snap/bin/chromium",
            headless=True,
            args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
        )
        context = await browser.new_context()
        page = await context.new_page()
        
        # Login
        print("Logging into SME...")
        await page.goto("https://www.savemyexams.com/login/", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.locator('input[type="email"]').first.fill(SME_EMAIL)
        await page.locator('input[type="password"]').first.fill(SME_PASS)
        await page.locator('button[type="submit"]').first.click()
        await page.wait_for_timeout(4000)
        print("Logged in.")
        
        visited_pages = {}
        
        for q in QUESTIONS:
            print(f"\n{'='*60}")
            print(f"Q: {q['id'][:8]}... — {q['match'][:60]}")
            
            page_url = BASE_SME + q['page']
            
            if page_url not in visited_pages:
                print(f"  Loading: {page_url}")
                try:
                    await page.goto(page_url, timeout=30000)
                    await page.wait_for_timeout(3000)
                except Exception as e:
                    print(f"  Page load error: {e}")
                    continue
                
                # Extract __NEXT_DATA__
                try:
                    nd = await page.evaluate("() => JSON.parse(document.getElementById('__NEXT_DATA__').textContent)")
                    visited_pages[page_url] = nd
                except Exception as e:
                    print(f"  __NEXT_DATA__ error: {e}")
                    continue
            else:
                nd = visited_pages[page_url]
                print(f"  (cached)")
            
            # Find questions in __NEXT_DATA__
            props = nd.get('props', {}).get('pageProps', {})
            questions = props.get('questions', [])
            if not questions:
                print(f"  No questions found in __NEXT_DATA__")
                continue
            
            # Find matching question
            match_phrase = q['match'].lower()
            found = None
            for sq in questions:
                problem = sq.get('problem', [])
                stem_md = prose_to_markdown(problem)
                if match_phrase in stem_md.lower():
                    found = sq
                    break
            
            if not found:
                print(f"  ❌ Question not found on SME page")
                # Show available stems for debugging
                for i, sq in enumerate(questions[:5]):
                    stem = prose_to_markdown(sq.get('problem', []))[:100]
                    print(f"    [{i}] {stem}")
                continue
            
            # Extract figures
            problem = found.get('problem', [])
            figures = extract_figures(problem)
            print(f"  Found {len(figures)} figure(s)")
            
            if not figures:
                print(f"  ⚠️ No figures in SME data")
                continue
            
            # Download each figure as data URI
            data_uris = []
            for f_url in figures:
                print(f"  Downloading: {f_url[:80]}...")
                data_uri = await download_image_as_data_uri(page, f_url)
                if data_uri:
                    data_uris.append(data_uri)
                    print(f"    ✓ {len(data_uri)} chars")
                else:
                    print(f"    ✗ Failed")
            
            if not data_uris:
                print(f"  ❌ No images downloaded")
                continue
            
            # Build new stem with images embedded
            # Get the current DB stem
            req = urllib.request.Request(
                f"{BASE}/questions?id=eq.{q['id']}&select=question_text,answer_text",
                headers=HEADERS
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                db_data = json.loads(resp.read())
            if not db_data:
                print(f"  ❌ Question not in DB")
                continue
            
            current_stem = db_data[0]['question_text']
            current_answer = db_data[0].get('answer_text', '')
            
            # Remove bracket alt text and add image markdown
            new_stem = re.sub(r'\[[A-Z][^\]]{10,}\]', '', current_stem).strip()
            # Clean double spaces
            new_stem = re.sub(r'  +', ' ', new_stem)
            new_stem = re.sub(r'\n{3,}', '\n\n', new_stem)
            
            for du in data_uris:
                new_stem = f"![diagram]({du})\n\n" + new_stem
            
            # Get correct answer from SME
            choices = found.get('choices', [])
            correct_letter = None
            for c in choices:
                if c.get('is_correct'):
                    correct_letter = chr(65 + c.get('order', 0))
            
            update = {"question_text": new_stem}
            if correct_letter and correct_letter != current_answer:
                update["answer_text"] = correct_letter
                print(f"  🔧 Answer corrected: {current_answer} → {correct_letter}")
            
            # PATCH DB
            try:
                status = api_patch(q['id'], update)
                print(f"  ✅ DB updated (HTTP {status})")
                if correct_letter and correct_letter != current_answer:
                    print(f"     Answer: {current_answer} → {correct_letter}")
            except Exception as e:
                print(f"  ❌ DB update failed: {e}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
