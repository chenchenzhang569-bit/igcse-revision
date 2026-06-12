"""
Download PMT Edexcel IGCSE Maths A Higher QP+MS, merge per subtopic, upload to R2, create DB records.
"""
import requests, io, os, re, json, sys
import boto3
from botocore.config import Config

# === R2 Config ===
R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = ""
R2_BUCKET = "past-papers"

s3 = boto3.client('s3',
    endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto')

# === Supabase ===
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
with open('/home/ubuntu/igcse-site/.env.local') as f:
    content = f.read()
env = {}
for line in content.strip().split('\n'):
    m = re.match(r'\s*\d+\|(.+?)=(.+)', line)
    if m: env[m.group(1).strip()] = m.group(2).strip()
ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

SUBJECT_UUID = "055b3648-a7b5-4c95-9bbd-868f2c3cce1d"  # Mathematics (Higher)

# === PMT URL pattern ===
# Maths/GCSE/Topic-Qs/Edexcel-IGCSE/{Topic}/{QP|MS}/Higher/{Subdir?}/{Name} (H) QP.pdf
PMT_BASE = "https://pmt.physicsandmathstutor.com/download/Maths/GCSE/Topic-Qs/Edexcel-IGCSE"

# === MAPPING: DB subtopic name -> list of (PMT_topic, subdir_or_None, [filenames]) ===
# Each filename is WITHOUT the " (H) QP" / " (H) MS" suffix
SUBMAP = {
    # === Numbers & the Number System ===
    "Number Toolkit": [
        ("Number", "Structure-and-Calculation", ["Calculating Problems", "Four Operations"]),
    ],
    "Surds": [
        ("Number", "Structure-and-Calculation", ["Surds"]),
    ],
    "Rounding, Estimation & Bounds": [
        ("Number", "Measures-and-Accuracy", ["Approximation and Estimation", "Bounds", "Rounding"]),
    ],
    "Powers, Roots & Standard Form": [
        ("Number", "Structure-and-Calculation", ["Indices", "Roots and Powers", "Standard Form"]),
    ],
    "Fractions": [
        ("Number", "Fractions-Decimals-and-Percentages", ["Fractions"]),
    ],
    "Percentages": [
        ("Number", "Fractions-Decimals-and-Percentages", ["Percentages"]),
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Percentage Increase or Decrease"]),
    ],
    "Fractions, Decimals & Percentages": [
        ("Number", "Fractions-Decimals-and-Percentages", ["Recurring Decimals into Fractions"]),
    ],
    "Prime Factors, HCF & LCM": [
        ("Number", "Structure-and-Calculation", ["Primes, Factors and Multiples"]),
    ],
    "Ratio Toolkit": [
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Ratio"]),
    ],
    "Ratio Problem Solving": [
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Scale Factors"]),
    ],
    "Direct & Inverse Proportion": [
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Proportion", "Direct and Inverse Proportion", "Algebraic Direct and Inverse Proportions"]),
    ],
    "Compound Interest & Depreciation": [
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Compound Interest"]),
    ],
    # === Equations, Formulae & Identities ===
    "Algebra Toolkit": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Deriving Expressions", "Simplifying Expressions", "Substitution into Equations"]),
    ],
    "Expanding Brackets": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Expanding Equations", "Expanding Triple Brackets"]),
    ],
    "Factorising": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Factorising Equations"]),
    ],
    "Algebraic Fractions": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Algebraic Fractions"]),
    ],
    "Algebraic Proof": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Algebraic Proof"]),
    ],
    "Forming & Solving Equations": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Forming Equations"]),
    ],
    "Solving Linear Equations": [
        ("Algebra", "Solving-Equations-and-Inequalities", ["Solving Linear Equations"]),
    ],
    "Solving Quadratic Equations": [
        ("Algebra", "Solving-Equations-and-Inequalities", ["Solving Quadratic Equations"]),
    ],
    "Completing the Square": [
        ("Algebra", "Solving-Equations-and-Inequalities", ["Completing the square"]),
    ],
    "Simultaneous Equations": [
        ("Algebra", "Solving-Equations-and-Inequalities", ["Simultaneous Equations"]),
    ],
    "Solving Inequalities": [
        ("Algebra", "Solving-Equations-and-Inequalities", ["Inequalities", "Quadratic Inequalities"]),
    ],
    "Algebraic Roots & Indices": [
        ("Algebra", "Solving-Equations-and-Inequalities", ["Solving using Indices"]),
    ],
    "Rearranging Formulas": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Manipulation of Formulae"]),
    ],
    # === Sequences, Functions & Graphs ===
    "Sequences": [
        ("Algebra", "Sequences", ["Sequences"]),
    ],
    "Functions": [
        ("Algebra", "Notation-Vocabulary-and-Manipulation", ["Functions (Composite or Inverse)"]),
    ],
    "Coordinate Geometry": [
        ("Algebra", "Graphs", ["Coordinates", "Circle Equations and Tangents"]),
    ],
    "Linear Graphs y = mx + c": [
        ("Algebra", "Graphs", ["Equations of Straight Lines", "Gradients of Straight lines", "Graphs of Linear Equations", "Parallel or Perpendicular Lines"]),
    ],
    "Graphs of Functions": [
        ("Algebra", "Graphs", ["Cubic and Reciprocal Graphs", "Exponential and Trigonometric Graphs", "Graphs of Quadratic Equations", "Graphs of Circles"]),
    ],
    "Transformations of Graphs": [
        ("Algebra", "Graphs", ["Translations and Reflections of Functions"]),
    ],
    "Estimating Gradients": [
        ("Algebra", "Graphs", ["Interpreting Gradients"]),
    ],
    "Graphing Inequalities": [
        ("Algebra", "Graphs", ["Simultaneous Equations on Graphs"]),
        ("Algebra", "Solving-Equations-and-Inequalities", ["Inequalities on Graphs"]),
    ],
    "Real-Life Graphs": [
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Speed"]),
    ],
    # === Geometry & Trigonometry ===
    "Area & Perimeter": [
        ("Geometry-and-Measures", "Mensuration-and-Calculation", ["Area", "Area of Shaded Region", "Area or Perimeter Problem", "Compound Area", "Perimeter"]),
    ],
    "Volume & Surface Area": [
        ("Geometry-and-Measures", "Mensuration-and-Calculation", ["Volume and Surface Area"]),
    ],
    "Right-Angled Triangles - Pythagoras & Trigonometry": [
        ("Geometry-and-Measures", "Mensuration-and-Calculation", ["Pythagoras' Theorem", "Trig Ratios and Exact Values"]),
    ],
    "3D Pythagoras & Trigonometry": [
        ("Geometry-and-Measures", "Mensuration-and-Calculation", ["Pythagoras and trig (3D)"]),
    ],
    "Sine, Cosine Rule & Area of Triangles": [
        ("Geometry-and-Measures", "Mensuration-and-Calculation", ["Sine Rule, Cosine Rule and Area"]),
    ],
    "Bearings, Scale Drawing & Constructions": [
        ("Geometry-and-Measures", "Mensuration-and-Calculation", ["Bearings"]),
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Constructions", "Maps and Scale Drawings"]),
    ],
    "Angles in Polygons & Parallel Lines": [
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Properties of Angles", "Properties of Polygons", "Triangles", "Vocabulary and Notation"]),
    ],
    "Circle Theorems": [
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Circle Theorems"]),
    ],
    "Circles, Arcs & Sectors": [
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Properties of Circles", "Sectors, Segments and Arcs"]),
    ],
    "Congruence, Similarity & Geometrical Proof": [
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Congruence and Similarity"]),
    ],
    "Area & Volume of Similar Shapes": [
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Similar (2D or 3D)"]),
    ],
    "Standard & Compound Units": [
        ("Number", "Measures-and-Accuracy", ["Using Measures"]),
        ("Ratio-Proportion-and-Rates-of-Change", None, ["Compound Measures", "Compound Units", "Units of Measure"]),
    ],
    # === Vectors & Transformation Geometry ===
    "Vectors": [
        ("Geometry-and-Measures", "Vectors", ["Manipulating Vectors", "Translations as 2D vectors", "Vector Proof"]),
    ],
    "Transformations": [
        ("Geometry-and-Measures", "Properties-and-Constructions", ["Transformations of Shapes"]),
    ],
    # === Statistics & Probability ===
    "Probability Toolkit": [
        ("Probability", None, ["Probability of Events"]),
    ],
    "Combined & Conditional Probability": [
        ("Probability", None, ["Conditional Probability", "Probability Equations"]),
    ],
    "Probability Diagrams - Venn & Tree Diagrams": [
        ("Probability", None, ["Tree Diagrams", "Venn Diagrams"]),
    ],
    "Statistics Toolkit": [
        ("Statistics", None, ["Mean, Median, Mode, Range", "Frequency Tables", "Interpreting Data"]),
    ],
    "Cumulative Frequency Diagrams": [
        ("Statistics", None, ["Cumulative Frequency Graphs"]),
    ],
    "Histograms": [
        ("Statistics", None, ["Histograms"]),
    ],
}

def download_pdf(url):
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        if r.status_code == 200 and len(r.content) > 1000:
            return r.content
        return None
    except:
        return None

def merge_pdfs(pdf_list):
    if not pdf_list:
        return None
    if len(pdf_list) == 1:
        return pdf_list[0]
    import fitz
    doc = fitz.open()
    for data in pdf_list:
        src = fitz.open(stream=data, filetype="pdf")
        doc.insert_pdf(src)
        src.close()
    merged = doc.tobytes()
    doc.close()
    return merged

def upload_to_r2(key, data):
    try:
        s3.put_object(Bucket=R2_BUCKET, Key=key, Body=data, ContentType='application/pdf')
        return True
    except Exception as e:
        print(f"    ❌ R2: {e}")
        return False

# === Get subtopics from DB ===
print("Fetching subtopics from DB...")
# Get topics for this subject first
r = requests.get(f"{SUPABASE_URL}/rest/v1/topics",
    params={"select": "id", "subject_id": f"eq.{SUBJECT_UUID}"},
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
topic_ids = [t["id"] for t in r.json()]
print(f"Found {len(topic_ids)} topics")

# Get all subtopics for these topics
all_subs = []
for tid in topic_ids:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics",
        params={"select": "id,name,display_name,topic_id", "topic_id": f"eq.{tid}"},
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
    all_subs.extend(r.json())
st_by_name = {s['name']: s for s in all_subs}
print(f"Found {len(st_by_name)} subtopics")

os.makedirs("/tmp/4ma1_higher", exist_ok=True)

for st_name, groups in SUBMAP.items():
    if st_name not in st_by_name:
        print(f"❌ {st_name}: not found in DB, skipping")
        continue

    st = st_by_name[st_name]
    stid, topid = st['id'], st['topic_id']
    print(f"\n📦 {st_name}")

    qp_data, ms_data = [], []

    for pmt_topic, subdir_or_none, filenames in groups:
        for fn in filenames:
            for qp_ms, store in [("QP", qp_data), ("MS", ms_data)]:
                # Build URL
                if subdir_or_none:
                    url = f"{PMT_BASE}/{pmt_topic}/{qp_ms}/Higher/{subdir_or_none}/{fn} (H) {qp_ms}.pdf"
                else:
                    url = f"{PMT_BASE}/{pmt_topic}/{qp_ms}/Higher/{fn} (H) {qp_ms}.pdf"
                data = download_pdf(url)
                if data:
                    store.append(data)
                    print(f"  ✅ {fn} (H) {qp_ms}.pdf ({len(data)} bytes)")
                else:
                    print(f"  ⚠️  {fn} (H) {qp_ms}.pdf FAILED")
                    # Print the URL that failed for debugging
                    print(f"     URL: {url}")

    print(f"  Total: {len(qp_data)} QP + {len(ms_data)} MS")

    if len(qp_data) == 0 and len(ms_data) == 0:
        print(f"  ⛔ No files downloaded, skipping")
        continue

    qp_merged = merge_pdfs(qp_data) if qp_data else None
    ms_merged = merge_pdfs(ms_data) if ms_data else None

    safe = re.sub(r'[^a-zA-Z0-9]+', '_', st_name).strip('_').lower()

    # Upload to R2 and create records
    if qp_merged:
        key = f"Maths_A/PMT/Edexcel-IGCSE/Higher/QP/{safe}.pdf"
        if upload_to_r2(key, qp_merged):
            r2_url = f"r2://past-papers/{key}"
            print(f"  ✅ QP -> R2: {key} ({len(qp_merged)} bytes)")
            body = {"subject_id": SUBJECT_UUID, "subtopic_id": stid, "topic_id": topid,
                    "title": f"{st_name} QP", "file_url": r2_url,
                    "paper_type": "Topic QP", "is_free": True,
                    "year": 0, "season": "", "paper_number": ""}
            rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json"})
            if rr.status_code in (200, 201):
                print(f"  ✅ DB record created")
            elif '42501' in rr.text or 'PGRST301' in rr.text:
                print(f"  ⚠️ DB insert SKIPPED (no write permission)")
            else:
                print(f"  ⚠️ DB insert: {rr.status_code} {rr.text[:200]}")

    if ms_merged:
        key = f"Maths_A/PMT/Edexcel-IGCSE/Higher/MS/{safe}.pdf"
        if upload_to_r2(key, ms_merged):
            r2_url = f"r2://past-papers/{key}"
            print(f"  ✅ MS -> R2: {key} ({len(ms_merged)} bytes)")
            body = {"subject_id": SUBJECT_UUID, "subtopic_id": stid, "topic_id": topid,
                    "title": f"{st_name} MS", "file_url": r2_url,
                    "paper_type": "Topic MS", "is_free": True,
                    "year": 0, "season": "", "paper_number": ""}
            rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json"})
            if rr.status_code in (200, 201):
                print(f"  ✅ DB record created")
            elif '42501' in rr.text or 'PGRST301' in rr.text:
                print(f"  ⚠️ DB insert SKIPPED (no write permission)")
            else:
                print(f"  ⚠️ DB insert: {rr.status_code} {rr.text[:200]}")

print("\n✅ Done! All Higher PMT QP+MS processed.")
