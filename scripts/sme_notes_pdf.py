#!/usr/bin/env python3
"""
Re-extract SME revision notes with proper alt_to_math() conversion,
generate PDFs, upload to R2.
"""

import json, re, subprocess, sys, time, os, html, base64

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_KEY = ""
SME_URL = "https://www.savemyexams.com"

# ─── alt_to_math from rescrape_all_math.py ───
def alt_to_math(alt):
    if not alt: return ""
    text = str(alt).strip()
    if 'table' in text.lower() and 'row' in text.lower():
        text = re.sub(r'\bend table\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bend cell\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bend attributes\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\brow cell\b', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'\brow\b', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'\btable attributes columnalign right center left columnspacing 0px\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\btable\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcell\b', '', text, flags=re.IGNORECASE)
        def clean_line(l):
            l = re.sub(r'\bspace\b', ' ', l)
            l = re.sub(r'\bminus\b', '-', l); l = re.sub(r'\bplus\b', '+', l); l = re.sub(r'\bequals\b', '=', l)
            l = l.replace('squared', '^2').replace('cubed', '^3')
            l = re.sub(r'(\d)\s+([a-zA-Z])', r'\1\2', l)
            return re.sub(r'\s+', ' ', l).strip()
        lines = [clean_line(l) for l in text.split('\n') if l.strip()]
        return ' \\\\ '.join(lines)
    text = re.sub(r'fraction\s*numerator\s*(.+?)\s*(?:/denominator|over\s*denominator)\s*(.+?)\s*end\s*fraction', r'\\frac{\1}{\2}', text)
    text = re.sub(r'\b(?:open|left)\s*parenthes[ie]s\b', '(', text)
    text = re.sub(r'\b(?:close|right)\s*parenthes[ie]s\b', ')', text)
    text = re.sub(r'\b(?:open|left)\s*bracket\b', '[', text)
    text = re.sub(r'\b(?:close|right)\s*bracket\b', ']', text)
    text = re.sub(r'\bspace\b', ' ', text)
    text = re.sub(r'\bnegative\s+(\d)', r'-\1', text)
    text = re.sub(r'\bless-than or slanted equal to\b', r'\\leq', text)
    text = re.sub(r'\bgreater-than or slanted equal to\b', r'\\geq', text)
    text = re.sub(r'\bless or equal than\b', r'\\leq', text)
    text = re.sub(r'\bgreater or equal than\b', r'\\geq', text)
    text = re.sub(r'\bless-than\b', '<', text); text = re.sub(r'\bgreater-than\b', '>', text)
    text = re.sub(r'\bless than\b', '<', text); text = re.sub(r'\bgreater than\b', '>', text)
    text = re.sub(r'\bminus\b', '-', text); text = re.sub(r'\bplus\b', '+', text)
    text = re.sub(r'\bequals\b', '=', text); text = re.sub(r'\btimes\b', r'\\times', text)
    text = re.sub(r'\bdivided\s*by\b', r'\\div', text); text = re.sub(r'\bcomma\b', ',', text)
    text = re.sub(r'to\s*the\s*power\s*of\s*(\S+)', r'^{\1}', text)
    text = text.replace('squared', '^2').replace('cubed', '^3')
    text = re.sub(r'\(\s+', '(', text); text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'(\d)\s+([a-zA-Z])', r'\1\2', text)
    text = re.sub(r'=\s*=', '=', text)
    return re.sub(r'\s+', ' ', text).strip()

def render_inline(content):
    """Render inline ProseMirror nodes. Equations → alt_to_math()."""
    out = []
    for node in content or []:
        if not isinstance(node, dict): continue
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
            alt = node.get("attrs", {}).get("alt", "")
            if alt:
                conv = alt_to_math(alt)
                if conv: out.append(f" ${conv}$ ")
        elif t == "hardBreak": out.append("  \n")
        elif t == "image":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src: out.append(f"![{alt}]({src})")
        elif t == "paragraph":
            out.append(render_inline(node.get("content") or []))
    return "".join(out)

def prose_to_md(prose_content):
    """Convert ProseMirror JSON → markdown. Equations via alt_to_math."""
    out = []
    for node in prose_content or []:
        if not isinstance(node, dict): continue
        t = node.get("type", "")
        a = node.get("attrs") or {}
        c = node.get("content") or []
        
        if t == "specPoint":
            name = a.get("name", "")
            if name: out.append(f"\n### {name}\n")
            if c: out.append(prose_to_md(c))
        elif t == "heading":
            txt = render_inline(c)
            out.append(f"\n{'#' * a.get('level', 2)} {txt}\n")
        elif t == "paragraph":
            txt = render_inline(c)
            out.append(f"\n{txt}\n" if txt.strip() else "\n")
        elif t in ("bulletList", "orderedList"):
            for i, item in enumerate(c):
                if item.get("type") != "listItem": continue
                ic = item.get("content") or []
                txt = ""
                for child in ic:
                    ct = child.get("type", "")
                    if ct == "paragraph": txt += render_inline(child.get("content") or [])
                    elif ct in ("bulletList", "orderedList"): txt += "\n" + prose_to_md([child])
                prefix = "- " if t == "bulletList" else f"{a.get('order',1)+i}. "
                out.append(f"\n{prefix}{txt}\n")
        elif t == "equation":
            alt = a.get("alt", "")
            conv = alt_to_math(alt)
            if conv: out.append(f"\n${conv}$\n")
        elif t == "codeBlock":
            out.append(f"\n```{a.get('language','')}\n{render_inline(c)}\n```\n")
        elif t == "table":
            out.append(prose_table_md(node))
        elif t == "figure":
            src = a.get("src", ""); alt = a.get("alt", "")
            if src: out.append(f"\n![{alt}]({src})\n")
            for child in c:
                if child.get("type") == "figcaption":
                    cap = render_inline(child.get("content") or [])
                    if cap.strip(): out.append(f"\n*{cap}*\n")
        elif t == "blockquote":
            txt = prose_to_md(c).strip()
            for line in txt.split("\n"):
                if line.strip(): out.append(f"\n> {line.strip()}\n")
        else:
            txt = render_inline(c)
            if txt.strip(): out.append(txt)
    return "".join(out)

def prose_table_md(node):
    rows = []
    for child in (node.get("content") or []):
        if child.get("type") == "tableRow": rows.append(child)
    if not rows: return ""
    md = ["\n"]
    for i, row in enumerate(rows):
        cells = []
        for cell in (row.get("content") or []):
            if cell.get("type") in ("tableHeader","tableCell"):
                cells.append(render_inline(cell.get("content") or []).strip())
        if cells: md.append(f"| {' | '.join(cells)} |")
        if i == 0: md.append(f"| {' | '.join(['---']*len(cells))} |")
    md.append("\n"); return "\n".join(md)

def login():
    r = subprocess.run(["curl","-sv","-X","POST",
        f"{SME_URL}/api/auth/v1/supertokens/signin/",
        "-H","Content-Type: application/json",
        "-d",json.dumps({"formFields":[
            {"id":"email","value":"inspiringchermann@vmail.dev"},
            {"id":"password","value":"WXVm8Chqq2"}
        ]})
    ], capture_output=True, text=True, timeout=20)
    m = re.search(r'< st-access-token:\s*(\S+)', r.stderr)
    if not m: raise Exception("Login failed")
    return m.group(1)

def sme_get(url, token):
    r = subprocess.run(["curl","-s",url,
        "-H",f"Authorization: Bearer {token}",
        "-H","User-Agent: Mozilla/5.0"
    ], capture_output=True, text=True, timeout=30)
    return r.stdout

# ─── Topic → DB Subtopic mapping ───
TOPIC_TO_DB_SLUG = {
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
    "Sequences": "sequences",
    "Functions": "functions",
    "Coordinate Geometry": "coordinate-geometry",
    "Linear Graphs": "linear-graphs",
    "Graphing Inequalities": "graphing-inequalities",
    "Graphs of Functions": "graphs-of-functions",
    "Real-Life Graphs": "real-life-graphs",
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
    "Transformations": "transformations",
    "Averages, Ranges & Data": "averages-ranges-and-data",
    "Statistical Diagrams": "statistical-diagrams",
    "Introduction to Probability": "introduction-to-probability",
    "Venn Diagrams & Sample Space Diagrams": "venn-diagrams-and-sample-space-diagrams",
}

# ─── R2 upload ───
R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = ""
R2_SECRET_KEY = ""

def upload_to_r2(pdf_bytes, key):
    """Upload PDF to R2 using boto3 (proper AWS Signature V4)."""
    import boto3
    from botocore.config import Config
    
    s3 = boto3.client('s3',
        endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto')
    
    try:
        s3.put_object(
            Bucket='past-papers',
            Key=key,
            Body=pdf_bytes,
            ContentType='application/pdf'
        )
        return "200"
    except Exception as e:
        return str(e)

def markdown_to_html_pdf(md_text, title):
    """Convert markdown to HTML for weasyprint PDF."""
    # Convert markdown formatting and images
    md_text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" style="max-width:100%;height:auto;">', md_text)
    md_text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', md_text)
    md_text = re.sub(r'\*(.+?)\*(?!\*)', r'<em>\1</em>', md_text)
    md_text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^- (.+)$', r'<li>\1</li>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'(<li>.*</li>\n?)+', r'<ul>\g<0></ul>', md_text)
    md_text = re.sub(r'\n\n', '</p><p>', md_text)
    
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
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

def main():
    token = login()
    print("✅ Logged in")
    
    # Get SME structure
    html = sme_get(f"{SME_URL}/igcse/maths/edexcel/a/18/foundation/revision-notes/", token)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    data = json.loads(m.group(1))
    pp = data["props"]["pageProps"]
    sections = pp["sections"]
    topics = pp["topics"]
    subtopics = pp["subtopics"]
    
    sec_by_id = {s["id"]: s for s in sections}
    subs_by_topic = {}
    for s in subtopics:
        tid = s.get("relationships",{}).get("topic",{}).get("data",{}).get("id")
        if tid: subs_by_topic.setdefault(tid, []).append(s)
    
    topics_by_name = {}
    for t in topics:
        topics_by_name[t.get("attributes",{}).get("name","").lower()] = t
    
    # Get DB subtopics
    r = subprocess.run(["curl","-s",
        f"{SUPABASE_URL}/rest/v1/topics?select=id&subject_id=eq.d51b2b1e-b782-46e1-ade0-e9f702dc9451",
        "-H",f"apikey:{SERVICE_KEY}",
        "-H",f"Authorization: Bearer {SERVICE_KEY}"
    ], capture_output=True, text=True, timeout=15)
    topic_ids = [t["id"] for t in json.loads(r.stdout)]
    
    db_subs = {}
    for tid in topic_ids:
        r = subprocess.run(["curl","-s",
            f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name&topic_id=eq.{tid}&order=sort_order",
            "-H",f"apikey:{SERVICE_KEY}",
            "-H",f"Authorization: Bearer {SERVICE_KEY}"
        ], capture_output=True, text=True, timeout=15)
        for s in json.loads(r.stdout):
            short = re.sub(r'^edexcel-mathematics-4ma1-', '', s["slug"])
            db_subs[short] = s
    print(f"✅ Got {len(db_subs)} DB subtopics")
    
    # Delete old notes for this subject
    print("Deleting old notes...")
    all_sub_ids = ",".join([s["id"] for s in db_subs.values()])
    subprocess.run(["curl","-s","-X","DELETE",
        f"{SUPABASE_URL}/rest/v1/notes?subtopic_id=in.({all_sub_ids})",
        "-H",f"apikey:{SERVICE_KEY}",
        "-H",f"Authorization: Bearer {SERVICE_KEY}"
    ], capture_output=True, text=True, timeout=30)
    print("✅ Old notes deleted")
    
    saved = 0
    errors = 0
    
    for sme_name, db_slug in TOPIC_TO_DB_SLUG.items():
        sme_topic = topics_by_name.get(sme_name.lower())
        if not sme_topic:
            print(f"❌ Topic not found: {sme_name}")
            errors += 1
            continue
        
        db_sub = db_subs.get(db_slug)
        if not db_sub:
            print(f"❌ DB sub not found: {db_slug}")
            errors += 1
            continue
        
        sec = sec_by_id.get(sme_topic.get("relationships",{}).get("section",{}).get("data",{}).get("id"))
        if not sec: continue
        sec_slug = sec.get("attributes",{}).get("slug","")
        sme_slug = sme_topic.get("attributes",{}).get("slug","")
        
        sme_subs = subs_by_topic.get(sme_topic["id"], [])
        print(f"\n📁 {sme_name} ({len(sme_subs)} sub-notes)", flush=True)
        
        # Fetch & convert all SME subtopics under this topic
        all_md = []
        for ss in sme_subs:
            sub_slug = ss.get("attributes",{}).get("slug","")
            sub_name = ss.get("attributes",{}).get("name","")
            
            url = f"{SME_URL}/igcse/maths/edexcel/a/18/foundation/revision-notes/{sec_slug}/{sme_slug}/{sub_slug}/"
            page = sme_get(url, token)
            m2 = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.DOTALL)
            if not m2: continue
            
            note = json.loads(m2.group(1)).get("props",{}).get("pageProps",{}).get("revisionNote",{})
            content = note.get("attributes",{}).get("content",[])
            if not content: continue
            
            md = prose_to_md(content)
            if md.strip():
                if len(sme_subs) > 1:
                    all_md.append(f"\n### {sub_name}\n\n{md}")
                else:
                    all_md.append(md)
            
            time.sleep(0.3)
        
        if not all_md:
            print(f"  ⚠️ No content")
            errors += 1
            continue
        
        full_md = "\n\n".join(all_md)
        title = db_sub["display_name"]
        safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
        
        # Generate PDF
        html_content = markdown_to_html_pdf(full_md, title)
        with open("/tmp/note.html", "w") as f: f.write(html_content)
        
        r = subprocess.run(["weasyprint","/tmp/note.html","/tmp/note.pdf"],
            capture_output=True, text=True, timeout=60)
        
        if not os.path.exists("/tmp/note.pdf") or os.path.getsize("/tmp/note.pdf") < 100:
            print(f"  ❌ PDF failed: {r.stderr[:100]}")
            errors += 1
            continue
        
        pdf_size = os.path.getsize("/tmp/note.pdf")
        
        # Upload to R2
        r2_key = f"notes/edexcel-mathematics-4ma1/{safe_title}.pdf"
        result = upload_to_r2(open("/tmp/note.pdf","rb").read(), r2_key)
        
        if result != "200":
            print(f"  ❌ R2 upload: {result}")
            errors += 1
            continue
        
        # Save to DB
        payload = json.dumps({
            "subtopic_id": db_sub["id"],
            "title": title,
            "content": full_md,
            "file_url": f"r2://past-papers/{r2_key}",
            "sort_order": 0
        })
        with open("/tmp/note_payload.json","w") as f: f.write(payload)
        
        r = subprocess.run(["curl","-s","-X","POST",
            f"{SUPABASE_URL}/rest/v1/notes",
            "-H",f"apikey:{SERVICE_KEY}",
            "-H",f"Authorization: Bearer {SERVICE_KEY}",
            "-H","Content-Type: application/json",
            "-H","Prefer: return=minimal",
            "-d","@/tmp/note_payload.json",
            "-w","%{http_code}"
        ], capture_output=True, text=True, timeout=30)
        
        if r.stdout.strip() == "201":
            print(f"  ✅ PDF ({pdf_size//1024}KB) + content saved")
            saved += 1
        else:
            print(f"  ⚠️ DB: {r.stdout.strip()}")
            errors += 1
    
    print(f"\n{'='*40}")
    print(f"Saved: {saved}, Errors: {errors}")


if __name__ == "__main__":
    main()
