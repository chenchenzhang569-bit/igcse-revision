"""
Download PMT papers, merge per subtopic, upload to R2, update DB.
"""
import requests, fitz, io, os, re, json
import boto3
from botocore.config import Config

# === R2 Config ===
R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80"
R2_BUCKET = "past-papers"

s3 = boto3.client('s3',
    endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto')

# === Supabase ===
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
SERVICE_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
SUBJECT_UUID = "bc5149b5-9700-4b2a-a2f5-8d908a88be38"

PMT_BASE = "https://pmt.physicsandmathstutor.com/download/Physics/GCSE/Topic-Qs/Edexcel-IGCSE"

SUBMAP = {
    "1.1 Movement & Position":              {"tn": "1-Forces-and-Motion",       "fn": ["Movement and Position 1", "Movement and Position 2"], "set": "A1"},
    "1.2 Forces, Movement & Changing Shape": {"tn": "1-Forces-and-Motion",       "fn": ["Forces, Movement, Shape and Momentum 1","Forces, Movement, Shape and Momentum 2","Forces, Movement, Shape and Momentum 3","Forces, Movement, Shape and Momentum 4"], "set": "A1"},
    "2.1 Current, Potential Difference & Resistance": {"tn": "2-Electricity", "fn": ["Energy and Voltage in Circuits 1","Energy and Voltage in Circuits 2","Energy and Voltage in Circuits 3"], "set": "A1"},
    "2.3 Electrical Power & Mains Electricity":       {"tn": "2-Electricity", "fn": ["Mains Electricity 1","Mains Electricity 2"], "set": "A1"},
    "2.4 Static Electricity":                          {"tn": "2-Electricity", "fn": ["Energy and Voltage in Circuits Electric Charge"], "set": "A2"},
    "3.1 Waves & The Electromagnetic Spectrum":        {"tn": "3-Waves",       "fn": ["Properties of Waves","The Electromagnetic Spectrum 1","The Electromagnetic Spectrum 2"], "set": "A1"},
    "3.2 Reflection & Refraction":                     {"tn": "3-Waves",       "fn": ["Light and Sound 1","Light and Sound 2","Light and Sound 3"], "set": "A1"},
    "4.1 Energy Stores & Transfers":                   {"tn": "4-Energy-Resources-and-Transfers", "fn": ["Energy Transfers 1","Energy Transfers 2","Energy Transfers 3"], "set": "A1"},
    "4.2 Work, Power & Energy Resources":              {"tn": "4-Energy-Resources-and-Transfers", "fn": ["Work and Power 1","Work and Power 2"], "set": "A1"},
    "5.1 Density & Pressure":                          {"tn": "5-Solids-Liquids-and-Gases", "fn": ["Density and Pressure 1","Density and Pressure 2","Density and Pressure 3","Density and Pressure 4"], "set": "A1"},
    "5.3 Ideal Gases":                                 {"tn": "5-Solids-Liquids-and-Gases", "fn": ["Ideal Gas Molecules","Solids, Liquids and Gases"], "set": "A1"},
    "6.1 Magnetism & Electromagnetism":                {"tn": "6-Magnetism-and-Electromagnetism", "fn": ["Magnetism"], "set": "A1"},
    "6.2 Electromagnetic Induction":                   {"tn": "6-Magnetism-and-Electromagnetism", "fn": ["Electromagnetic Induction"], "set": "A1"},
    "7.2 Radioactivity, Uses & Dangers":               {"tn": "7-Radioactivity-and-Particles", "fn": ["Radioactivity 1","Radioactivity 2","Radioactivity 3"], "set": "A1"},
    "7.3 Fission & Fusion":                            {"tn": "7-Radioactivity-and-Particles", "fn": ["Fission and Fusion"], "set": "A1"},
    "8.1 Motion in the Universe":                      {"tn": "8-Astrophysics", "fn": ["Motion in the Universe 1","Motion in the Universe 2"], "set": "A1"},
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

# Get subtopics
r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics", params={"select": "id,name,display_name,topic_id"},
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
st_by_name = {s['name']: s for s in r.json()}

# First delete ALL existing papers for this subject
r = requests.get(f"{SUPABASE_URL}/rest/v1/past_papers", params={"select": "id,file_url", "subject_id": f"eq.{SUBJECT_UUID}"},
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
existing = r.json()
for p in existing:
    # Delete Supabase Storage file if stored there
    url = p.get('file_url','')
    if 'storage/v1/object/public/past-papers/' in url:
        storage_path = url.split('storage/v1/object/public/past-papers/')[1]
        requests.delete(f"{SUPABASE_URL}/storage/v1/object/past-papers/{storage_path}",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
    # Delete record
    requests.delete(f"{SUPABASE_URL}/rest/v1/past_papers?id=eq.{p['id']}",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
print(f"🗑️ Deleted {len(existing)} existing records + Supabase Storage files")

os.makedirs("/tmp/edexcel_pmt_r2", exist_ok=True)

for st_name, info in SUBMAP.items():
    if st_name not in st_by_name:
        print(f"❌ {st_name}: not found")
        continue
    
    st = st_by_name[st_name]
    stid, topid = st['id'], st['topic_id']
    tn, fns, set_name = info['tn'], info['fn'], info.get('set', 'A1')
    
    print(f"\n📦 {st_name}: {len(fns)} files")
    
    qp_data, ms_data = [], []
    for fn in fns:
        for qp_ms, store in [("QP", qp_data), ("MS", ms_data)]:
            url = f"{PMT_BASE}/{tn}/Set-{set_name}/{fn} {qp_ms}.pdf"
            data = download_pdf(url)
            if data:
                store.append(data)
    
    print(f"  Got: {len(qp_data)} QP + {len(ms_data)} MS")
    
    qp_merged = merge_pdfs(qp_data) if len(qp_data) >= 1 else None
    ms_merged = merge_pdfs(ms_data) if len(ms_data) >= 1 else None
    
    safe = re.sub(r'[^a-zA-Z0-9]+', '_', st_name).strip('_').lower()
    
    # Upload to R2
    if qp_merged:
        key = f"edexcel-physics-4ph1/{stid}/{safe}_qp.pdf"
        if upload_to_r2(key, qp_merged):
            r2_url = f"r2://past-papers/{key}"
            print(f"  ✅ QP uploaded ({len(qp_merged)} bytes)")
            # Create record
            body = {"subject_id": SUBJECT_UUID, "subtopic_id": stid, "topic_id": topid,
                    "title": f"{st_name} QP", "file_url": r2_url,
                    "paper_type": "Question Paper", "is_free": True,
                    "year": 2026, "season": "Topic", "paper_number": ""}
            requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json"})
    
    if ms_merged:
        key = f"edexcel-physics-4ph1/{stid}/{safe}_ms.pdf"
        if upload_to_r2(key, ms_merged):
            r2_url = f"r2://past-papers/{key}"
            print(f"  ✅ MS uploaded ({len(ms_merged)} bytes)")
            body = {"subject_id": SUBJECT_UUID, "subtopic_id": stid, "topic_id": topid,
                    "title": f"{st_name} MS", "file_url": r2_url,
                    "paper_type": "Mark Scheme", "is_free": True,
                    "year": 2026, "season": "Topic", "paper_number": ""}
            requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json"})

print("\n✅ Done! All merged PDFs uploaded to R2")
