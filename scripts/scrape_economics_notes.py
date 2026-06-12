#!/usr/bin/env python3
"""
Extract SME revision notes for Edexcel Economics 4EC1.
SME subtopics are more granular (85) than DB subtopics (16).
Each DB subtopic maps to 2-12 SME subtopics.
Merges all SME subtopic notes under one topic into one PDF per DB subtopic.

URL: /igcse/economics/edexcel/17/revision-notes/{section-slug}/{topic-slug}/{sme-subtopic-slug}/
"""
import json, re, html, time, os, sys, subprocess, base64, urllib.parse

import os

# ── Config ──
SME_URL = "https://www.savemyexams.com"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://aondldqwwvttwpervrfq.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUBJECT_ID = "9acca9c0-2e35-4665-b4fa-7e0bb41be518"

R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = ""
R2_BUCKET = "past-papers"
R2_NOTES_PATH = "igcse/economics/edexcel/sme-notes"

MGMT_TOKEN = os.environ.get("SUPABASE_MGMT_TOKEN", "")
PROJECT_REF = "aondldqwwvttwpervrfq"
MGMT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
MGMT_H = {"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"}

# ── Helpers ──
def login():
    print("Logging into SME...", file=sys.stderr)
    r = subprocess.run([
        "curl", "-sv", "-X", "POST",
        f"{SME_URL}/api/auth/v1/supertokens/signin/",
        "-H", "Content-Type: application/json",
SME_EMAIL = os.environ.get("SME_EMAIL", "inspiringchermann@vmail.dev")
SME_PASSWORD = os.environ.get("SME_PASSWORD", "WXVm8Chqq2")
        ]})
    ], capture_output=True, text=True, timeout=20)
    m = re.search(r'st-access-token:\s*(\S+)', r.stderr)
    if not m:
        raise Exception("Login failed")
    print("  ✓ Logged in", file=sys.stderr)
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

def prose_to_md(nodes, heading_level=2):
    """Convert ProseMirror content array to markdown text."""
    parts = []
    for node in nodes or []:
        t = node.get("type")
        if t == "text":
            text = node.get("text", "")
            for mark in node.get("marks", []):
                mt = mark.get("type")
                if mt == "bold": text = f"**{text}**"
                elif mt == "italic": text = f"*{text}*"
                elif mt == "underline": text = f"<u>{text}</u>"
                elif mt == "code": text = f"`{text}`"
            parts.append(text)
        elif t == "hardBreak":
            parts.append("\n")
        elif t == "paragraph":
            inner = prose_to_md(node.get("content", [])).strip()
            if inner:
                parts.append(inner + "\n\n")
        elif t == "heading":
            level = node.get("attrs", {}).get("level", heading_level)
            inner = prose_to_md(node.get("content", [])).strip()
            if inner:
                parts.append(f"{'#' * level} {inner}\n\n")
        elif t == "bulletList":
            for item in node.get("content", []):
                if item.get("type") == "listItem":
                    inner = prose_to_md(item.get("content", [])).strip()
                    parts.append(f"* {inner}\n")
            parts.append("\n")
        elif t == "orderedList":
            for i, item in enumerate(node.get("content", [])):
                if item.get("type") == "listItem":
                    inner = prose_to_md(item.get("content", [])).strip()
                    parts.append(f"{i+1}. {inner}\n")
            parts.append("\n")
        elif t == "callout":
            inner = prose_to_md(node.get("content", [])).strip()
            if inner:
                parts.append(f"> {inner}\n\n")
        elif t == "image":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src and not src.startswith("data:"):
                parts.append(f"![{alt}]({src})\n\n")
        elif t == "specPoint":
            # The main content container for Economics notes
            inner = prose_to_md(node.get("content", []), heading_level=3)
            if inner:
                parts.append(inner + "\n")
        elif "content" in node:
            parts.append(prose_to_md(node.get("content", []), heading_level))
    return "".join(parts)

# ── Main ──
print("=== Economics 4EC1 Notes Extractor ===", file=sys.stderr)

token = login()

# 1. Fetch listing page to get SME subtopic structure
print("Fetching SME notes listing...", file=sys.stderr)
html = sme_get(f"{SME_URL}/igcse/economics/edexcel/17/revision-notes/", token)
nd = get_nextdata(html)
if not nd:
    print("✗ Failed to load listing page", file=sys.stderr)
    sys.exit(1)

pp = nd["props"]["pageProps"]
topics_data = pp["topics"]
subs_data = pp["subtopics"]

# Build topic slug → topic id mapping
topic_slug_to_id = {}
for t in topics_data:
    attrs = t.get("attributes", {})
    topic_slug_to_id[t["id"]] = attrs.get("slug")

# Build topic id → section slug
topic_to_section = {}
for t in topics_data:
    rels = t.get("relationships", {})
    sec_id = rels.get("section", {}).get("data", {}).get("id")
    if sec_id:
        for s in pp["sections"]:
            if s["id"] == sec_id:
                topic_to_section[t["id"]] = s["attributes"]["slug"]
                break

# Build topic id → SME subtopics list
topic_to_subs = {}
for s in subs_data:
    attrs = s.get("attributes", {})
    rels = s.get("relationships", {})
    topic_id = rels.get("topic", {}).get("data", {}).get("id")
    if topic_id:
        topic_to_subs.setdefault(topic_id, []).append(attrs)

# Only process our 16 content topics (skip exam skills)
CONTENT_TOPICS = {
    "the-economic-problem", "economic-assumptions", "demand-supply-and-market-equilibrium",
    "elasticity", "the-mixed-economy", "externalities",
    "production-and-productivity", "business-costs-revenues-and-profit",
    "market-structures", "the-labour-market", "government-intervention",
    "the-macroeconomic-objectives", "government-policies",
    "globalisation", "international-trade", "exchange-rates",
}

# Get DB subtopics for mapping
db_topics_r = subprocess.run([
    "curl", "-s", f"{SUPABASE_URL}/rest/v1/topics?select=id,slug,name,sort_order&subject_id=eq.{SUBJECT_ID}&order=sort_order",
    "-H", f"apikey: {SERVICE_KEY}",
    "-H", f"Authorization: Bearer {SERVICE_KEY}"
], capture_output=True, text=True, timeout=15)
db_topics = json.loads(db_topics_r.stdout)

print("Fetching DB subtopics...", file=sys.stderr)
db_sub_by_short = {}
for t in db_topics:
    tid = t["id"]
    r2 = subprocess.run([
        "curl", "-s", f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name,sort_order,topic_id&topic_id=eq.{tid}&order=sort_order",
        "-H", f"apikey: {SERVICE_KEY}",
        "-H", f"Authorization: Bearer {SERVICE_KEY}"
    ], capture_output=True, text=True, timeout=15)
    subs = json.loads(r2.stdout)
    for s in subs:
        short = s["slug"].replace("edexcel-economics-4ec1-", "")
        db_sub_by_short[short] = {"id": s["id"], "topic_id": tid, "display_name": s["display_name"]}

# Import for R2
import boto3
s3 = boto3.client("s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    region_name="auto",
)

success = 0
failed = []
note_records = []

# For each DB subtopic (short slug), find matching SME topics and fetch all subtopic notes
for db_short_slug, db_info in db_sub_by_short.items():
    if db_short_slug not in CONTENT_TOPICS:
        continue

    print(f"\n--- {db_short_slug} ({db_info['display_name']}) ---", file=sys.stderr)

    # Find SME topic with matching slug
    sme_topic_id = None
    for tid, slug in topic_slug_to_id.items():
        if slug == db_short_slug:
            sme_topic_id = tid
            break

    if not sme_topic_id:
        print(f"  ✗ No matching SME topic", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    # Get SME subtopics for this topic
    sme_subtopics = topic_to_subs.get(sme_topic_id, [])
    if not sme_subtopics:
        print(f"  ✗ No SME subtopics", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    section_slug = topic_to_section.get(sme_topic_id, "")
    if not section_slug:
        print(f"  ✗ No section slug", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    # Fetch all SME subtopic revision note pages and merge content
    all_md_parts = []
    for st in sme_subtopics:
        st_slug = st["slug"]
        st_name = st["name"]
        url = f"{SME_URL}/igcse/economics/edexcel/17/revision-notes/{section_slug}/{db_short_slug}/{st_slug}/"
        print(f"  Fetching {st_slug}...", file=sys.stderr)

        html_content = sme_get(url, token)
        nd = get_nextdata(html_content)
        if not nd:
            print(f"    ✗ No __NEXT_DATA__", file=sys.stderr)
            continue

        rn = nd.get("props", {}).get("pageProps", {}).get("revisionNote")
        if not rn:
            continue

        content_nodes = rn.get("attributes", {}).get("content", [])
        if not content_nodes:
            continue

        # Convert to markdown
        md_text = prose_to_md(content_nodes).strip()
        if md_text:
            # Add subtopic heading
            all_md_parts.append(f"## {st_name}\n\n{md_text}")

        time.sleep(0.3)

    if not all_md_parts:
        print(f"  ✗ No content fetched", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    # Merge into one document
    full_md = "\n\n---\n\n".join(all_md_parts)
    display_name = db_info["display_name"]

    # Convert to HTML
    from markdown import markdown as md_convert
    html_body = md_convert(full_md, extensions=["extra", "smarty"])

    full_html = f"""<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
  body {{ font-family: 'Noto Sans', 'Segoe UI', Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #333; padding: 20px; max-width: 800px; margin: 0 auto; }}
  h2 {{ font-size: 18pt; color: #001C71; border-bottom: 2px solid #001C71; padding-bottom: 6px; margin-top: 28px; }}
  h3 {{ font-size: 14pt; color: #001C71; margin-top: 20px; }}
  h4 {{ font-size: 12pt; color: #333; font-weight: bold; }}
  p {{ margin: 8px 0; }}
  ul, ol {{ margin: 8px 0; padding-left: 24px; }}
  li {{ margin: 2px 0; }}
  table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
  th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
  th {{ background: #f5f5f5; font-weight: bold; }}
  blockquote {{ border-left: 4px solid #001C71; margin: 12px 0; padding: 8px 16px; background: #f9f9f9; }}
  img {{ max-width: 100%; height: auto; }}
  code {{ background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 11pt; }}
</style>
</head><body>
<h1>{display_name}</h1>
{html_body}
</body></html>"""

    # Generate PDF
    pdf_path = f"/tmp/notes_economics_{db_short_slug}.pdf"
    try:
        from weasyprint import HTML
        HTML(string=full_html).write_pdf(pdf_path)
    except Exception as e:
        print(f"  ✗ PDF failed: {e}", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    pdf_size = os.path.getsize(pdf_path)
    if pdf_size < 100:
        print(f"  ✗ PDF too small ({pdf_size} bytes)", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    # Upload to R2
    r2_key = f"{R2_NOTES_PATH}/{db_short_slug}.pdf"
    try:
        with open(pdf_path, "rb") as f:
            s3.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=f, ContentType="application/pdf")
    except Exception as e:
        print(f"  ✗ R2 upload failed: {e}", file=sys.stderr)
        failed.append(db_short_slug)
        continue

    os.remove(pdf_path)

    note_records.append({
        "subtopic_id": db_info["id"],
        "topic_id": db_info["topic_id"],
        "title": f"Revision Notes: {display_name}",
        "file_url": f"r2://past-papers/{r2_key}",
    })

    print(f"  ✓ {pdf_size/1024:.0f}KB PDF uploaded", file=sys.stderr)
    success += 1

print(f"\nDone: {success} notes, {len(failed)} failed", file=sys.stderr)
if failed:
    print(f"Failed: {failed}", file=sys.stderr)

# Insert into DB
if note_records:
    print(f"\nInserting {len(note_records)} notes into DB...", file=sys.stderr)
    subprocess.run([
        "curl", "-s", "-X", "POST", MGMT_URL,
        "-H", f"Authorization: Bearer {MGMT_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": f"DELETE FROM notes WHERE subject_id = '{SUBJECT_ID}';"})
    ], capture_output=True, text=True, timeout=15)

    for i in range(0, len(note_records), 10):
        batch = note_records[i:i+10]
        rows = []
        for nr in batch:
            sub_id = f"'{nr['subtopic_id']}'" if nr['subtopic_id'] else "null"
            top_id = f"'{nr['topic_id']}'" if nr['topic_id'] else "null"
            title = nr['title'].replace("'", "''")
            file_url = nr['file_url'].replace("'", "''")
            rows.append(f"('{SUBJECT_ID}',{top_id},{sub_id},'{title}','{file_url}','',0)")
        sql = f"INSERT INTO notes (subject_id, topic_id, subtopic_id, title, file_url, content, sort_order) VALUES {','.join(rows)};"
        r = subprocess.run([
            "curl", "-s", "-X", "POST", MGMT_URL,
            "-H", f"Authorization: Bearer {MGMT_TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"query": sql})
        ], capture_output=True, text=True, timeout=30)

    print(f"  ✓ {len(note_records)} notes inserted", file=sys.stderr)

print("\n=== Done! ===", file=sys.stderr)
