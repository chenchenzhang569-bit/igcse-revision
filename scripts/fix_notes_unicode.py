#!/usr/bin/env python3
"""
Fix all 4MA1 notes: convert $...$ LaTeX math to clean Unicode text.
No $ delimiters, no LaTeX commands - pure readable math.
"""

import json, re, urllib.request, subprocess, os, html

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_KEY = ""
SUBJECT_ID = "d51b2b1e-b782-46e1-ade0-e9f702dc9451"

# ─── Comprehensive math-to-Unicode converter ───

UNICODE_SUP = str.maketrans("0123456789-()", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁽⁾")
UNICODE_SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")

def to_sup(n):
    """Convert digits to superscript Unicode."""
    return str(n).translate(UNICODE_SUP)

def to_sub(n):
    """Convert digits to subscript Unicode."""
    return str(n).translate(UNICODE_SUB)

def math_to_unicode(text):
    """Convert SME equation alt text to clean Unicode math."""
    if not text:
        return ""
    t = str(text).strip()
    
    # ===== ORDER MATTERS: do specific patterns FIRST =====
    
    # Square root: "square root of X end root"
    t = re.sub(r'square root of\s*(.+?)\s*end\s*root', r'√(\1)', t, flags=re.IGNORECASE)
    t = re.sub(r'cube root of\s*(.+?)\s*end\s*root', r'∛(\1)', t, flags=re.IGNORECASE)
    
    # Fractions: "fraction numerator X denominator Y end fraction" 
    t = re.sub(r'fraction\s*numerator\s*(.+?)\s*(?:/denominator|over\s*denominator)\s*(.+?)\s*end\s*fraction',
               lambda m: f"({m.group(1).strip()})/({m.group(2).strip()})", t, flags=re.IGNORECASE)
    
    # Simple "X over Y" fraction
    t = re.sub(r'(\d+)\s*over\s*(\d+)', r'\1/\2', t)
    
    # "end exponent" cleanup
    t = re.sub(r'\s*end\s*exponent', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*end\s*root', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*end\s*fraction', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*end\s*superscript', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*end\s*subscript', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*end\s*power', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*end\s*style', '', t, flags=re.IGNORECASE)
    
    # Special symbols
    t = re.sub(r'\bpi\b', 'π', t)
    t = re.sub(r'\btheta\b', 'θ', t)
    t = re.sub(r'\bdelta\b', 'δ', t)
    t = re.sub(r'\bgamma\b', 'γ', t)
    t = re.sub(r'\balpha\b', 'α', t)
    t = re.sub(r'\bbeta\b', 'β', t)
    t = re.sub(r'\blambda\b', 'λ', t)
    t = re.sub(r'\bomega\b', 'ω', t)
    
    # Comparison signs
    t = re.sub(r'\bnot equal to\b', '≠', t, flags=re.IGNORECASE)
    t = re.sub(r'\balmost equal to\b', '≈', t, flags=re.IGNORECASE)
    t = re.sub(r'\bidentical to\b', '≡', t, flags=re.IGNORECASE)
    t = re.sub(r'\bidentical\b', '≡', t, flags=re.IGNORECASE)
    t = re.sub(r'\bless-than or slanted equal to\b', '≤', t, flags=re.IGNORECASE)
    t = re.sub(r'\bgreater-than or slanted equal to\b', '≥', t, flags=re.IGNORECASE)
    t = re.sub(r'\bless or equal than\b', '≤', t, flags=re.IGNORECASE)
    t = re.sub(r'\bgreater or equal than\b', '≥', t, flags=re.IGNORECASE)
    t = re.sub(r'\bless-than\b', '<', t, flags=re.IGNORECASE)
    t = re.sub(r'\bgreater-than\b', '>', t, flags=re.IGNORECASE)
    t = re.sub(r'\bless than\b', '<', t, flags=re.IGNORECASE)
    t = re.sub(r'\bgreater than\b', '>', t, flags=re.IGNORECASE)
    
    # Operators
    t = re.sub(r'\bcross\s*times\b', '×', t, flags=re.IGNORECASE)
    t = re.sub(r'\bcross\b', '×', t, flags=re.IGNORECASE)
    t = re.sub(r'\btimes\b', '×', t, flags=re.IGNORECASE)
    t = re.sub(r'\bdivided\s*by\b', '÷', t, flags=re.IGNORECASE)
    t = re.sub(r'\bdivide\b', '÷', t, flags=re.IGNORECASE)
    t = re.sub(r'\bminus\b', '−', t, flags=re.IGNORECASE)
    t = re.sub(r'\bplus\b', '+', t, flags=re.IGNORECASE)
    t = re.sub(r'\bequals\b', '=', t, flags=re.IGNORECASE)
    t = re.sub(r'\bequal to\b', '=', t, flags=re.IGNORECASE)
    
    # Powers and indices
    t = re.sub(r'to\s*the\s*power\s*of\s*(\S+)', lambda m: f'^{to_sup(m.group(1))}', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsquared\b', '²', t, flags=re.IGNORECASE)
    t = re.sub(r'\bcubed\b', '³', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnegative\s*(\d)', r'−\1', t, flags=re.IGNORECASE)
    
    # Parentheses cleanup
    t = re.sub(r'\b(?:open|left)\s*parenthes[ie]s\b', '(', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:close|right)\s*parenthes[ie]s\b', ')', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:open|left)\s*bracket\b', '[', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:close|right)\s*bracket\b', ']', t, flags=re.IGNORECASE)
    
    # ½, ⅓ etc.
    t = re.sub(r'\bone[_ ]?half\b', '½', t, flags=re.IGNORECASE)
    t = re.sub(r'\bone[_ ]?third\b', '⅓', t, flags=re.IGNORECASE)
    t = re.sub(r'\btwo[_ ]?thirds\b', '⅔', t, flags=re.IGNORECASE)
    t = re.sub(r'\bone[_ ]?quarter\b', '¼', t, flags=re.IGNORECASE)
    t = re.sub(r'\bthree[_ ]?quarters\b', '¾', t, flags=re.IGNORECASE)
    
    # Other common words
    t = re.sub(r'\bcomma\b', ',', t, flags=re.IGNORECASE)
    t = re.sub(r'\bspace\b', ' ', t, flags=re.IGNORECASE)
    t = re.sub(r'\bper\b', '/', t, flags=re.IGNORECASE)
    t = re.sub(r'\bpercent\b', '%', t, flags=re.IGNORECASE)
    t = re.sub(r'\binfinity\b', '∞', t, flags=re.IGNORECASE)
    t = re.sub(r'\bdegree[s]?\b', '°', t, flags=re.IGNORECASE)
    
    # Subscript patterns: "x subscript 1" → "x₁"
    t = re.sub(r'(\w)\s*subscript\s*(\d+)', lambda m: m.group(1) + to_sub(m.group(2)), t, flags=re.IGNORECASE)
    t = re.sub(r'(\w)\s*sub\s*(\d+)', lambda m: m.group(1) + to_sub(m.group(2)), t, flags=re.IGNORECASE)
    
    # Superscript patterns: "x ^{5}" → "x⁵"
    t = re.sub(r'\^\{(\d+)\}', lambda m: '^' + to_sup(m.group(1)), t)
    t = re.sub(r'\^(\d+)', lambda m: to_sup(m.group(1)), t)
    
    # LaTeX commands → Unicode
    t = re.sub(r'\\times', '×', t)
    t = re.sub(r'\\div', '÷', t)
    t = re.sub(r'\\leq', '≤', t)
    t = re.sub(r'\\geq', '≥', t)
    t = re.sub(r'\\neq', '≠', t)
    t = re.sub(r'\\approx', '≈', t)
    t = re.sub(r'\\equiv', '≡', t)
    t = re.sub(r'\\pi', 'π', t)
    t = re.sub(r'\\sqrt', '√', t)
    t = re.sub(r'\\frac\{', '(', t)
    t = re.sub(r'\}\{', ')/(', t)
    t = re.sub(r'\}', ')', t)
    
    # Arrow
    t = re.sub(r'\brightwards arrow\b', '→', t, flags=re.IGNORECASE)
    t = re.sub(r'\bleftwards arrow\b', '←', t, flags=re.IGNORECASE)
    t = re.sub(r'\brightarrow\b', '→', t, flags=re.IGNORECASE)
    t = re.sub(r'\bleftarrow\b', '←', t, flags=re.IGNORECASE)
    
    # Stretchy/bold/italic formatting tags
    t = re.sub(r'\bstretchy\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbold\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bitalic\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnormal\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bstyle\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bmath\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\brm\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bof\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bend\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbegin\b', '', t, flags=re.IGNORECASE)
    
    # Clean up formatting
    t = re.sub(r'\(\s+', '(', t)
    t = re.sub(r'\s+\)', ')', t)
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\(\s*\)', '', t)
    t = re.sub(r'\[\s*\]', '', t)
    t = re.sub(r'\s*,\s*', ', ', t)
    t = t.strip()
    
    # Remove trailing/leading formatting remnants
    t = re.sub(r'^[\s,;:]+', '', t)
    t = re.sub(r'[\s,;:]+$', '', t)
    
    return t


def fix_note_content(md_content):
    """Fix all $...$ math blocks and SVG images in markdown content."""
    
    # Step 1: Replace $...$ blocks with converted Unicode
    def replace_math(match):
        inner = match.group(1)
        converted = math_to_unicode(inner)
        return converted if converted else inner
    
    result = re.sub(r'\$([^$]+?)\$', replace_math, md_content)
    
    # Step 2: Remove any remaining SVG data URIs
    result = re.sub(r'!\[([^\]]*)\]\(data:image/svg\+xml[^)]+\)', '', result)
    result = re.sub(r'data:image/svg\+xml[^)\s]+', '', result)
    
    # Step 3: Clean up \\( and \\) (LaTeX inline math markers)
    result = result.replace('\\(', '').replace('\\)', '')
    
    return result


def generate_pdf(md_text, title):
    """Convert clean markdown to PDF."""
    safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
    
    # Convert markdown formatting to HTML
    md_text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" style="max-width:100%;height:auto;">', md_text)
    md_text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', md_text)
    md_text = re.sub(r'\*(.+?)\*(?!\*)', r'<em>\1</em>', md_text)
    md_text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^- (.+)$', r'<li>\1</li>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'(<li>.*</li>\n?)+', r'<ul>\g<0></ul>', md_text)
    md_text = re.sub(r'\n\n', '</p><p>', md_text)
    
    html_content = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page {{ margin: 2cm; size: A4; }}
  body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }}
  h1 {{ font-size: 18pt; color: #001C71; border-bottom: 2px solid #001C71; padding-bottom: 5px; }}
  h2 {{ font-size: 14pt; color: #001C71; margin-top: 20px; }}
  h3 {{ font-size: 12pt; color: #333; margin-top: 15px; }}
  p {{ margin: 8px 0; }}
  ul {{ margin: 5px 0; padding-left: 20px; }}
  li {{ margin: 3px 0; }}
  strong {{ color: #000; }}
  img {{ max-width: 100%; height: auto; }}
  table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
  td, th {{ border: 1px solid #ccc; padding: 6px 10px; text-align: center; }}
  th {{ background: #f0f0f0; font-weight: bold; }}
</style></head><body>
<h1>{html.escape(title)}</h1>
<p>{md_text}</p>
</body></html>"""
    
    with open("/tmp/note.html", "w") as f:
        f.write(html_content)
    
    r = subprocess.run(["weasyprint", "/tmp/note.html", "/tmp/note.pdf"],
        capture_output=True, text=True, timeout=60)
    
    if os.path.exists("/tmp/note.pdf") and os.path.getsize("/tmp/note.pdf") >= 100:
        return open("/tmp/note.pdf", "rb").read()
    return None


def upload_r2(pdf_bytes, key):
    import boto3
    from botocore.config import Config
    s3 = boto3.client('s3',
        endpoint_url='https://7524670a3d7d50fd979765dedb5b378d.r2.cloudflarestorage.com',
        aws_access_key_id='baf9fd99dfe0501ceb0f8da65bccfbfc',
        aws_secret_access_key='a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80',
        config=Config(signature_version='s3v4'), region_name='auto')
    try:
        s3.put_object(Bucket='past-papers', Key=key, Body=pdf_bytes, ContentType='application/pdf')
        return True
    except Exception as e:
        print(f"  R2 error: {e}")
        return False


def main():
    print("Fetching notes...")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/notes?select=id,title,content,file_url,subtopic_id&order=created_at.desc&limit=100",
        headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'})
    with urllib.request.urlopen(req) as resp:
        notes = json.loads(resp.read().decode('utf-8', errors='replace'))
    
    # Filter to our notes (those with subtopic_id matching our subject)
    our_notes = [n for n in notes if n.get('subtopic_id') and n.get('file_url') 
                 and n['file_url'].startswith('r2://past-papers/notes/edexcel-mathematics-4ma1')]
    
    print(f"Found {len(our_notes)} 4MA1 notes to fix")
    
    fixed = 0
    for n in our_notes:
        nid = n['id']
        title = n['title']
        content = n.get('content', '')
        file_url = n.get('file_url', '')
        
        if not content:
            continue
        
        print(f"  {title}...", end=" ", flush=True)
        
        # Fix math in content
        fixed_content = fix_note_content(content)
        
        # Generate new PDF
        pdf_data = generate_pdf(fixed_content, title)
        if not pdf_data:
            print("❌ PDF failed")
            continue
        
        safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
        r2_key = f"notes/edexcel-mathematics-4ma1/{safe_title}.pdf"
        if upload_r2(pdf_data, r2_key):
            # Update DB: content + file_url
            payload = json.dumps({"content": fixed_content, "file_url": f"r2://past-papers/{r2_key}"})
            req2 = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/notes?id=eq.{nid}",
                data=payload.encode(), method='PATCH',
                headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}',
                         'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
            try:
                with urllib.request.urlopen(req2) as resp:
                    if resp.status == 204:
                        print(f"✅ ({len(pdf_data)//1024}KB)")
                        fixed += 1
                    else:
                        print(f"⚠️ DB: {resp.status}")
            except Exception as e:
                print(f"❌ DB: {e}")
        else:
            print("❌ R2 upload failed")
    
    print(f"\nDone! Fixed: {fixed}/{len(our_notes)}")


if __name__ == "__main__":
    main()
