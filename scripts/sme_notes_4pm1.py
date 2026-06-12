#!/usr/bin/env python3
"""
Extract SME revision notes for Edexcel IGCSE Further Pure Maths 4PM1.
Converts ProseMirror JSON to markdown (WITH equation SVGs as data URIs).
Saves to Supabase notes table grouped by DB subtopic.
"""

import json, re, html, time, os, sys, subprocess, base64, urllib.parse

# ── Config ──
SME_URL = "https://www.savemyexams.com"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_KEY = ""
SUBJECT_ID = "04164d42-c352-4f42-9659-620fbd154d70"

# SME notes base URL for 4PM1
NOTES_BASE = f"{SME_URL}/igcse/further-maths/edexcel/19/revision-notes"

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
    """Fetch DB subtopics for 4PM1 keyed by slug."""
    # Get all topics
    r = subprocess.run([
        "curl", "-s",
        f"{SUPABASE_URL}/rest/v1/topics?select=id,slug,name,sort_order&subject_id=eq.{SUBJECT_ID}&order=sort_order",
        "-H", f"apikey: {SERVICE_KEY}",
        "-H", f"Authorization: Bearer {SERVICE_KEY}"
    ], capture_output=True, text=True, timeout=15)
    topics = json.loads(r.stdout)
    
    db_subs = {}
    for t in topics:
        r2 = subprocess.run([
            "curl", "-s",
            f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name,topic_id&topic_id=eq.{t['id']}&order=sort_order",
            "-H", f"apikey: {SERVICE_KEY}",
            "-H", f"Authorization: Bearer {SERVICE_KEY}"
        ], capture_output=True, text=True, timeout=15)
        subs = json.loads(r2.stdout)
        for s in subs:
            db_subs[s["slug"]] = s
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
        "subject_id": SUBJECT_ID,
        "title": title,
        "content": content_md,
        "sort_order": 0
    })
    
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
    html = sme_get(f"{NOTES_BASE}/", token)
    nd = get_nextdata(html)
    pp = nd["props"]["pageProps"]
    sections = pp["sections"]
    topics = pp["topics"]
    subtopics = pp["subtopics"]
    
    print(f"  Sections: {len(sections)}, Topics: {len(topics)}, Note pages: {len(subtopics)}")
    
    # Build lookups
    sec_by_id = {s["id"]: s for s in sections}
    subs_by_topic = {}
    for s in subtopics:
        tid = s.get("relationships", {}).get("topic", {}).get("data", {}).get("id")
        if tid:
            subs_by_topic.setdefault(tid, []).append(s)
    
    # Get DB subtopics
    db_subs = get_db_subtopics()
    print(f"✅ Got {len(db_subs)} DB subtopics")
    
    saved, skipped, errors = 0, 0, 0
    
    for t in topics:
        sme_topic_name = t.get("attributes", {}).get("name", "")
        sme_topic_slug = t.get("attributes", {}).get("slug", "")
        
        # Map by slug (SME topic slug == DB subtopic slug for 4PM1)
        db_sub = db_subs.get(sme_topic_slug)
        if not db_sub:
            print(f"  ⚠️ No DB match for SME topic: {sme_topic_name} (slug: {sme_topic_slug})")
            skipped += 1
            continue
        
        # Get all SME subtopics under this topic
        sme_subtopics = subs_by_topic.get(t["id"], [])
        if not sme_subtopics:
            print(f"  ⚠️ No sub-notes for: {sme_topic_name}")
            skipped += 1
            continue
        
        # Get section
        sec = sec_by_id.get(t.get("relationships", {}).get("section", {}).get("data", {}).get("id"))
        sec_slug = sec.get("attributes", {}).get("slug", "") if sec else ""
        
        print(f"\n📁 {sme_topic_name} → {db_sub['display_name']} ({len(sme_subtopics)} sub-notes)")
        
        # Fetch each SME subtopic's revision note and merge
        all_md = []
        for sme_sub in sme_subtopics:
            sub_slug = sme_sub.get("attributes", {}).get("slug", "")
            sub_name = sme_sub.get("attributes", {}).get("name", "")
            
            url = f"{NOTES_BASE}/{sec_slug}/{sme_topic_slug}/{sub_slug}/"
            page_html = sme_get(url, token)
            nd2 = get_nextdata(page_html)
            if not nd2:
                print(f"    ⚠️ No data for {sub_slug}")
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
                print(f"    ✅ {sub_name} ({len(md)} chars)")
            else:
                print(f"    ⚠️ Empty content for {sub_name}")
            
            time.sleep(0.3)
        
        if not all_md:
            print(f"  ⚠️ No content extracted")
            skipped += 1
            continue
        
        full_md = "\n\n".join(all_md)
        title = db_sub["display_name"]
        
        # Save
        result = save_note(db_sub["id"], title, full_md, topic_id=db_sub.get("topic_id"))
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
