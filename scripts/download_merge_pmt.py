"""
Download PMT papers directly, merge per subtopic, upload to Supabase Storage.
"""
import requests, fitz, io, os, re, json

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
SERVICE_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
SUBJECT_UUID = "bc5149b5-9700-4b2a-a2f5-8d908a88be38"

# PMT base URL for topic Qs
PMT_BASE = "https://pmt.physicsandmathstutor.com/download/Physics/GCSE/Topic-Qs/Edexcel-IGCSE"

# Subtopic -> PMT path mapping
# Format: {subtopic_name: {topic_num: "N-Topic-Name", name: "PMT filename base", set: "A1"|"A2"}}
SUBMAP = {
    "1.1 Movement & Position":              {"tn": "1-Forces-and-Motion",       "fn": ["Movement and Position 1", "Movement and Position 2"], "set": "A1"},
    "1.2 Forces, Movement & Changing Shape": {"tn": "1-Forces-and-Motion",       "fn": ["Forces, Movement, Shape and Momentum 1","Forces, Movement, Shape and Momentum 2","Forces, Movement, Shape and Momentum 3","Forces, Movement, Shape and Momentum 4"], "set": "A1"},
    "2.1 Current, Potential Difference & Resistance": {"tn": "2-Electricity", "fn": ["Energy and Voltage in Circuits 1","Energy and Voltage in Circuits 2","Energy and Voltage in Circuits 3"], "set": "A1"},
    "2.3 Electrical Power & Mains Electricity":       {"tn": "2-Electricity", "fn": ["Mains Electricity 1","Mains Electricity 2","Mains Electricity"], "set": "A1"},
    "2.4 Static Electricity":                          {"tn": "2-Electricity", "fn": ["Energy and Voltage in Circuits Electric Charge"], "set": "A2"},
    "3.1 Waves & The Electromagnetic Spectrum":        {"tn": "3-Waves",       "fn": ["Properties of Waves","The Electromagnetic Spectrum 1","The Electromagnetic Spectrum 2","The Electromagnetic Spectrum"], "set": "A1"},
    "3.2 Reflection & Refraction":                     {"tn": "3-Waves",       "fn": ["Light and Sound 1","Light and Sound 2","Light and Sound 3","Light and Sound"], "set": "A1"},
    "4.1 Energy Stores & Transfers":                   {"tn": "4-Energy-Resources-and-Transfers", "fn": ["Energy Transfers 1","Energy Transfers 2","Energy Transfers 3"], "set": "A1"},
    "4.2 Work, Power & Energy Resources":              {"tn": "4-Energy-Resources-and-Transfers", "fn": ["Work and Power 1","Work and Power 2","Work and Power","Energy Resources and Electricity Generation"], "set": "A1"},
    "5.1 Density & Pressure":                          {"tn": "5-Solids-Liquids-and-Gases", "fn": ["Density and Pressure 1","Density and Pressure 2","Density and Pressure 3","Density and Pressure 4","Density and Pressure"], "set": "A1"},
    "5.3 Ideal Gases":                                 {"tn": "5-Solids-Liquids-and-Gases", "fn": ["Ideal Gas Molecules","Solids, Liquids and Gases"], "set": "A1"},
    "6.1 Magnetism & Electromagnetism":                {"tn": "6-Magnetism-and-Electromagnetism", "fn": ["Magnetism"], "set": "A1"},
    "6.2 Electromagnetic Induction":                   {"tn": "6-Magnetism-and-Electromagnetism", "fn": ["Electromagnetic Induction"], "set": "A1"},
    "7.2 Radioactivity, Uses & Dangers":               {"tn": "7-Radioactivity-and-Particles", "fn": ["Radioactivity 1","Radioactivity 2","Radioactivity 3"], "set": "A1"},
    "7.3 Fission & Fusion":                            {"tn": "7-Radioactivity-and-Particles", "fn": ["Fission and Fusion"], "set": "A1"},
    "8.1 Motion in the Universe":                      {"tn": "8-Astrophysics", "fn": ["Motion in the Universe 1","Motion in the Universe 2","Motion in the Universe"], "set": "A1"},
}

# Get DB subtopics
r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics", params={
    "select": "id,name,display_name,topic_id",
}, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
all_st = r.json()

# Build name -> subtopic map
st_by_name = {}
for s in all_st:
    name = s['name']  # e.g., "1.1 Movement & Position"
    st_by_name[name] = s

def build_pmt_url(topic_num, filename, qp_ms, set_name="A1"):
    """Build PMT download URL"""
    fname = f"{filename} {qp_ms}.pdf"
    return f"{PMT_BASE}/{topic_num}/Set-{set_name}/{fname}"

def download_pdf(url):
    """Download a PDF from PMT"""
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
    doc = fitz.open()
    for data in pdf_list:
        src = fitz.open(stream=data, filetype="pdf")
        doc.insert_pdf(src)
        src.close()
    merged = doc.tobytes()
    doc.close()
    return merged

def upload_to_supabase(data, filepath):
    url = f"{SUPABASE_URL}/storage/v1/object/past-papers/{filepath}"
    r = requests.post(url,
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                 "Content-Type": "application/pdf", "x-upsert": "true"},
        data=data
    )
    return r.status_code in (200, 201)

# Get existing papers to know which subtopics already have data
r = requests.get(f"{SUPABASE_URL}/rest/v1/past_papers", params={
    "select": "subtopic_id,paper_type",
    "subject_id": f"eq.{SUBJECT_UUID}"
}, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
existing = r.json()
existing_sids = set(p['subtopic_id'] for p in existing if p['subtopic_id'])

# Delete existing records for these subtopics
for sid in existing_sids:
    requests.delete(f"{SUPABASE_URL}/rest/v1/past_papers?subtopic_id=eq.{sid}",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
print(f"🗑️ Deleted {len(existing)} existing records")

os.makedirs("/tmp/edexcel_pmt", exist_ok=True)
results = []

for st_name, info in SUBMAP.items():
    if st_name not in st_by_name:
        print(f"❌ {st_name}: not in DB subtopics")
        continue
    
    st = st_by_name[st_name]
    stid = st['id']
    topid = st['topic_id']
    tn = info['tn']
    fns = info['fn']
    
    print(f"\n📦 {st_name}: {len(fns)} files")
    
    # Download QP PDFs
    qp_data = []
    for fn in fns:
        url = build_pmt_url(tn, fn, "QP", info.get("set", "A1"))
        data = download_pdf(url)
        if data:
            qp_data.append(data)
            print(f"  ✅ QP: {fn}")
        else:
            print(f"  ❌ QP: {fn}")
    
    # Download MS PDFs
    ms_data = []
    for fn in fns:
        url = build_pmt_url(tn, fn, "MS", info.get("set", "A1"))
        data = download_pdf(url)
        if data:
            ms_data.append(data)
            print(f"  ✅ MS: {fn}")
        else:
            print(f"  ❌ MS: {fn}")
    
    # Merge
    qp_merged = merge_pdfs(qp_data) if len(qp_data) >= 1 else None
    ms_merged = merge_pdfs(ms_data) if len(ms_data) >= 1 else None
    
    safe = re.sub(r'[^a-zA-Z0-9]+', '_', st_name).strip('_')
    
    # Upload QP
    qp_url = None
    if qp_merged:
        path = f"edexcel-physics-4ph1/{stid}/{safe}_QP.pdf"
        if upload_to_supabase(qp_merged, path):
            qp_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{path}"
            print(f"  ✅ QP uploaded ({len(qp_merged)} bytes)")
            # Create DB record
            body = {"subject_id": SUBJECT_UUID, "subtopic_id": stid, "topic_id": topid,
                    "title": f"{st_name} QP", "file_url": qp_url,
                    "paper_type": "Question Paper", "is_free": True,
                    "year": 2026, "season": "Topic", "paper_number": ""}
            rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json"})
            if rr.status_code in (200, 201):
                print(f"  ✅ QP record created")
    
    # Upload MS
    if ms_merged:
        path = f"edexcel-physics-4ph1/{stid}/{safe}_MS.pdf"
        if upload_to_supabase(ms_merged, path):
            ms_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{path}"
            print(f"  ✅ MS uploaded ({len(ms_merged)} bytes)")
            # Create DB record
            body = {"subject_id": SUBJECT_UUID, "subtopic_id": stid, "topic_id": topid,
                    "title": f"{st_name} MS", "file_url": ms_url,
                    "paper_type": "Mark Scheme", "is_free": True,
                    "year": 2026, "season": "Topic", "paper_number": ""}
            rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json"})
            if rr.status_code in (200, 201):
                print(f"  ✅ MS record created")
    
    results.append((st_name, len(qp_data), len(ms_data)))

print(f"\n\n=== Summary ===")
for name, qp, ms in results:
    print(f"  {'✅' if qp>=1 and ms>=1 else '⚠️'} {name}: {qp} QP, {ms} MS")
