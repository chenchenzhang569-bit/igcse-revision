#!/usr/bin/env python3
"""Re-generate Tutopiya Economics PDFs from full HTML (with SVGs)."""

import os, re, json, requests
from weasyprint import HTML

R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = ""
R2_BUCKET = "past-papers"
R2_PREFIX = "igcse/economics/edexcel/sme-notes/tutopiya"

MGMT_TOKEN = ""
MGMT_URL = "https://api.supabase.com/v1/projects/aondldqwwvttwpervrfq/database/query"
SUBJECT_ID = "9acca9c0-2e35-4665-b4fa-7e0bb41be518"

MGMT_HEADERS = {"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"}

# DB subtopic IDs
SUBTOPIC_MAP = {
    "The Economic Problem": "3488f3bf-a0ff-4be6-a7ca-c4b0af8e766c",
    "Economic Assumptions": "466be9a9-13d2-455b-8f1f-8de31fc5a38c",
    "Demand, Supply and Market Equilibrium": "4c126c95-5ac0-4013-84da-7c2bd100cf20",
    "Elasticity": "7656ba54-99b2-4b00-a341-0edf00251ccf",
    "The Mixed Economy": "252aa35a-472f-4cea-af0b-dcebe96f2990",
    "Externalities": "ea368d62-e7a1-46a9-982d-35804e1cdde5",
    "Production": "0b497ee9-c38b-4534-9f1c-7503357fa1d0",
    "Productivity and Division of Labour": "0b497ee9-c38b-4534-9f1c-7503357fa1d0",
    "Business Costs, Revenues and Profit": "45aa44b9-c239-49aa-b60c-6ed20acb2c1f",
    "Business Competition": "aa68b1e8-24a2-41c0-bf59-c08c284538c8",
    "The Labour Market": "8e075ac2-a495-4104-bb13-624ce510d4f3",
    "Government Intervention": "b5c2022a-3440-4a01-a4ca-1384361e3ff7",
    "Macroeconomic Objectives - Part 1": "907f05ec-4a95-4e50-ad5c-c21a71445fa4",
    "Macroeconomic Objectives - Part 2": "907f05ec-4a95-4e50-ad5c-c21a71445fa4",
    "Government Policies": "b4f93e49-120c-4dbf-baec-7a50bccc0a86",
    "Relationship between Objectives and Policies": "907f05ec-4a95-4e50-ad5c-c21a71445fa4",
    "Globalisation": "e753bab0-cc49-47fe-9fa7-0b0670f39388",
    "International Trade": "672d12af-37db-4f1b-bb89-bf24b4106441",
    "Exchange Rates": "559a9360-a308-44b8-b8d5-cd1d3acbe7c9",
}

def slugify(s):
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def extract_content(html, subtopic_name):
    """Extract the article/section content from a full page HTML."""
    # Find JSON-LD article
    article = None
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(m.group(1))
            if data.get('@type') == 'Article':
                article = data
        except:
            pass
    
    # Find the main content area
    # Look for the study notes container
    content_html = ""
    
    # Method 1: Find by JSON-LD headline
    headline = article.get('headline', subtopic_name) if article else subtopic_name
    
    # Method 2: Extract from rendered HTML - look for the content div
    # The page has a very specific structure with article content
    
    # Look for the article section in the HTML (after breadcrumb, before FAQ)
    # Find the content between the header and footer
    body_start = html.find('class="bg-white rounded-3xl')
    if body_start == -1:
        # Alternative: look for the main content
        body_start = html.find('scarcity') if 'scarcity' in html.lower() else -1
    
    if body_start > 0:
        # Try to find a reasonable content block
        # Look for the wrapper div
        start = html.rfind('<div', 0, body_start)
        if start == -1:
            start = body_start
        
        # Find where the FAQ/main content ends - look for FAQPage
        faq_idx = html.find('"@type":"FAQPage"')
        end = faq_idx if faq_idx > 0 else html.find('Start revising', start)
        if end == -1:
            end = html.find('</main', start)
        if end == -1:
            end = len(html)
        
        content_html = html[start:end]
    else:
        # Fallback: use JSON-LD articleBody
        if article and article.get('articleBody'):
            body = article['articleBody']
            body = body.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            body = body.replace('\n\n', '</p><p>').replace('\n', '<br>')
            content_html = f'<p>{body}</p>'
    
    return content_html, headline

def build_pdf_html(content_html, title, subtopic_name):
    """Wrap content in a styled HTML for PDF generation."""
    
    # Inline SVGs are carried through from the source HTML
    # We just need to clean up any Next.js-specific attributes
    
    # Remove script tags
    content_html = re.sub(r'<script[^>]*>.*?</script>', '', content_html, flags=re.DOTALL)
    # Remove style tags (we'll provide our own)
    content_html = re.sub(r'<style[^>]*>.*?</style>', '', content_html, flags=re.DOTALL)
    # Remove Next.js specific attributes
    content_html = re.sub(r' data-[a-z]+="[^"]*"', '', content_html)
    # Remove empty divs/spans
    content_html = re.sub(r'<div[^>]*>\s*</div>', '', content_html)
    content_html = re.sub(r'<span[^>]*>\s*</span>', '', content_html)
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {{
    margin: 2cm 2.5cm;
    @top-center {{
      content: "{title}";
      font-size: 10px;
      color: #888;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }}
  }}
  body {{
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
  }}
  h1 {{
    font-size: 18pt;
    color: #001C71;
    border-bottom: 2px solid #001C71;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }}
  h2 {{
    font-size: 14pt;
    color: #001C71;
    margin-top: 20px;
    margin-bottom: 8px;
  }}
  h3 {{
    font-size: 12pt;
    color: #333;
    margin-top: 16px;
    margin-bottom: 6px;
  }}
  p {{ margin: 6px 0; text-align: justify; }}
  .header {{
    margin-bottom: 24px;
  }}
  .header .subject {{ font-size: 10pt; color: #666; }}
  .header .code {{ font-size: 10pt; color: #888; }}
  svg {{ max-width: 100%; height: auto; margin: 1rem 0; }}
  .footer {{
    margin-top: 30px;
    font-size: 9pt;
    color: #999;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 10pt;
  }}
  th, td {{
    border: 1px solid #ccc;
    padding: 6px 10px;
    text-align: left;
  }}
  th {{
    background: #f0f4f8;
    font-weight: bold;
  }}
  .callout {{
    background: #f0f7ff;
    border-left: 4px solid #001C71;
    padding: 12px 16px;
    margin: 1rem 0;
    border-radius: 4px;
  }}
</style>
</head>
<body>
<div class="header">
  <span class="subject">Pearson Edexcel IGCSE Economics 4EC1</span><br>
  <span class="code">Tutopiya Revision Notes</span>
</div>
<h1>{subtopic_name}</h1>
{content_html}
<div class="footer">Source: Tutopiya.com — Pearson Edexcel IGCSE Economics 4EC1 (2026 onwards syllabus)</div>
</body>
</html>"""
    return html


def main():
    # Read the full HTML
    input_path = os.path.expanduser("~/.hermes/cache/documents/doc_117ca338f2a1_tutopiya_all_pages.html")
    with open(input_path, 'r', encoding='utf-8') as f:
        full = f.read()
    
    # Split by page markers
    sections = re.split(r'<!-- PAGE: (.+?) -->\n', full)[1:]
    
    entries = []
    for i in range(0, len(sections), 2):
        key = sections[i].strip()
        html = sections[i+1].strip()
        # Parse topic and subtopic
        m = re.match(r'(.+?) → (.+)', key)
        if m:
            topic = m.group(1).strip()
            subtopic = m.group(2).strip()
            entries.append((topic, subtopic, html))
    
    print(f"Parsed {len(entries)} page sections")
    for t, s, _ in entries:
        print(f"  {t} → {s}")
    
    # Setup R2
    import boto3
    r2 = boto3.client(
        's3',
        endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name='auto'
    )
    
    results = []
    
    for topic, subtopic, html in entries:
        if subtopic not in SUBTOPIC_MAP:
            print(f"⚠️  No DB mapping: {subtopic}")
            continue
        
        subtopic_id = SUBTOPIC_MAP[subtopic]
        title = f"Tutopiya Revision Notes: {subtopic}"
        key_slug = slugify(f"{topic}-{subtopic}")
        
        # Extract content
        content_html, headline = extract_content(html, subtopic)
        
        if not content_html or len(content_html.strip()) < 100:
            print(f"⚠️  Sparse content for {subtopic} ({len(content_html)}ch), falling back to text")
            # Fallback to JSON-LD articleBody
            for m in re.finditer(r'"articleBody":"([^"]+)"', html):
                body = m.group(1)
                body = body.replace('\\n', '\n').replace('\\', '')
                body = body.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                body = body.replace('\n\n', '</p><p>').replace('\n', '<br>')
                content_html = f'<p>{body}</p>'
                break
        
        # Build PDF HTML
        pdf_html = build_pdf_html(content_html, title, subtopic)
        
        # Generate PDF
        pdf_path = f"/tmp/tutopiya_{key_slug}.pdf"
        try:
            HTML(string=pdf_html).write_pdf(pdf_path)
            pdf_size = os.path.getsize(pdf_path)
            print(f"✅  PDF: {subtopic} ({pdf_size/1024:.0f}KB)")
        except Exception as e:
            print(f"❌  PDF failed: {subtopic}: {e}")
            continue
        
        # Upload to R2
        r2_key = f"{R2_PREFIX}/{key_slug}.pdf"
        try:
            with open(pdf_path, 'rb') as f:
                r2.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=f, ContentType='application/pdf')
            print(f"  → R2: {r2_key}")
        except Exception as e:
            print(f"❌  R2 upload: {e}")
            continue
        
        # Delete old Tutopiya note record and re-insert
        file_url = f"r2://past-papers/{r2_key}"
        old_title_escaped = f"Tutopiya Revision Notes: {subtopic}".replace("'", "''")
        
        # Delete old record with same title
        del_sql = f"DELETE FROM notes WHERE subject_id = '{SUBJECT_ID}' AND subtopic_id = '{subtopic_id}' AND title = '{old_title_escaped}';"
        ins_sql = f"INSERT INTO notes (subtopic_id, subject_id, title, content, file_url, sort_order) VALUES ('{subtopic_id}', '{SUBJECT_ID}', '{old_title_escaped}', '', '{file_url}', 0);"
        
        try:
            requests.post(MGMT_URL, headers=MGMT_HEADERS, json={"query": del_sql}, timeout=15)
            resp = requests.post(MGMT_URL, headers=MGMT_HEADERS, json={"query": ins_sql}, timeout=15)
            if resp.status_code == 201:
                print(f"  → DB updated")
                results.append(subtopic)
            else:
                print(f"❌  DB: {resp.status_code} {resp.text[:100]}")
        except Exception as e:
            print(f"❌  DB error: {e}")
        
        os.remove(pdf_path)
    
    print(f"\n=== Done: {len(results)}/{len(entries)} ===")


if __name__ == "__main__":
    main()
