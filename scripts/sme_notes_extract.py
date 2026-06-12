#!/usr/bin/env python3
"""
Extract SME revision notes for Edexcel IGCSE Maths A Foundation (4MA1).
Converts ProseMirror JSON to markdown (WITH equation SVGs as data URIs).
Saves to Supabase notes table grouped by DB subtopic.
"""

import json, re, html, time, os, sys, subprocess, base64, hashlib, io
from difflib import SequenceMatcher

# ── Config ──
SME_URL = "https://www.savemyexams.com"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = ""
SERVICE_KEY = ""
SUBJECT_ID = "d51b2b1e-b782-46e1-ade0-e9f702dc9451"

# ── Name mapping: SME topic name → DB subtopic slug ──
# These matched manually from the overview (1:1 mapping)
TOPIC_TO_DB_SUB = {
    # Section 1: Numbers
    "Number Operations": "number-operations",
    "Set Notation & Venn Diagrams": "set-notation-and-venn-diagrams",
    "Types of Number, Prime Factors, HCF & LCM": "types-of-number-prime-factors-hcf-and-lcm",
    "Powers, Roots & Standard Form": "powers-roots-and-standard-form",
    "Fractions": "fractions",
    "Percentages": "percentages",
    "Compound Interest & Depreciation": "compound-interest-and-depreciation",
    "Fractions, Decimals & Percentages": "fractions-decimals-and-percentages",
    "Rounding, Estimation & Error Intervals": "rounding-estimation-and-error-intervals",
    "Using a Calculator": "using-a-calculator",
    "Ratio": "ratio",
    "Proportion": "direct-and-inverse-proportion",
    "Exchange Rates & Best Buys": "exchange-rates-and-best-buys",
    # Section 2: Equations
    "Introduction to Algebra": "introduction-to-algebra",
    "Algebraic Roots & Indices": "algebraic-roots-and-indices",
    "Expanding Brackets": "expanding-brackets",
    "Factorising": "factorising",
    "Rearranging Formulas": "rearranging-formulas",
    "Linear Equations": "linear-equations",
    "Quadratic Equations": "solving-quadratic-equations",
    "Simultaneous Equations": "simultaneous-equations",
    "Forming & Solving Equations": "forming-and-solving-equations",
    "Solving Inequalities": "solving-inequalities",
    # Section 3: Sequences, Functions & Graphs
    "Sequences": "sequences",
    "Functions": "functions",
    "Coordinate Geometry": "coordinate-geometry",
    "Linear Graphs": "linear-graphs",
    "Graphing Inequalities": "graphing-inequalities",
    "Graphs of Functions": "graphs-of-functions",
    "Real-Life Graphs": "real-life-graphs",
    # Section 4: Geometry
    "Symmetry & Shapes": "symmetry-and-shapes",
    "Angles in Polygons & Parallel Lines": "angles-in-polygons-and-parallel-lines",
    "2D & 3D Shapes": "2d-and-3d-shapes",
    "Standard & Compound Units": "standard-and-compound-units",
    "Bearings, Scale Drawing & Constructions": "bearings-scale-drawing-and-constructions",
    "Area & Perimeter": "area-and-perimeter",
    "Circles, Arcs & Sectors": "circles-arcs-and-sectors",
    "Volume & Surface Area": "volume-and-surface-area",
    "Congruence, Similarity & Geometrical Proof": "congruence-similarity-and-geometrical-proof",
    "Pythagoras & Trigonometry": "pythagoras-and-trigonometry",
    # Section 5: Vectors
    "Transformations": "transformations",
    # Section 6: Statistics
    "Averages, Ranges & Data": "averages-ranges-and-data",
    "Statistical Diagrams": "statistical-diagrams",
    "Introduction to Probability": "introduction-to-probability",
    "Venn Diagrams & Sample Space Diagrams": "venn-diagrams-and-sample-space-diagrams",
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
    
    db_subs = {}
    for t in topics:
        r = subprocess.run([
            "curl", "-s",
            f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name&topic_id=eq.{t['id']}&order=sort_order",
            "-H", f"apikey: {ANON_KEY}",
            "-H", f"Authorization: Bearer {ANON_KEY}"
        ], capture_output=True, text=True, timeout=15)
        subs = json.loads(r.stdout)
        for s in subs:
            # Strip prefix: "edexcel-mathematics-4ma1-number-operations" → "number-operations"
            short_slug = re.sub(r'^edexcel-mathematics-4ma1-', '', s["slug"])
            db_subs[short_slug] = s
    return db_subs

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
    """Save a note to Supabase notes table."""
    payload = json.dumps({
        "subtopic_id": subtopic_id,
        "topic_id": topic_id,
        "title": title,
        "content": content_md,
        "sort_order": 0
    })
    
    # Write to temp file to avoid argument too long
    with open("/tmp/note_payload.json", "w") as f:
        f.write(payload)
    
    r = subprocess.run([
        "curl", "-s", "-X", "POST",
        f"{SUPABASE_URL}/rest/v1/notes",
        "-H", f"apikey: {SERVICE_KEY}",
        "-H", f"Authorization: Bearer {SERVICE_KEY}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: return=minimal",
        "-d", "@" + "/tmp/note_payload.json",
        "-w", "%{http_code}"
    ], capture_output=True, text=True, timeout=30)
    return r.stdout.strip()


def main():
    token = login()
    print(f"✅ Logged in (token: {token[:20]}...)")
    
    # Get SME overview data
    html = sme_get(f"{SME_URL}/igcse/maths/edexcel/a/18/foundation/revision-notes/", token)
    nd = get_nextdata(html)
    pp = nd["props"]["pageProps"]
    sections = pp["sections"]
    topics = pp["topics"]
    subtopics = pp["subtopics"]
    
    # Build lookups
    sec_by_id = {s["id"]: s for s in sections}
    subs_by_topic = {}
    for s in subtopics:
        tid = s.get("relationships", {}).get("topic", {}).get("data", {}).get("id")
        if tid:
            subs_by_topic.setdefault(tid, []).append(s)
    
    # Topic name → SME topic lookup
    sme_topics_by_name = {}
    for t in topics:
        name = t.get("attributes", {}).get("name", "")
        sme_topics_by_name[name.lower()] = t
    
    # Get DB subtopics
    db_subs = get_db_subtopics()
    print(f"✅ Got {len(db_subs)} DB subtopics, {len(TOPIC_TO_DB_SUB)} mapping entries")
    
    saved, skipped, errors = 0, 0, 0
    
    for sme_name, db_slug in TOPIC_TO_DB_SUB.items():
        sme_topic = sme_topics_by_name.get(sme_name.lower())
        if not sme_topic:
            print(f"❌ SME topic not found: {sme_name}")
            skipped += 1
            continue
        
        db_sub = db_subs.get(db_slug)
        if not db_sub:
            print(f"❌ DB subtopic not found: {db_slug}")
            skipped += 1
            continue
        
        # Get all SME subtopics under this topic
        sme_subtopics = subs_by_topic.get(sme_topic["id"], [])
        
        print(f"\n📁 {sme_name} → {db_sub['display_name']} ({len(sme_subtopics)} sub-notes)")
        
        # Get section slug from first subtopic's parent
        sec = sec_by_id.get(sme_topic.get("relationships", {}).get("section", {}).get("data", {}).get("id"))
        if not sec:
            skipped += 1
            continue
        sec_slug = sec.get("attributes", {}).get("slug", "")
        sme_slug = sme_topic.get("attributes", {}).get("slug", "")
        
        # Fetch each SME subtopic's revision note and merge
        all_md = []
        for sme_sub in sme_subtopics:
            sub_slug = sme_sub.get("attributes", {}).get("slug", "")
            sub_name = sme_sub.get("attributes", {}).get("name", "")
            
            url = f"{SME_URL}/igcse/maths/edexcel/a/18/foundation/revision-notes/{sec_slug}/{sme_slug}/{sub_slug}/"
            page_html = sme_get(url, token)
            nd2 = get_nextdata(page_html)
            if not nd2:
                continue
            
            note = nd2.get("props", {}).get("pageProps", {}).get("revisionNote", {})
            content = note.get("attributes", {}).get("content", [])
            if not content:
                continue
            
            md = prose_to_md(content)
            if md.strip():
                if len(sme_subtopics) > 1:
                    all_md.append(f"\n### {sub_name}\n\n{md}")
                else:
                    all_md.append(md)
            
            time.sleep(0.3)  # Rate limit
        
        if not all_md:
            print(f"  ⚠️ No content extracted")
            skipped += 1
            continue
        
        full_md = "\n\n".join(all_md)
        title = db_sub["display_name"]
        
        # Save
        result = save_note(db_sub["id"], title, full_md)
        if result == "201":
            print(f"  ✅ Saved ({len(full_md)} chars)")
            saved += 1
        else:
            print(f"  ⚠️ HTTP {result}")
            errors += 1
    
    print(f"\n{'='*40}")
    print(f"Done! Saved: {saved}, Skipped: {skipped}, Errors: {errors}")


if __name__ == "__main__":
    main()
