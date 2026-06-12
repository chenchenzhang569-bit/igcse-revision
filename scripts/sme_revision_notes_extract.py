#!/usr/bin/env python3
"""
Extract SME revision notes ProseMirror JSON, convert to markdown,
and save to the notes table for Edexcel IGCSE Maths A Foundation (4MA1).
"""

import json, re, urllib.request, urllib.error, base64, sys, time, html
from difflib import SequenceMatcher

# ─── Config ───
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = ""
SME_EMAIL = "inspiringchermann@vmail.dev"
SME_PASS = "WXVm8Chqq2"

SUBJECT_ID = "d51b2b1e-b782-46e1-ade0-e9f702dc9451"  # edexcel-mathematics-4ma1

# ─── Helpers ───

def sme_login():
    """Login to SME and return access token."""
    data = json.dumps({"formFields": [{"id": "email", "value": SME_EMAIL}, {"id": "password", "value": SME_PASS}]}).encode()
    req = urllib.request.Request(
        "https://www.savemyexams.com/api/auth/v1/supertokens/signin/",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    # Need to get response headers - urllib doesn't easily expose them
    # Use curl fallback
    import subprocess
    r = subprocess.run([
        "curl", "-sv", "-X", "POST",
        "https://www.savemyexams.com/api/auth/v1/supertokens/signin/",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"formFields": [{"id": "email", "value": SME_EMAIL}, {"id": "password", "value": SME_PASS}]})
    ], capture_output=True, text=True, timeout=20)
    
    m = re.search(r'st-access-token:\s*(\S+)', r.stderr)
    if m:
        return m.group(1)
    raise Exception("Login failed")

def sme_get(url, token):
    """GET a URL with SME auth token."""
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "User-Agent": "Mozilla/5.0"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.read().decode()

def get_db_topics_subtopics():
    """Fetch our DB topics and subtopics for 4MA1."""
    import subprocess
    
    # Get topics
    r = subprocess.run([
        "curl", "-s",
        f"{SUPABASE_URL}/rest/v1/topics?select=id,slug,display_name,sort_order&subject_id=eq.{SUBJECT_ID}&order=sort_order",
        "-H", f"apikey: {ANON_KEY}",
        "-H", f"Authorization: Bearer {ANON_KEY}"
    ], capture_output=True, text=True, timeout=15)
    topics = json.loads(r.stdout)
    
    # Get subtopics for each topic
    db_data = {}
    for t in topics:
        tid = t["id"]
        r = subprocess.run([
            "curl", "-s",
            f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name,sort_order&topic_id=eq.{tid}&order=sort_order",
            "-H", f"apikey: {ANON_KEY}",
            "-H", f"Authorization: Bearer {ANON_KEY}"
        ], capture_output=True, text=True, timeout=15)
        subtopics = json.loads(r.stdout)
        
        key = t["display_name"].lower().replace(" & ", " ").replace(" and ", " ")
        db_data[key] = {
            "topic": t,
            "subtopics": {s["display_name"].lower().replace(" & ", " ").replace(" and ", " "): s for s in subtopics}
        }
    return db_data

def get_sme_sections(token):
    """Fetch SME revision notes overview and return sections/topics/subtopics."""
    html = sme_get(
        "https://www.savemyexams.com/igcse/maths/edexcel/a/18/foundation/revision-notes/",
        token
    )
    
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        raise Exception("No __NEXT_DATA__ found")
    
    data = json.loads(m.group(1))
    pages = data.get("props", {}).get("pageProps", {})
    
    sections = pages.get("sections", [])
    topics = pages.get("topics", [])
    subtopics = pages.get("subtopics", [])
    
    # Build lookup
    sec_by_id = {s["id"]: s for s in sections}
    
    # Group topics by section
    section_topics = {}
    for t in topics:
        sec_id = t.get("relationships", {}).get("section", {}).get("data", {}).get("id")
        if sec_id:
            section_topics.setdefault(sec_id, []).append(t)
    
    # Group subtopics by topic
    topic_subtopics = {}
    for s in subtopics:
        top_id = s.get("relationships", {}).get("topic", {}).get("data", {}).get("id")
        if top_id:
            topic_subtopics.setdefault(top_id, []).append(s)
    
    return sections, sec_by_id, section_topics, topic_subtopics

def get_sme_revision_note(token, subtopic_slug, section_slug, topic_slug):
    """Fetch a specific revision note page and extract content."""
    url = f"https://www.savemyexams.com/igcse/maths/edexcel/a/18/foundation/revision-notes/{section_slug}/{topic_slug}/{subtopic_slug}/"
    html = sme_get(url, token)
    
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        return None
    
    data = json.loads(m.group(1))
    pages = data.get("props", {}).get("pageProps", {})
    note = pages.get("revisionNote", {})
    if not note:
        return None
    
    content = note.get("attributes", {}).get("content", [])
    return content

def extract_revision_note_id(token, subtopic_slug, section_slug, topic_slug):
    """Get the revision note ID from a subtopic page without fetching heavy content."""
    url = f"https://www.savemyexams.com/igcse/maths/edexcel/a/18/foundation/revision-notes/{section_slug}/{topic_slug}/{subtopic_slug}/"
    html = sme_get(url, token)
    
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        return None
    
    data = json.loads(m.group(1))
    pages = data.get("props", {}).get("pageProps", {})
    note = pages.get("revisionNote", {})
    if note:
        return note.get("id")
    return None


def prose_to_markdown(prose_content, depth=0):
    """
    Convert ProseMirror JSON content to markdown.
    Handles: paragraphs, headings, bulletLists, orderedLists, 
             equations (SVG), text with marks (bold, italic, link),
             code blocks, hard breaks, specPoint nodes.
    """
    result = []
    
    for node in prose_content:
        if not isinstance(node, dict):
            continue
        
        node_type = node.get("type", "")
        attrs = node.get("attrs", {}) or {}
        content = node.get("content") or []
        
        if node_type == "specPoint":
            # specPoint has a heading + content inside
            name = attrs.get("name", "")
            if name:
                result.append(f"\n### {name}\n")
            if content:
                result.append(prose_to_markdown(content, depth))
                
        elif node_type == "heading":
            level = attrs.get("level", 2)
            text = render_inline(content)
            result.append(f"\n{'#' * level} {text}\n")
            
        elif node_type == "paragraph":
            text = render_inline(content)
            align = attrs.get("textAlign", "left")
            if text.strip():
                result.append(f"\n{text}\n")
            else:
                result.append("\n")
                
        elif node_type == "bulletList":
            for item in content:
                if item.get("type") == "listItem":
                    item_content = item.get("content") or []
                    text = ""
                    for child in item_content:
                        if child.get("type") == "paragraph":
                            text += render_inline(child.get("content") or [])
                        elif child.get("type") == "bulletList":
                            text += "\n" + prose_to_markdown([child], depth + 1)
                    result.append(f"\n{'  ' * depth}- {text}\n")
                    
        elif node_type == "orderedList":
            start = attrs.get("order", 1)
            for i, item in enumerate(content):
                if item.get("type") == "listItem":
                    item_content = item.get("content") or []
                    text = ""
                    for child in item_content:
                        if child.get("type") == "paragraph":
                            text += render_inline(child.get("content") or [])
                        elif child.get("type") in ("bulletList", "orderedList"):
                            text += "\n" + prose_to_markdown([child], depth + 1)
                    result.append(f"\n{'  ' * depth}{start + i}. {text}\n")
                    
        elif node_type == "equation":
            # Equations are SVGs - we'll embed them as markdown images
            src = attrs.get("src", "")
            alt = attrs.get("alt", "")
            if src:
                result.append(f"\n![{alt}]({src})\n")
                
        elif node_type == "codeBlock":
            lang = attrs.get("language", "")
            text = render_inline(content)
            result.append(f"\n```{lang}\n{text}\n```\n")
            
        elif node_type == "horizontalRule":
            result.append("\n---\n")
            
        elif node_type == "table":
            # Convert table to markdown
            result.append(prose_table_to_markdown(node))
            
        elif node_type == "figure":
            # Handle figure nodes (images with captions)
            src = attrs.get("src", "")
            alt = attrs.get("alt", "")
            if src:
                result.append(f"\n![{alt}]({src})\n")
            if content:
                # Figure may have figcaption
                for child in content:
                    if child.get("type") == "figcaption":
                        cap = render_inline(child.get("content") or [])
                        if cap:
                            result.append(f"\n*{cap}*\n")
                            
        elif node_type == "blockquote":
            text = prose_to_markdown(content, depth)
            lines = text.strip().split("\n")
            for line in lines:
                if line.strip():
                    result.append(f"\n> {line.strip()}\n")
                    
        else:
            # Fallback: render inline text
            text = render_inline(content)
            if text.strip():
                result.append(text)
    
    return "".join(result)


def render_inline(content):
    """Render inline ProseMirror content (text + marks)."""
    result = []
    
    for node in content:
        if not isinstance(node, dict):
            continue
        
        node_type = node.get("type", "")
        
        if node_type == "text":
            text = html.unescape(node.get("text", ""))
            marks = node.get("marks") or []
            
            # Apply marks from innermost to outermost
            for mark in marks:
                mark_type = mark.get("type", "")
                mark_attrs = mark.get("attrs") or {}
                
                if mark_type == "bold":
                    text = f"**{text}**"
                elif mark_type == "italic":
                    text = f"*{text}*"
                elif mark_type == "underline":
                    text = f"<u>{text}</u>"
                elif mark_type == "code":
                    text = f"`{text}`"
                elif mark_type == "strike":
                    text = f"~~{text}~~"
                elif mark_type == "link":
                    href = mark_attrs.get("href", "")
                    text = f"[{text}]({href})"
                elif mark_type == "subscript":
                    text = f"<sub>{text}</sub>"
                elif mark_type == "superscript":
                    text = f"<sup>{text}</sup>"
                    
            result.append(text)
            
        elif node_type == "equation":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src:
                result.append(f"![{alt}]({src})")
                
        elif node_type == "hardBreak":
            result.append("  \n")
            
        elif node_type == "image":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src:
                result.append(f"![{alt}]({src})")
                
    return "".join(result)


def prose_table_to_markdown(table_node):
    """Convert ProseMirror table node to markdown table."""
    rows = []
    
    # Find thead and tbody
    thead = None
    tbody = None
    
    for child in (table_node.get("content") or []):
        if child.get("type") == "tableRow":
            if not rows:
                # First row is header if there's no explicit thead
                rows.append(child)
            else:
                rows.append(child)
    
    if not rows:
        return ""
    
    md_rows = []
    
    for i, row in enumerate(rows):
        cells = []
        for cell in (row.get("content") or []):
            if cell.get("type") in ("tableHeader", "tableCell"):
                cell_content = cell.get("content") or []
                text = render_inline_content(cell_content)
                cells.append(text)
        
        if cells:
            md_rows.append("| " + " | ".join(cells) + " |")
        
        # Header separator after first row
        if i == 0:
            md_rows.append("| " + " | ".join(["---"] * len(cells)) + " |")
    
    return "\n" + "\n".join(md_rows) + "\n"


def render_inline_content(content):
    """Simple render of inline content for table cells."""
    texts = []
    for node in content:
        if not isinstance(node, dict):
            continue
        if node.get("type") == "text":
            texts.append(html.unescape(node.get("text", "")))
        elif node.get("type") == "equation":
            alt = node.get("attrs", {}).get("alt", "")
            texts.append(f"[{alt}]")
        elif node.get("type") == "hardBreak":
            texts.append(" ")
        elif node.get("type") == "paragraph":
            texts.append(render_inline(node.get("content") or []))
    return "".join(texts)


def name_similarity(a, b):
    """Check if two names match closely enough."""
    a = a.lower().replace("&", "and").replace("-", " ").strip()
    b = b.lower().replace("&", "and").replace("-", " ").strip()
    return SequenceMatcher(None, a, b).ratio()


def save_note_to_db(subtopic_id, title, content_md, source="SaveMyExams", sort_order=0):
    """Save a note record to the Supabase notes table."""
    import subprocess
    
    # Escape for JSON
    payload = json.dumps({
        "subtopic_id": subtopic_id,
        "title": title,
        "content": content_md,
        "source": source,
        "sort_order": sort_order
    })
    
    r = subprocess.run([
        "curl", "-s", "-X", "POST",
        f"{SUPABASE_URL}/rest/v1/notes",
        "-H", f"apikey: {ANON_KEY}",
        "-H", f"Authorization: Bearer {ANON_KEY}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: return=minimal",
        "-d", payload,
        "-w", "%{http_code}"
    ], capture_output=True, text=True, timeout=15)
    
    return r.stdout.strip()


def main():
    print("=== SME Revision Notes Extractor ===")
    print("Step 1: Login to SME...")
    token = sme_login()
    print(f"  Token: {token[:20]}...")
    
    print("\nStep 2: Fetch SME sections/topics/subtopics...")
    sections, sec_by_id, section_topics, topic_subtopics = get_sme_sections(token)
    
    print(f"  Sections: {len(sections)}")
    print(f"  Topics total: {sum(len(v) for v in section_topics.values())}")
    print(f"  Subtopics total: {sum(len(v) for v in topic_subtopics.values())}")
    
    print("\nStep 3: Fetch DB topics/subtopics...")
    db_data = get_db_topics_subtopics()
    print(f"  DB topics: {len(db_data)}")
    
    # Build mapping: SME section name → DB topic key
    sme_section_map = {}
    for sec in sections:
        attrs = sec.get("attributes", {})
        name = attrs.get("name", "")
        slug = attrs.get("slug", "")
        
        # Clean name for matching
        clean = name.lower().replace("&", "and").replace("-", " ").strip()
        # Remove leading number
        clean = re.sub(r'^\d+\.\s*', '', clean)
        
        # Find best match in DB
        for db_key in db_data:
            sim = name_similarity(db_key, clean)
            if sim > 0.6:
                sme_section_map[sec["id"]] = db_key
                print(f"  Mapped: '{name}' → DB topic (sim={sim:.2f})")
                break
    
    print(f"\n  Matched {len(sme_section_map)}/{len(sections)} sections")
    
    # Step 4: Process each SME section → topic → subtopic, mapping to DB
    print("\nStep 4: Extract and save revision notes...")
    
    total_saved = 0
    total_skipped = 0
    
    for sec_id, db_key in sme_section_map.items():
        db_topic = db_data[db_key]["topic"]
        db_subtopics = db_data[db_key]["subtopics"]
        
        sme_topic_list = section_topics.get(sec_id, [])
        
        print(f"\n--- Topic: {db_topic['display_name']} ({len(sme_topic_list)} SME topics, {len(db_subtopics)} DB subtopics) ---")
        
        for sme_topic in sme_topic_list:
            sme_topic_name = sme_topic.get("attributes", {}).get("name", "")
            sme_topic_slug = sme_topic.get("attributes", {}).get("slug", "")
            
            # Find matching DB subtopic
            matched_db_sub = None
            matched_db_key = None
            
            # Try exact match first
            for db_sub_key, db_sub in db_subtopics.items():
                if name_similarity(db_sub_key, sme_topic_name.lower()) > 0.7:
                    matched_db_sub = db_sub
                    matched_db_key = db_sub_key
                    break
            
            if not matched_db_sub:
                # Try partial match
                for db_sub_key, db_sub in db_subtopics.items():
                    # Check if SME name is contained in DB name or vice versa
                    sme_lower = sme_topic_name.lower()
                    db_lower = db_sub_key.lower()
                    if sme_lower in db_lower or db_lower in sme_lower:
                        matched_db_sub = db_sub
                        matched_db_key = db_sub_key
                        break
            
            if not matched_db_sub:
                print(f"  ⏭  {sme_topic_name} → no DB match")
                total_skipped += 1
                continue
            
            # Get subtopics for this SME topic
            sme_subtopics = topic_subtopics.get(sme_topic["id"], [])
            
            if not sme_subtopics:
                print(f"  ⏭  {sme_topic_name} → no SME subtopics")
                total_skipped += 1
                continue
            
            # Take the first subtopic's revision note (or merge all)
            # Usually one revision note per topic combines all subtopics
            combined_content = []
            
            for sme_sub in sme_subtopics:
                sub_slug = sme_sub.get("attributes", {}).get("slug", "")
                sub_name = sme_sub.get("attributes", {}).get("name", "")
                
                # Get section slug
                sec = sec_by_id.get(sec_id, {})
                sec_slug = sec.get("attributes", {}).get("slug", "")
                
                print(f"  Fetching: {sme_topic_name}/{sub_slug}...", end=" ", flush=True)
                
                content = get_sme_revision_note(token, sub_slug, sec_slug, sme_topic_slug)
                
                if content:
                    md = prose_to_markdown(content)
                    if md.strip():
                        # Add subtopic heading if multiple subtopics
                        if sub_name and len(sme_subtopics) > 1:
                            md = f"\n### {sub_name}\n\n{md}"
                        combined_content.append(md)
                        print(f"✅ ({len(md)} chars)")
                    else:
                        print("⚠️ empty content")
                else:
                    print("❌ no content")
                
                time.sleep(0.5)  # Rate limiting
            
            if combined_content:
                full_md = "\n\n".join(combined_content)
                
                # Save to notes table
                note_title = f"{matched_db_sub.get('display_name', sme_topic_name)}"
                result = save_note_to_db(
                    matched_db_sub["id"],
                    note_title,
                    full_md,
                    source="SaveMyExams"
                )
                
                if result == "201":
                    print(f"  ✅ Saved: '{note_title}' (subtopic_id={matched_db_sub['id'][:8]}...)")
                    total_saved += 1
                else:
                    print(f"  ⚠️  DB save returned {result}: '{note_title}'")
            else:
                print(f"  ⚠️  No content for {sme_topic_name}")
    
    print(f"\n=== Complete ===")
    print(f"  Saved: {total_saved}")
    print(f"  Skipped: {total_skipped}")


if __name__ == "__main__":
    main()
