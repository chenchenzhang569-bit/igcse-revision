#!/usr/bin/env python3
"""
Convert 4PM1 SME notes (markdown) to PDF via weasyprint.
Upload to R2 + update notes table file_url.
"""
import json, re, subprocess, os, sys, html as html_mod, urllib.parse, base64

SUBJECT_ID = "04164d42-c352-4f42-9659-620fbd154d70"
PROJECT_REF = "aondldqwwvttwpervrfq"
R2_BUCKET = "past-papers"
R2_PREFIX = "igcse/maths/edexcel/sme-notes/4pm1"
MGMT_TOKEN = ""
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_KEY = ""

def get_notes():
    r = subprocess.run(["curl", "-s",
        f"{SUPABASE_URL}/rest/v1/notes?select=id,title,content,subtopic_id,topic_id&subject_id=eq.{SUBJECT_ID}&order=sort_order",
        "-H", f"apikey: {SERVICE_KEY}", "-H", f"Authorization: Bearer {SERVICE_KEY}"
    ], capture_output=True, text=True, timeout=30)
    return json.loads(r.stdout)

def clean_svg_data_uri(md_text):
    """Clean SVG data URIs in markdown — extract clean SVG, remove trailing font garbage.
    Uses greedy .*) to handle ) inside CSS url(data:font/truetype...)."""
    def _fix_svg(m):
        alt = m.group(1)
        full_src = m.group(2)  # from ]( to the LAST ) on line (inclusive)
        # Strip the trailing ) that closes markdown syntax
        src = full_src[:-1] if full_src.endswith(')') else full_src
        if not src.startswith('data:image/svg+xml'):
            return m.group(0)
        decoded = urllib.parse.unquote(src)
        svg_start = decoded.find('<svg')
        if svg_start < 0:
            return m.group(0)
        xml = decoded[svg_start:]
        svg_end = xml.find('</svg>')
        if svg_end >= 0:
            xml = xml[:svg_end + 6]
        else:
            xml = xml.rstrip() + '</svg>'
        # Strip @font-face blocks — they contain ) which breaks markdown URL syntax
        xml = re.sub(r'@font-face\s*\{[^}]*\}', '', xml)
        clean_src = 'data:image/svg+xml;charset=utf8,' + urllib.parse.quote(xml, safe='')
        return f'![{alt}]({clean_src})'
    # Use greedy .*) to match to LAST ) on the line (handles ) inside CSS url(...))
    return re.sub(r'!\[([^\]]*)\]\((.*)\)', _fix_svg, md_text)

def svg_to_png_in_html(html_str):
    """Convert SVG data URIs in HTML to base64 PNG images."""
    import cairosvg, base64
    from lxml import etree
    def _replace(m):
        src = m.group(1)
        alt = m.group(2)
        if not src.startswith('data:image/svg+xml'):
            return m.group(0)
        decoded = urllib.parse.unquote(src)
        svg_start = decoded.find('<svg')
        if svg_start < 0:
            return m.group(0)
        svg_xml = decoded[svg_start:]
        svg_end = svg_xml.find('</svg>')
        if svg_end >= 0:
            svg_xml = svg_xml[:svg_end + 6]
        else:
            svg_xml = svg_xml.rstrip() + '</svg>'
        parser = etree.XMLParser(recover=True)
        try:
            root = etree.fromstring(svg_xml.encode('utf-8'), parser)
            clean_svg = etree.tostring(root, encoding='unicode')
        except Exception:
            clean_svg = svg_xml
        clean_svg = re.sub(r'@font-face\s*\{[^}]*\}', '', clean_svg)
        try:
            png_data = cairosvg.svg2png(bytestring=clean_svg.encode('utf-8'))
            b64 = base64.b64encode(png_data).decode('ascii')
            return f'<img src="data:image/png;base64,{b64}" alt="{alt}" style="max-width:100%;height:auto;display:inline-block;vertical-align:middle;">'
        except Exception as e:
            print(f'  ⚠️ SVG render failed: {e}', file=sys.stderr)
            return f'<span style="font-family:serif;font-style:italic;">{alt}</span>'
    return re.sub(
        r'<img\s+src="([^"]*data:image/svg\+xml[^"]*)"\s+alt="([^"]*)"[^>]*>',
        _replace, html_str
    )

def note_to_html(md_text):
    """Convert markdown note to full HTML page for weasyprint."""
    # Step 1: Clean SVG data URIs in markdown (remove trailing font garbage)
    md = clean_svg_data_uri(md_text)
    # Step 2: Markdown images → HTML img tags
    md = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" style="max-width:100%;height:auto;display:inline-block;vertical-align:middle;">', md)
    # Step 3: Markdown → HTML
    r = subprocess.run(["python3", "-c", "import markdown,sys; print(markdown.markdown(sys.stdin.read(),extensions=['extra']))"],
        input=md, capture_output=True, text=True, timeout=60)
    body = r.stdout
    # Step 4: Convert SVG data URIs to PNG
    body = svg_to_png_in_html(body)
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<style>
@page {{ margin: 2cm; size: A4; }}
body {{ font-family:'DejaVu Serif',serif; font-size:11pt; line-height:1.6; color:#222; }}
h2 {{ color:#001C71; margin-top:1.5em; font-size:16pt; }}
h3 {{ margin-top:1em; font-size:13pt; }}
p {{ margin:0.4em 0; }}
img {{ max-width:100%; height:auto; }}
table {{ border-collapse:collapse; width:100%; margin:0.5em 0; }}
th,td {{ border:1px solid #bbb; padding:4px; }}
th {{ background:#f0f0f0; }}
ul,ol {{ margin:0.5em 0; padding-left:2em; }}
code {{ background:#f5f5f5; padding:2px 4px; font-size:10pt; }}
blockquote {{ border-left:3px solid #001C71; padding-left:1em; color:#555; }}
</style></head><body>{body}</body></html>"""

def main():
    notes = get_notes()
    print(f"✅ {len(notes)} notes loaded")
    os.makedirs("/tmp/4pm1_pdfs", exist_ok=True)
    
    import boto3
    r2 = boto3.client("s3",
        endpoint_url="https://7524670a3d7d50fd979765dedb5b378d.r2.cloudflarestorage.com",
        aws_access_key_id="",
        aws_secret_access_key="",
        region_name="auto")
    
    for i, note in enumerate(notes):
        title = note["title"]
        content = note.get("content", "")
        slug = title.lower().replace(" ", "-").replace(",", "").replace("&", "and").replace("--", "-").strip("-")
        
        print(f"\n[{i+1}/{len(notes)}] {title} ({len(content)} chars)")
        if not content or len(content) < 100:
            print("  ⚠️ Skipping (no content)"); continue
        
        html = note_to_html(content)
        html_path = f"/tmp/4pm1_pdfs/{slug}.html"
        pdf_path = f"/tmp/4pm1_pdfs/{slug}.pdf"
        with open(html_path, "w") as f: f.write(html)
        
        print("  📄 Generating PDF...", end=" ", flush=True)
        r = subprocess.run(["python3", "-c",
            "import weasyprint; weasyprint.HTML(filename='" + html_path + "').write_pdf('" + pdf_path + "')"],
            capture_output=True, text=True, timeout=300)
        
        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) < 1000:
            print(f"FAILED")
            if r.stderr: print(f"  {r.stderr[:300]}")
            continue
        
        pdf_size = os.path.getsize(pdf_path)
        print(f"{pdf_size//1024}KB")
        
        r2_key = f"{R2_PREFIX}/{slug}.pdf"
        r2.upload_file(pdf_path, R2_BUCKET, r2_key)
        print(f"  ☁️ Uploaded R2")
        
        file_url = f"r2://past-papers/{r2_key}"
        r = subprocess.run(["curl", "-s", "-X", "POST",
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            "-H", f"Authorization: Bearer {MGMT_TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"query": f"UPDATE notes SET file_url='{file_url}' WHERE id='{note['id']}'"})],
            capture_output=True, text=True, timeout=15)
        print(f"  🗄️ DB updated" if r.returncode == 0 else f"  ⚠️ DB: {r.stderr[:100]}")
        
        os.remove(html_path)
        if os.path.exists(pdf_path): os.remove(pdf_path)
    
    print(f"\n{'='*40}\nDone!")

if __name__ == "__main__":
    main()
