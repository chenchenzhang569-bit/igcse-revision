#!/usr/bin/env python3
"""
Extract SME revision notes for Edexcel IGCSE Maths A Higher (4MA1).
Converts ProseMirror JSON to markdown (WITH equation SVGs as data URIs).
Saves to notes table grouped by DB subtopic.
"""
import json, re, html, time, os, sys, subprocess, base64, hashlib, io
from difflib import SequenceMatcher

# ── Config ──
SME_URL = "https://www.savemyexams.com"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = ""
SERVICE_KEY = ""
SUBJECT_ID = "055b3648-a7b5-4c95-9bbd-868f2c3cce1d"  # Mathematics (Higher)

# The path prefix in the Higher slug
SLUG_PREFIX = "edexcel-mathematics-higher-4ma1-"

# ── Name mapping: SME subtopic slug → DB subtopic short slug ──
# SME slug (last part of URL path) → DB subtopic slug suffix (without SLUG_PREFIX)
TOPIC_TO_DB_SUB = {
    # Section 1: Numbers & the Number System
    "number-toolkit": "numbers-the-number-system-number-toolkit",
    "set-notation-and-venn-diagrams": "numbers-the-number-system-set-notation-and-venn-diagrams",
    "prime-factors-hcf-and-lcm": "numbers-the-number-system-prime-factors-hcf-and-lcm",
    "powers-roots-and-standard-form": "numbers-the-number-system-powers-roots-and-standard-form",
    "fractions": "numbers-the-number-system-fractions",
    "percentages": "numbers-the-number-system-percentages",
    "compound-interest-and-depreciation": "numbers-the-number-system-compound-interest-and-depreciation",
    "fractions-decimals-and-percentages": "numbers-the-number-system-fractions-decimals-and-percentages",
    "rounding-estimation-and-bounds": "numbers-the-number-system-rounding-estimation-and-bounds",
    "surds": "numbers-the-number-system-surds",
    "using-a-calculator": "numbers-the-number-system-using-a-calculator",
    "ratio-toolkit": "numbers-the-number-system-ratio-toolkit",
    "ratio-problem-solving": "numbers-the-number-system-ratio-problem-solving",
    "exchange-rates-and-best-buys": "numbers-the-number-system-exchange-rates-and-best-buys",
    "direct-and-inverse-proportion": "numbers-the-number-system-direct-and-inverse-proportion",
    # Section 2: Equations, Formulae & Identities
    "algebra-toolkit": "equations-formulae-identities-algebra-toolkit",
    "algebraic-roots-and-indices": "equations-formulae-identities-algebraic-roots-and-indices",
    "expanding-brackets": "equations-formulae-identities-expanding-brackets",
    "factorising": "equations-formulae-identities-factorising",
    "completing-the-square": "equations-formulae-identities-completing-the-square",
    "algebraic-fractions": "equations-formulae-identities-algebraic-fractions",
    "rearranging-formulae": "equations-formulae-identities-rearranging-formulae",
    "algebraic-proof": "equations-formulae-identities-algebraic-proof",
    "linear-equations": "equations-formulae-identities-linear-equations",
    "solving-quadratic-equations": "equations-formulae-identities-solving-quadratic-equations",
    "solving-inequalities": "equations-formulae-identities-solving-inequalities",
    "simultaneous-equations": "equations-formulae-identities-simultaneous-equations",
    "forming-and-solving-equations": "equations-formulae-identities-forming-and-solving-equations",
    # Section 3: Sequences, Functions & Graphs
    "sequences": "sequences-functions-graphs-sequences",
    "functions": "sequences-functions-graphs-functions",
    "coordinate-geometry": "sequences-functions-graphs-coordinate-geometry",
    "linear-graphs-y-equals-mx-plus-c": "sequences-functions-graphs-linear-graphs-y-equals-mx-plus-c",
    "graphs-of-functions": "sequences-functions-graphs-graphs-of-functions",
    "estimating-gradients": "sequences-functions-graphs-estimating-gradients",
    "real-life-graphs": "sequences-functions-graphs-real-life-graphs",
    "graphing-inequalities": "sequences-functions-graphs-graphing-inequalities",
    "transformations-of-graphs": "sequences-functions-graphs-transformations-of-graphs",
    "differentiation": "sequences-functions-graphs-differentiation",
    # Section 4: Geometry & Trigonometry
    "standard-and-compound-units": "geometry-trigonometry-standard-and-compound-units",
    "angles-in-polygons-and-parallel-lines": "geometry-trigonometry-angles-in-polygons-and-parallel-lines",
    "bearings-scale-drawing-and-constructions": "geometry-trigonometry-bearings-scale-drawing-and-constructions",
    "circle-theorems": "geometry-trigonometry-circle-theorems",
    "area-and-perimeter": "geometry-trigonometry-area-and-perimeter",
    "circles-arcs-and-sectors": "geometry-trigonometry-circles-arcs-and-sectors",
    "volume-and-surface-area": "geometry-trigonometry-volume-and-surface-area",
    "congruence-similarity-and-geometrical-proof": "geometry-trigonometry-congruence-similarity-and-geometrical-proof",
    "area-and-volume-of-similar-shapes": "geometry-trigonometry-area-and-volume-of-similar-shapes",
    "right-angled-triangles---pythagoras-and-trigonometry": "geometry-trigonometry-right-angled-triangles---pythagoras-and-trigonometry",
    "sine-cosine-rule-and-area-of-triangles": "geometry-trigonometry-sine-cosine-rule-and-area-of-triangles",
    "3d-pythagoras-and-trigonometry": "geometry-trigonometry-3d-pythagoras-and-trigonometry",
    # Section 5: Vectors & Transformation Geometry
    "vectors": "vectors-transformation-geometry-vectors",
    "transformations": "vectors-transformation-geometry-transformations",
    # Section 6: Statistics & Probability
    "statistics-toolkit": "statistics-probability-statistics-toolkit",
    "histograms": "statistics-probability-histograms",
    "cumulative-frequency-diagrams": "statistics-probability-cumulative-frequency-diagrams",
    "probability-toolkit": "statistics-probability-probability-toolkit",
    "probability-diagrams---venn-and-tree-diagrams": "statistics-probability-probability-diagrams---venn-and-tree-diagrams",
    "combined-and-conditional-probability": "statistics-probability-combined-and-conditional-probability",
}

# ── Helpers ──

def login():
    r = subprocess.run([
        "curl", "-sv", "-X", "POST",
        f"{SME_URL}/api/auth/v1/supertokens/signin/",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"formFields": [
            {"id": "email", "value": "inspiringchermann@vmail.dev"},
            {"id": "password", "value": "WXVm8Chqq2"}
        ]})
    ], capture_output=True, text=True, timeout=20)
    m = re.search(r'st-access-token:\s*(\S+)', r.stderr)
    if not m:
        raise Exception("Login failed")
    return m.group(1)

def sme_get(url, token):
    r = subprocess.run([
        "curl", "-s", url,
        "-H", f"Authorization: Bearer {token}",
        "-H", "User-Agent: Mozilla/5.0"
    ], capture_output=True, text=True, timeout=30)
    return r.stdout

def get_nextdata(html):
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    return json.loads(m.group(1)) if m else None

def get_db_subtopics():
    """Fetch DB subtopics. Return keyed by short slug (without prefix)."""
    r = subprocess.run([
        "curl", "-s",
        f"{SUPABASE_URL}/rest/v1/topics?select=id,slug&subject_id=eq.{SUBJECT_ID}&order=sort_order",
        "-H", f"apikey: {ANON_KEY}",
        "-H", f"Authorization: Bearer {ANON_KEY}"
    ], capture_output=True, text=True, timeout=15)
    topics = json.loads(r.stdout)
    
    all_subs = {}
    for t in topics:
        r = subprocess.run([
            "curl", "-s",
            f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name,topic_id&topic_id=eq.{t['id']}&order=sort_order",
            "-H", f"apikey: {ANON_KEY}",
            "-H", f"Authorization: Bearer {ANON_KEY}"
        ], capture_output=True, text=True, timeout=15)
        subs = json.loads(r.stdout)
        for s in subs:
            short_slug = re.sub(f'^{re.escape(SLUG_PREFIX)}', '', s["slug"])
            all_subs[short_slug] = s
    return all_subs

def prose_to_md(prose_content):
    """Convert ProseMirror JSON → markdown string."""
    out = []
    for node in prose_content or []:
        if not isinstance(node, dict):
            continue
        t = node.get("type", "")
        a = node.get("attrs") or {}
        c = node.get("content") or []
        
        if t == "specPoint":
            name = a.get("name", "")
            if name:
                out.append(f"\n### {name}\n")
            if c:
                out.append(prose_to_md(c))
        
        elif t == "heading":
            lvl = a.get("level", 2)
            txt = render_inline(c)
            out.append(f"\n{'#' * lvl} {txt}\n")
        
        elif t == "paragraph":
            txt = render_inline(c)
            if txt.strip():
                out.append(f"\n{txt}\n")
            else:
                out.append("\n")
        
        elif t in ("bulletList", "orderedList"):
            for i, item in enumerate(c):
                if item.get("type") != "listItem":
                    continue
                ic = item.get("content") or []
                txt = ""
                for child in ic:
                    ct = child.get("type", "")
                    if ct == "paragraph":
                        txt += render_inline(child.get("content") or [])
                    elif ct in ("bulletList", "orderedList"):
                        txt += "\n" + prose_to_md([child])
                prefix = "- " if t == "bulletList" else f"{a.get('order', 1) + i}. "
                out.append(f"\n{prefix}{txt}\n")
        
        elif t == "equation":
            src = a.get("src", "")
            alt = a.get("alt", "")
            if src:
                out.append(f"\n![{alt}]({src})\n")
        
        elif t == "codeBlock":
            lang = a.get("language", "")
            txt = render_inline(c)
            out.append(f"\n```{lang}\n{txt}\n```\n")
        
        elif t == "horizontalRule":
            out.append("\n---\n")
        
        elif t == "table":
            out.append(prose_table_md(node))
        
        elif t == "figure":
            src = a.get("src", "")
            alt = a.get("alt", "")
            if src:
                out.append(f"\n![{alt}]({src})\n")
            for child in c:
                if child.get("type") == "figcaption":
                    cap = render_inline(child.get("content") or [])
                    if cap.strip():
                        out.append(f"\n*{cap}*\n")
        
        elif t == "blockquote":
            txt = prose_to_md(c).strip()
            for line in txt.split("\n"):
                if line.strip():
                    out.append(f"\n> {line.strip()}\n")
        
        else:
            txt = render_inline(c)
            if txt.strip():
                out.append(txt)
    
    return "".join(out)

def render_inline(content):
    """Render inline ProseMirror nodes to text with markdown formatting."""
    out = []
    for node in content or []:
        if not isinstance(node, dict):
            continue
        t = node.get("type", "")
        if t == "text":
            text = html.unescape(node.get("text", ""))
            for mark in node.get("marks") or []:
                mt = mark.get("type", "")
                ma = mark.get("attrs") or {}
                if mt == "bold": text = f"**{text}**"
                elif mt == "italic": text = f"*{text}*"
                elif mt == "underline": text = f"<u>{text}</u>"
                elif mt == "code": text = f"`{text}`"
                elif mt == "strike": text = f"~~{text}~~"
                elif mt == "link": text = f"[{text}]({ma.get('href','')})"
                elif mt == "subscript": text = f"<sub>{text}</sub>"
                elif mt == "superscript": text = f"<sup>{text}</sup>"
            out.append(text)
        elif t == "equation":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src: out.append(f"![{alt}]({src})")
        elif t == "hardBreak":
            out.append("  \n")
        elif t == "image":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src: out.append(f"![{alt}]({src})")
        elif t == "paragraph":
            out.append(render_inline(node.get("content") or []))
    return "".join(out)

def prose_table_md(table_node):
    """Convert ProseMirror table to markdown table."""
    rows = []
    for child in (table_node.get("content") or []):
        if child.get("type") == "tableRow":
            rows.append(child)
    if not rows:
        return ""
    
    md = ["\n"]
    for i, row in enumerate(rows):
        cells = []
        for cell in (row.get("content") or []):
            if cell.get("type") in ("tableHeader", "tableCell"):
                text = render_inline(cell.get("content") or [])
                cells.append(text.strip())
        if cells:
            md.append(f"| {' | '.join(cells)} |")
        if i == 0:
            md.append(f"| {' | '.join(['---'] * len(cells))} |")
    md.append("\n")
    return "\n".join(md)

def save_note(subtopic_id, title, content_md, topic_id=None):
    """Save a note via Management API SQL (write to file to avoid arg limit)."""
    MGMT_TOKEN = ""
    PROJECT_REF = "aondldqwwvttwpervrfq"
    
    title_esc = title.replace("'", "''")
    content_esc = content_md.replace("'", "''")
    top_id_str = f"'{topic_id}'" if topic_id else "NULL"
    
    sql = f"""INSERT INTO notes (subtopic_id, topic_id, subject_id, title, content, sort_order)
VALUES ('{subtopic_id}', {top_id_str}, '{SUBJECT_ID}', '{title_esc}', '{content_esc}', 0)
RETURNING id;"""
    
    with open("/tmp/note_sql.json", "w") as f:
        json.dump({"query": sql}, f)
    
    r = subprocess.run([
        "curl", "-s", "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-H", f"Authorization: Bearer {MGMT_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", "@/tmp/note_sql.json"
    ], capture_output=True, text=True, timeout=30)
    return r

def get_sme_sections():
    """Get the SME revision notes listing page and extract all subtopic slugs + topic URLs."""
    html = sme_get(f"{SME_URL}/igcse/maths/edexcel/a/18/higher/revision-notes/", token)
    # Extract all subtopic revision note page URLs
    urls = re.findall(r'https://www\.savemyexams\.com/igcse/maths/edexcel/a/18/higher/revision-notes/[^"<>]+', html)
    seen = set()
    # Group by subtopic slug
    subpages = {}
    for u in urls:
        if u not in seen:
            seen.add(u)
            parts = u.split('/')
            if len(parts) >= 10:
                sub_slug = parts[-3]  # subtopic slug
                if sub_slug not in subpages:
                    subpages[sub_slug] = []
                subpages[sub_slug].append(u)
    return subpages

# ════════════════════════════ MAIN ════════════════════════════

token = login()
print("✅ Logged in to SME")

db_subs = get_db_subtopics()
print(f"✅ Fetched {len(db_subs)} DB subtopics")

sme_pages = get_sme_sections()
print(f"✅ Found {len(sme_pages)} subtopic groups on SME")

all_ok = True
written = 0
skipped = 0
errors = []

for sub_slug, urls in sorted(sme_pages.items()):
    db_short_slug = TOPIC_TO_DB_SUB.get(sub_slug)
    if not db_short_slug:
        print(f"⚠️  No mapping for SME subtopic: {sub_slug} ({len(urls)} pages)")
        skipped += 1
        continue
    
    if db_short_slug not in db_subs:
        print(f"⚠️  DB subtopic not found for short slug: {db_short_slug}")
        skipped += 1
        continue
    
    sub = db_subs[db_short_slug]
    sub_id = sub['id']
    top_id = sub.get('topic_id')
    
    print(f"\n📝 {sub_slug} → {db_short_slug} ({len(urls)} pages)")
    
    all_text = ""
    
    for url in urls:
        topic_name = url.rstrip('/').split('/')[-1].replace('-', ' ').title()
        html_page = sme_get(url, token)
        nd = get_nextdata(html_page)
        if not nd:
            print(f"  ⚠️  No __NEXT_DATA__ for {url}")
            continue
        
        # Extract ProseMirror content from the page
        prose = None
        try:
            page_props = nd.get('props', {}).get('pageProps', {})
            # Try different paths for ProseMirror content
            if 'revisionNote' in page_props:
                prose = page_props['revisionNote'].get('attributes', {}).get('content', [])
            elif 'note' in page_props:
                prose = page_props['note'].get('attributes', {}).get('content', [])
            elif 'page' in page_props:
                prose = page_props['page'].get('content', [])
        except:
            pass
        
        if not prose:
            # Try deeper search
            def find_content(obj, depth=0):
                if depth > 5: return None
                if isinstance(obj, dict):
                    if obj.get('type') == 'doc' and 'content' in obj:
                        return obj['content']
                    for v in obj.values():
                        r = find_content(v, depth+1)
                        if r: return r
                elif isinstance(obj, list):
                    for item in obj:
                        r = find_content(item, depth+1)
                        if r: return r
                return None
            prose = find_content(nd)
        
        if not prose:
            print(f"  ⚠️  No prose content found")
            continue
        
        md = prose_to_md(prose)
        if md.strip():
            all_text += f"\n\n## {topic_name}\n\n{md}"
    
    if not all_text.strip():
        print(f"  ⚠️  No content extracted")
        skipped += 1
        continue
    
    title = f"PMT Revision Notes: {sub.get('display_name', db_short_slug)}"
    
    r = save_note(sub_id, title, all_text, top_id)
    if r.returncode == 0 and r.stdout:
        try:
            resp = json.loads(r.stdout)
            if 'id' in resp:
                print(f"  ✅ Note saved (id: {resp['id'][:8]}...)")
                written += 1
            else:
                print(f"  ⚠️  Response: {r.stdout[:200]}")
        except:
            print(f"  ✅ Note saved (response: {r.stdout[:100]})")
            written += 1
    else:
        print(f"  ❌ Error: {r.stderr[:200] or r.stdout[:200]}")
        errors.append(sub_slug)

print(f"\n{'='*50}")
print(f"Done! Written: {written}, Skipped: {skipped}, Errors: {len(errors)}")
if errors:
    print(f"Errors: {', '.join(errors)}")
