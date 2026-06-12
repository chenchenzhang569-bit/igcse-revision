
import json, re, subprocess, sys, time, os, html, base64, urllib.parse

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SME_URL = "https://www.savemyexams.com"
SUBJECT_ID = "055b3648-a7b5-4c95-9bbd-868f2c3cce1d"
TIER = "higher"
SLUG_PREFIX = "edexcel-mathematics-higher-4ma1-"

MGMT_TOKEN = ""
PROJECT_REF = "aondldqwwvttwpervrfq"

# === alt_to_math ===
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
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src:
                # SME SVGs may have trailing CSS font-face junk after </svg>
                # that contains ) which breaks markdown image syntax
                decoded = urllib.parse.unquote(src)
                svg_start = decoded.find('<svg')
                if svg_start >= 0:
                    xml = decoded[svg_start:]
                    svg_end = xml.find('</svg>')
                    if svg_end >= 0:
                        xml = xml[:svg_end + 6]
                    else:
                        # Some SVGs are broken (no </svg> in original)
                        # Add it at the end
                        xml = xml.rstrip() + '</svg>'
                    # Re-encode as clean data URI (markdown-safe, no stray parens)
                    clean_src = 'data:image/svg+xml;charset=utf8,' + urllib.parse.quote(xml, safe='')
                    out.append(f"![{alt}]({clean_src})")
                else:
                    out.append(f"![{alt}]({src})")
        elif t == "hardBreak": out.append("  \\n")
        elif t == "image":
            src = node.get("attrs", {}).get("src", "")
            alt = node.get("attrs", {}).get("alt", "")
            if src: out.append(f"![{alt}]({src})")
        elif t == "paragraph":
            out.append(render_inline(node.get("content") or []))
    return "".join(out)

def prose_to_md(prose_content):
    out = []
    for node in prose_content or []:
        if not isinstance(node, dict): continue
        t = node.get("type", "")
        a = node.get("attrs") or {}
        c = node.get("content") or []
        if t == "specPoint":
            name = a.get("name", "")
            if name: out.append(f"\\n### {name}\\n")
            if c: out.append(prose_to_md(c))
        elif t == "heading":
            txt = render_inline(c)
            out.append(f"\\n{'#' * a.get('level', 2)} {txt}\\n")
        elif t == "paragraph":
            txt = render_inline(c)
            out.append(f"\\n{txt}\\n" if txt.strip() else "\\n")
        elif t in ("bulletList", "orderedList"):
            for i, item in enumerate(c):
                if item.get("type") != "listItem": continue
                ic = item.get("content") or []
                txt = ""
                for child in ic:
                    ct = child.get("type", "")
                    if ct == "paragraph": txt += render_inline(child.get("content") or [])
                    elif ct in ("bulletList", "orderedList"): txt += "\\n" + prose_to_md([child])
                prefix = "- " if t == "bulletList" else f"{a.get('order',1)+i}. "
                out.append(f"\\n{prefix}{txt}\\n")
        elif t == "equation":
            alt = a.get("alt", "")
            conv = alt_to_math(alt)
            if conv: out.append(f"\\n${conv}$\\n")
        elif t == "codeBlock":
            out.append(f"\\n\\{a.get('language','')}\\n{render_inline(c)}\\n```\\n")
        elif t == "table":
            out.append(prose_table_md(node))
        elif t == "figure":
            src = a.get("src", ""); alt = a.get("alt", "")
            if src: out.append(f"\\n![{alt}]({src})\\n")
            for child in c:
                if child.get("type") == "figcaption":
                    cap = render_inline(child.get("content") or [])
                    if cap.strip(): out.append(f"\\n*{cap}*\\n")
        elif t == "blockquote":
            txt = prose_to_md(c).strip()
            for line in txt.split("\\n"):
                if line.strip(): out.append(f"\\n> {line.strip()}\\n")
        else:
            txt = render_inline(c)
            if txt.strip(): out.append(txt)
    return "".join(out)

def prose_table_md(node):
    rows = []
    for child in (node.get("content") or []):
        if child.get("type") == "tableRow": rows.append(child)
    if not rows: return ""
    md = ["\\n"]
    for i, row in enumerate(rows):
        cells = []
        for cell in (row.get("content") or []):
            if cell.get("type") in ("tableHeader","tableCell"):
                cells.append(render_inline(cell.get("content") or []).strip())
        if cells: md.append(f"| {' | '.join(cells)} |")
        if i == 0: md.append(f"| {' | '.join(['---']*len(cells))} |")
    md.append("\\n"); return "\\n".join(md)

def login():
    r = subprocess.run(["curl","-sv","-X","POST",
        f"{SME_URL}/api/auth/v1/supertokens/signin/",
        "-H","Content-Type: application/json",
        "-d",json.dumps({"formFields":[
            {"id":"email","value":"inspiringchermann@vmail.dev"},
            {"id":"password","value":"WXVm8Chqq2"}
        ]})
    ], capture_output=True, text=True, timeout=20)
    m = re.search(r'st-access-token:\s*(\S+)', r.stderr)
    if not m: raise Exception("Login failed")
    return m.group(1)

def sme_get(url, token):
    r = subprocess.run(["curl","-s",url,
        "-H",f"Authorization: Bearer {token}",
        "-H","User-Agent: Mozilla/5.0"
    ], capture_output=True, text=True, timeout=30)
    return r.stdout

# === Topic to DB slug mapping (Higher) ===
TOPIC_TO_DB_SLUG = {
    "Number Toolkit": "numbers-the-number-system-number-toolkit",
    "Set Notation & Venn Diagrams": "numbers-the-number-system-set-notation-and-venn-diagrams",
    "Prime Factors, HCF & LCM": "numbers-the-number-system-prime-factors-hcf-and-lcm",
    "Powers, Roots & Standard Form": "numbers-the-number-system-powers-roots-and-standard-form",
    "Fractions": "numbers-the-number-system-fractions",
    "Percentages": "numbers-the-number-system-percentages",
    "Compound Interest & Depreciation": "numbers-the-number-system-compound-interest-and-depreciation",
    "Fractions, Decimals & Percentages": "numbers-the-number-system-fractions-decimals-and-percentages",
    "Rounding, Estimation & Bounds": "numbers-the-number-system-rounding-estimation-and-bounds",
    "Surds": "numbers-the-number-system-surds",
    "Using a Calculator": "numbers-the-number-system-using-a-calculator",
    "Ratio Toolkit": "numbers-the-number-system-ratio-toolkit",
    "Ratio Problem Solving": "numbers-the-number-system-ratio-problem-solving",
    "Exchange Rates & Best Buys": "numbers-the-number-system-exchange-rates-and-best-buys",
    "Direct & Inverse Proportion": "numbers-the-number-system-direct-and-inverse-proportion",
    "Algebra Toolkit": "equations-formulae-identities-algebra-toolkit",
    "Algebraic Roots & Indices": "equations-formulae-identities-algebraic-roots-and-indices",
    "Expanding Brackets": "equations-formulae-identities-expanding-brackets",
    "Factorising": "equations-formulae-identities-factorising",
    "Completing the Square": "equations-formulae-identities-completing-the-square",
    "Algebraic Fractions": "equations-formulae-identities-algebraic-fractions",
    "Rearranging Formulas": "equations-formulae-identities-rearranging-formulae",
    "Algebraic Proof": "equations-formulae-identities-algebraic-proof",
    "Linear Equations": "equations-formulae-identities-linear-equations",
    "Solving Quadratic Equations": "equations-formulae-identities-solving-quadratic-equations",
    "Solving Inequalities": "equations-formulae-identities-solving-inequalities",
    "Simultaneous Equations": "equations-formulae-identities-simultaneous-equations",
    "Forming & Solving Equations": "equations-formulae-identities-forming-and-solving-equations",
    "Sequences": "sequences-functions-graphs-sequences",
    "Functions": "sequences-functions-graphs-functions",
    "Coordinate Geometry": "sequences-functions-graphs-coordinate-geometry",
    "Linear Graphs y = mx + c": "sequences-functions-graphs-linear-graphs-y-equals-mx-plus-c",
    "Graphs of Functions": "sequences-functions-graphs-graphs-of-functions",
    "Estimating Gradients": "sequences-functions-graphs-estimating-gradients",
    "Real-Life Graphs": "sequences-functions-graphs-real-life-graphs",
    "Graphing Inequalities": "sequences-functions-graphs-graphing-inequalities",
    "Transformations of Graphs": "sequences-functions-graphs-transformations-of-graphs",
    "Differentiation": "sequences-functions-graphs-differentiation",
    "Standard & Compound Units": "geometry-trigonometry-standard-and-compound-units",
    "Angles in Polygons & Parallel Lines": "geometry-trigonometry-angles-in-polygons-and-parallel-lines",
    "Bearings, Scale Drawing & Constructions": "geometry-trigonometry-bearings-scale-drawing-and-constructions",
    "Circle Theorems": "geometry-trigonometry-circle-theorems",
    "Area & Perimeter": "geometry-trigonometry-area-and-perimeter",
    "Circles, Arcs & Sectors": "geometry-trigonometry-circles-arcs-and-sectors",
    "Volume & Surface Area": "geometry-trigonometry-volume-and-surface-area",
    "Congruence, Similarity & Geometrical Proof": "geometry-trigonometry-congruence-similarity-and-geometrical-proof",
    "Area & Volume of Similar Shapes": "geometry-trigonometry-area-and-volume-of-similar-shapes",
    "Right-Angled Triangles - Pythagoras & Trigonometry": "geometry-trigonometry-right-angled-triangles---pythagoras-and-trigonometry",
    "Sine, Cosine Rule & Area of Triangles": "geometry-trigonometry-sine-cosine-rule-and-area-of-triangles",
    "3D Pythagoras & Trigonometry": "geometry-trigonometry-3d-pythagoras-and-trigonometry",
    "Vectors": "vectors-transformation-geometry-vectors",
    "Transformations": "vectors-transformation-geometry-transformations",
    "Statistics Toolkit": "statistics-probability-statistics-toolkit",
    "Histograms": "statistics-probability-histograms",
    "Cumulative Frequency Diagrams": "statistics-probability-cumulative-frequency-diagrams",
    "Probability Toolkit": "statistics-probability-probability-toolkit",
    "Probability Diagrams - Venn & Tree Diagrams": "statistics-probability-probability-diagrams---venn-and-tree-diagrams",
    "Combined & Conditional Probability": "statistics-probability-combined-and-conditional-probability",
}

# === R2 upload ===
R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = ""

def upload_to_r2(pdf_bytes, key):
    import boto3
    from botocore.config import Config
    s3 = boto3.client('s3',
        endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto')
    try:
        s3.put_object(Bucket='past-papers', Key=key, Body=pdf_bytes, ContentType='application/pdf')
        return True
    except Exception as e:
        print(f"  ❌ R2: {e}")
        return False

def svg_data_uri_to_inline(html_str):
    """Convert SVG data URIs to PNG images for weasyprint (via cairosvg)."""
    import cairosvg, io, base64
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
        # Recover broken SVG markup (SME SVGs often miss </style> and </defs>)
        parser = etree.XMLParser(recover=True)
        try:
            root = etree.fromstring(svg_xml.encode('utf-8'), parser)
            clean_svg = etree.tostring(root, encoding='unicode')
        except Exception:
            clean_svg = svg_xml
        # Strip @font-face — cairosvg can't handle embedded base64 fonts
        clean_svg = re.sub(r'@font-face\s*\{[^}]*\}', '', clean_svg)
        try:
            png_data = cairosvg.svg2png(bytestring=clean_svg.encode('utf-8'))
            b64 = base64.b64encode(png_data).decode('ascii')
            return f'<img src="data:image/png;base64,{b64}" alt="{alt}" style="max-width:100%;height:auto;">'
        except Exception as e:
            print(f"  ⚠️ SVG render failed: {e}", file=sys.stderr)
            # Fallback: use alt text
            return f'<span style="font-family:serif;font-style:italic;">{alt}</span>'
    return re.sub(r'<img\s+src="([^"]*data:image/svg\+xml[^"]*)"\s+alt="([^"]*)"[^>]*>', _replace, html_str)

def markdown_to_html_pdf(md_text, title):
    md_text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" style="max-width:100%;height:auto;">', md_text)
    md_text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', md_text)
    md_text = re.sub(r'\*(.+?)\*(?!\*)', r'<em>\1</em>', md_text)
    md_text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'^- (.+)$', r'<li>\1</li>', md_text, flags=re.MULTILINE)
    md_text = re.sub(r'(<li>.*</li>\\n?)+', r'<ul>\g<0></ul>', md_text)
    md_text = re.sub(r'\\n\\n', '</p><p>', md_text)
    # Convert SVG data URIs to inline SVG for weasyprint
    md_text = svg_data_uri_to_inline(md_text)
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

def save_note(subtopic_id, topic_id, title, r2_key):
    sql = f"INSERT INTO notes (subtopic_id, topic_id, subject_id, title, file_url, content, sort_order) VALUES ('{subtopic_id}', '{topic_id}', '{SUBJECT_ID}', '{title.replace(chr(39), chr(39)+chr(39))}', 'r2://past-papers/{r2_key}', '', 0) RETURNING id;"
    with open("/tmp/note_sql.json", "w") as f:
        json.dump({"query": sql}, f)
    r = subprocess.run(["curl", "-s", "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-H", f"Authorization: Bearer {MGMT_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", "@/tmp/note_sql.json"
    ], capture_output=True, text=True, timeout=30)
    return r

def main():
    token = login()
    print("✅ Logged in")

    # Get SME structure from listing page
    html = sme_get(f"{SME_URL}/igcse/maths/edexcel/a/18/{TIER}/revision-notes/", token)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    data = json.loads(m.group(1))
    pp = data["props"]["pageProps"]
    sections = pp["sections"]
    topics = pp["topics"]
    subtopics_list = pp["subtopics"]

    sec_by_id = {s["id"]: s for s in sections}
    subs_by_topic = {}
    for s in subtopics_list:
        tid = s.get("relationships",{}).get("topic",{}).get("data",{}).get("id")
        if tid: subs_by_topic.setdefault(tid, []).append(s)

    topics_by_name = {}
    for t in topics:
        topics_by_name[t.get("attributes",{}).get("name","").lower()] = t

    # Get DB subtopics
    r = subprocess.run(["curl","-s",
        f"{SUPABASE_URL}/rest/v1/topics?select=id&subject_id=eq.{SUBJECT_ID}",
        "-H","apikey: "+os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY',''),
        "-H","Authorization: Bearer "+os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY','')
    ], capture_output=True, text=True, timeout=15)
    topic_ids = [t["id"] for t in json.loads(r.stdout)]

    db_subs = {}
    for tid in topic_ids:
        r = subprocess.run(["curl","-s",
            f"{SUPABASE_URL}/rest/v1/subtopics?select=id,slug,display_name,topic_id&topic_id=eq.{tid}&order=sort_order",
            "-H","apikey: "+os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY',''),
            "-H","Authorization: Bearer "+os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY','')
        ], capture_output=True, text=True, timeout=15)
        for s in json.loads(r.stdout):
            short = re.sub(f'^{re.escape(SLUG_PREFIX)}', '', s["slug"])
            db_subs[short] = s
    print(f"✅ Got {len(db_subs)} DB subtopics")

    # Delete old notes using Management API
    print("Deleting old notes...")
    sub_ids = [f"'{s['id']}'" for s in db_subs.values()]
    del_sql = f"DELETE FROM notes WHERE subtopic_id IN ({','.join(sub_ids)});"
    with open("/tmp/note_del_sql.json", "w") as f:
        json.dump({"query": del_sql}, f)
    r = subprocess.run(["curl", "-s", "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-H", f"Authorization: Bearer {MGMT_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", "@/tmp/note_del_sql.json"
    ], capture_output=True, text=True, timeout=30)
    print(f"✅ Old notes deleted ({r.returncode})")

    # Clean /tmp directory
    os.makedirs("/tmp/4ma1_higher_notes", exist_ok=True)

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
            # Try fuzzy match
            candidates = [k for k in db_subs if sme_name.lower().replace(' ','-') in k.lower()]
            if candidates:
                db_sub = db_subs[candidates[0]]
            else:
                print(f"❌ DB sub not found: {db_slug}")
                errors += 1
                continue

        sec = sec_by_id.get(sme_topic.get("relationships",{}).get("section",{}).get("data",{}).get("id"))
        if not sec: continue
        sec_slug = sec.get("attributes",{}).get("slug","")
        sme_slug = sme_topic.get("attributes",{}).get("slug","")

        sme_subs = subs_by_topic.get(sme_topic["id"], [])
        print(f"\n📁 {sme_name} ({len(sme_subs)} sub-notes)", flush=True)

        # Fetch all SME subtopics under this topic
        all_md = []
        for ss in sme_subs:
            sub_slug = ss.get("attributes",{}).get("slug","")
            sub_name = ss.get("attributes",{}).get("name","")

            url = f"{SME_URL}/igcse/maths/edexcel/a/18/{TIER}/revision-notes/{sec_slug}/{sme_slug}/{sub_slug}/"
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

            time.sleep(0.2)

        if not all_md:
            print(f"  ⚠️ No content")
            errors += 1
            continue

        full_md = "\n\n".join(all_md)
        title = db_sub["display_name"]
        safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')

        # Generate PDF
        html_content = markdown_to_html_pdf(full_md, title)
        html_path = f"/tmp/4ma1_higher_notes/{safe_title}.html"
        pdf_path = f"/tmp/4ma1_higher_notes/{safe_title}.pdf"
        with open(html_path, "w") as f:
            f.write(html_content)

        try:
            subprocess.run(["weasyprint", html_path, pdf_path], capture_output=True, text=True, timeout=60)
        except:
            # Try python -m weasyprint
            subprocess.run(["python3", "-m", "weasyprint", html_path, pdf_path], capture_output=True, text=True, timeout=60)

        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) < 1000:
            print(f"  ❌ PDF generation failed")
            errors += 1
            continue

        pdf_size = os.path.getsize(pdf_path)
        print(f"  ✅ PDF: {pdf_path} ({pdf_size} bytes)")

        # Upload to R2
        r2_key = f"igcse/maths/edexcel/notes/higher/{safe_title}.pdf"
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        if upload_to_r2(pdf_bytes, r2_key):
            print(f"  ✅ Uploaded to R2: {r2_key}")

        # Save note record
        r = save_note(db_sub["id"], db_sub.get("topic_id"), title, r2_key)
        if r.returncode == 0 and r.stdout:
            try:
                resp = json.loads(r.stdout)
                print(f"  ✅ Note saved: {resp[0]['id'][:8]}...")
                saved += 1
            except:
                print(f"  ⚠️ DB: {r.stdout[:100]}")
                saved += 1
        else:
            print(f"  ❌ DB error: {r.stderr[:200]}")

    print(f"\n{'='*50}")
    print(f"Done! Saved: {saved}, Errors: {errors}")

if __name__ == "__main__":
    main()
