#!/usr/bin/env python3
"""Generate PDFs from Tutopiya Economics notes and upload to R2 + insert DB records."""

import os, re, json, requests
from weasyprint import HTML

# ── Config ──
R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = ""
R2_BUCKET = "past-papers"
R2_PREFIX = "igcse/economics/edexcel/sme-notes/tutopiya"

MGMT_TOKEN = ""
PROJECT_REF = "aondldqwwvttwpervrfq"
SUBJECT_ID = "9acca9c0-2e35-4665-b4fa-7e0bb41be518"  # edexcel-economics-4ec1

# DB subtopic IDs mapped by Tutopiya entry key
SUBTOPIC_MAP = {
    "The Market System → The Economic Problem": "3488f3bf-a0ff-4be6-a7ca-c4b0af8e766c",
    "The Market System → Economic Assumptions": "466be9a9-13d2-455b-8f1f-8de31fc5a38c",
    "The Market System → Demand, Supply and Market Equilibrium": "4c126c95-5ac0-4013-84da-7c2bd100cf20",
    "The Market System → Elasticity": "7656ba54-99b2-4b00-a341-0edf00251ccf",
    "The Market System → The Mixed Economy": "252aa35a-472f-4cea-af0b-dcebe96f2990",
    "The Market System → Externalities": "ea368d62-e7a1-46a9-982d-35804e1cdde5",
    "Business Economics → Production": "0b497ee9-c38b-4534-9f1c-7503357fa1d0",
    "Business Economics → Productivity and Division of Labour": "0b497ee9-c38b-4534-9f1c-7503357fa1d0",
    "Business Economics → Business Costs, Revenues and Profit": "45aa44b9-c239-49aa-b60c-6ed20acb2c1f",
    "Business Economics → Business Competition": "aa68b1e8-24a2-41c0-bf59-c08c284538c8",
    "Business Economics → The Labour Market": "8e075ac2-a495-4104-bb13-624ce510d4f3",
    "Business Economics → Government Intervention": "b5c2022a-3440-4a01-a4ca-1384361e3ff7",
    "Government And The Economy → Macroeconomic Objectives - Part 1": "907f05ec-4a95-4e50-ad5c-c21a71445fa4",
    "Government And The Economy → Macroeconomic Objectives - Part 2": "907f05ec-4a95-4e50-ad5c-c21a71445fa4",
    "Government And The Economy → Government Policies": "b4f93e49-120c-4dbf-baec-7a50bccc0a86",
    "Government And The Economy → Relationship between Objectives and Policies": "907f05ec-4a95-4e50-ad5c-c21a71445fa4",
    "The Global Economy → Globalisation": "e753bab0-cc49-47fe-9fa7-0b0670f39388",
    "The Global Economy → International Trade": "672d12af-37db-4f1b-bb89-bf24b4106441",
    "The Global Economy → Exchange Rates": "559a9360-a308-44b8-b8d5-cd1d3acbe7c9",
}

MGMT_HEADERS = {"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"}
MGMT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def slugify(s):
    """Convert string to lowercase slug."""
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s

def text_to_html(title, body):
    """Convert plain text note body to styled HTML."""
    # Escape HTML
    body = body.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Preserve line breaks
    body = body.replace('\n\n', '</p><p>')
    body = body.replace('\n', '<br>')
    # Bold key terms: words in ALL CAPS that are standalone
    body = re.sub(r'\b([A-Z][A-Z\s]{2,}[A-Z])\b', r'<strong>\1</strong>', body)
    
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
  p {{
    margin: 6px 0;
    text-align: justify;
  }}
  .header {{
    margin-bottom: 24px;
  }}
  .header .subject {{
    font-size: 10pt;
    color: #666;
  }}
  .header .code {{
    font-size: 10pt;
    color: #888;
  }}
  strong {{
    color: #001C71;
  }}
  .footer {{
    margin-top: 30px;
    font-size: 9pt;
    color: #999;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }}
</style>
</head>
<body>
<div class="header">
  <span class="subject">Pearson Edexcel IGCSE Economics 4EC1</span><br>
  <span class="code">Tutopiya Revision Notes</span>
</div>
<h1>{title}</h1>
<p>{body}</p>
<div class="footer">Source: Tutopiya.com — Pearson Edexcel IGCSE Economics 4EC1 (2026 onwards syllabus)</div>
</body>
</html>"""
    return html


def main():
    # Parse input file
    input_path = os.path.expanduser("~/.hermes/cache/documents/doc_6364d33f79a6_tutopiya_4EC1_all_notes.txt")
    with open(input_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Split by headers
    sections = re.split(r'^=== (.+?) ===\n', text, flags=re.MULTILINE)[1:]
    entries = []
    for i in range(0, len(sections), 2):
        key = sections[i].strip()
        body = sections[i+1].strip()
        entries.append((key, body))
    
    print(f"Parsed {len(entries)} entries from Tutopiya file")
    
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
    
    for key, body in entries:
        if key not in SUBTOPIC_MAP:
            print(f"⚠️  No DB mapping for: {key} — skipping")
            continue
        
        subtopic_id = SUBTOPIC_MAP[key]
        
        # Title: extract subtopic name from key
        subtopic_name = key.split(" → ")[1]
        title = f"Tutopiya Revision Notes: {subtopic_name}"
        slug = slugify(subtopic_name)
        
        # Check if this is a duplicate slug (e.g., "production" and "productivity" both in "Production & Productivity")
        # Use key as differentiator
        key_slug = slugify(key.replace(" → ", "-"))
        
        r2_key = f"{R2_PREFIX}/{key_slug}.pdf"
        
        # Generate HTML → PDF
        html_content = text_to_html(title, body)
        pdf_path = f"/tmp/tutopiya_{key_slug}.pdf"
        
        try:
            HTML(string=html_content).write_pdf(pdf_path)
            pdf_size = os.path.getsize(pdf_path)
            print(f"✅  Generated PDF: {title} ({pdf_size/1024:.0f}KB)")
        except Exception as e:
            print(f"❌  PDF generation failed for {title}: {e}")
            continue
        
        # Upload to R2
        try:
            with open(pdf_path, 'rb') as f:
                r2.put_object(
                    Bucket=R2_BUCKET,
                    Key=r2_key,
                    Body=f,
                    ContentType='application/pdf',
                )
            print(f"  → Uploaded to R2: {r2_key}")
        except Exception as e:
            print(f"❌  R2 upload failed for {title}: {e}")
            continue
        
        # Insert DB record
        file_url = f"r2://past-papers/{r2_key}"
        sql = f"""INSERT INTO notes (subtopic_id, subject_id, title, content, file_url, sort_order, source)
VALUES ('{subtopic_id}', '{SUBJECT_ID}', '{title.replace("'", "''")}', '', '{file_url}', 0, 'Tutopiya')
RETURNING id;"""
        
        try:
            resp = requests.post(MGMT_URL, headers=MGMT_HEADERS, json={"query": sql}, timeout=15)
            if resp.status_code == 201:
                data = resp.json()
                note_id = data[0]['id'] if isinstance(data, list) and data else 'unknown'
                print(f"  → DB inserted: id={note_id}")
                results.append({"key": key, "title": title, "note_id": note_id, "r2_key": r2_key, "pdf_size": pdf_size})
            else:
                print(f"❌  DB insert failed: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            print(f"❌  DB insert error: {e}")
        
        # Cleanup
        os.remove(pdf_path)
    
    print(f"\n=== Summary ===")
    print(f"Success: {len(results)}/{len(entries)} notes created")
    if results:
        print(f"Total PDF size: {sum(r['pdf_size'] for r in results)/1024:.0f}KB")


if __name__ == "__main__":
    main()
