"""
Merge all PMT papers per subtopic into one QP + one MS PDF.
Upload merged PDFs to R2, update DB records.
"""
import boto3, json, io, os, re, requests
from botocore.config import Config
import fitz  # PyMuPDF

# === CONFIG ===
R2_ACCOUNT_ID = "7524670a3d7d50fd979765dedb5b378d"
R2_ACCESS_KEY = "baf9fd99dfe0501ceb0f8da65bccfbfc"
R2_SECRET_KEY = "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80"
R2_BUCKET = "past-papers"

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
SERVICE_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
SUBJECT_UUID = "bc5149b5-9700-4b2a-a2f5-8d908a88be38"

s3 = boto3.client('s3',
    endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

def download_from_r2(key):
    """Download a file from R2"""
    try:
        resp = s3.get_object(Bucket=R2_BUCKET, Key=key)
        return resp['Body'].read()
    except Exception as e:
        print(f"    ❌ R2 download failed: {e}")
        return None

def upload_to_r2(key, data, content_type='application/pdf'):
    """Upload a file to R2"""
    try:
        s3.put_object(Bucket=R2_BUCKET, Key=key, Body=data, ContentType=content_type)
        return True
    except Exception as e:
        print(f"    ❌ R2 upload failed: {e}")
        return False

def merge_pdfs(pdf_bytes_list):
    """Merge multiple PDFs into one"""
    if not pdf_bytes_list:
        return None
    if len(pdf_bytes_list) == 1:
        return pdf_bytes_list[0]
    
    doc = fitz.open()  # new empty PDF
    for pdf_bytes in pdf_bytes_list:
        src = fitz.open(stream=pdf_bytes, filetype="pdf")
        doc.insert_pdf(src)
        src.close()
    
    merged = doc.tobytes()
    doc.close()
    return merged

# === MAIN ===
def main():
    # Get all papers grouped by subtopic
    r = requests.get(f"{SUPABASE_URL}/rest/v1/past_papers", params={
        "select": "id,title,file_url,paper_type,subtopic_id,topic_id",
        "subject_id": f"eq.{SUBJECT_UUID}",
        "subtopic_id": "not.is.null",
        "order": "title.asc"
    }, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
    papers = r.json()
    
    # Get subtopics for display names
    r2 = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics", params={
        "select": "id,name,display_name",
    }, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
    st_map = {s['id']: s.get('display_name') or s['name'] for s in r2.json()}
    
    # Group by subtopic
    groups = {}
    for p in papers:
        sid = p['subtopic_id']
        groups.setdefault(sid, [])
        groups[sid].append(p)
    
    print(f"Subtopics with papers: {len(groups)}")
    
    os.makedirs("/tmp/edexcel_merged", exist_ok=True)
    
    merged_count = 0
    for stid, st_papers in sorted(groups.items()):
        st_name = st_map.get(stid, stid[:8])
        
        # Separate QP and MS
        qp_papers = [p for p in st_papers if p['paper_type'] == 'Question Paper']
        ms_papers = [p for p in st_papers if p['paper_type'] == 'Mark Scheme']
        
        if len(qp_papers) < 1 or len(ms_papers) < 1:
            print(f"\n⏭️  {st_name}: {len(qp_papers)} QP, {len(ms_papers)} MS — skip (incomplete)")
            continue
        
        print(f"\n📦 {st_name}: {len(qp_papers)} QP + {len(ms_papers)} MS")
        
        # Download and merge QP
        qp_bytes_list = []
        for p in qp_papers:
            key = p['file_url'].replace('r2://past-papers/', '')
            data = download_from_r2(key)
            if data:
                qp_bytes_list.append(data)
        
        if len(qp_bytes_list) != len(qp_papers):
            print(f"  ⚠️ Only got {len(qp_bytes_list)}/{len(qp_papers)} QP PDFs")
        
        qp_merged = merge_pdfs(qp_bytes_list) if qp_bytes_list else None
        
        # Download and merge MS
        ms_bytes_list = []
        for p in ms_papers:
            key = p['file_url'].replace('r2://past-papers/', '')
            data = download_from_r2(key)
            if data:
                ms_bytes_list.append(data)
        
        if len(ms_bytes_list) != len(ms_papers):
            print(f"  ⚠️ Only got {len(ms_bytes_list)}/{len(ms_papers)} MS PDFs")
        
        ms_merged = merge_pdfs(ms_bytes_list) if ms_bytes_list else None
        
        # Upload merged PDFs to R2
        safe_name = re.sub(r'[^a-zA-Z0-9]+', '_', st_name).strip('_').lower()
        qp_r2_key = f"edexcel-physics-4ph1/{stid}/{safe_name}_QP.pdf"
        ms_r2_key = f"edexcel-physics-4ph1/{stid}/{safe_name}_MS.pdf"
        
        if qp_merged and upload_to_r2(qp_r2_key, qp_merged):
            print(f"  ✅ Uploaded QP ({len(qp_merged)} bytes)")
            qp_r2_url = f"r2://past-papers/{qp_r2_key}"
        else:
            qp_r2_url = None
            print(f"  ❌ QP upload failed")
        
        if ms_merged and upload_to_r2(ms_r2_key, ms_merged):
            print(f"  ✅ Uploaded MS ({len(ms_merged)} bytes)")
            ms_r2_url = f"r2://past-papers/{ms_r2_key}"
        else:
            ms_r2_url = None
            print(f"  ❌ MS upload failed")
        
        # Delete old records
        old_ids = [p['id'] for p in st_papers]
        for oid in old_ids:
            requests.delete(f"{SUPABASE_URL}/rest/v1/past_papers?id=eq.{oid}",
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
        print(f"  🗑️ Deleted {len(old_ids)} old records")
        
        # Create new records
        topic_id = st_papers[0]['topic_id']
        
        if qp_r2_url:
            body = {
                "subject_id": SUBJECT_UUID,
                "subtopic_id": stid,
                "topic_id": topic_id,
                "title": f"{st_name} QP",
                "file_url": qp_r2_url,
                "paper_type": "Question Paper",
                "is_free": True,
                "year": 2026,
                "season": "Topic",
                "paper_number": "",
            }
            rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers",
                json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json", "Prefer": "return=representation"})
            if rr.status_code in (200, 201):
                merged_count += 1
                print(f"  ✅ Created QP record")
        
        if ms_r2_url:
            body = {
                "subject_id": SUBJECT_UUID,
                "subtopic_id": stid,
                "topic_id": topic_id,
                "title": f"{st_name} MS",
                "file_url": ms_r2_url,
                "paper_type": "Mark Scheme",
                "is_free": True,
                "year": 2026,
                "season": "Topic",
                "paper_number": "",
            }
            rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers",
                json=body,
                headers={"apikey": ANON_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                         "Content-Type": "application/json", "Prefer": "return=representation"})
            if rr.status_code in (200, 201):
                print(f"  ✅ Created MS record")
    
    print(f"\n✅ Done! Merged {merged_count} subtopics")

if __name__ == "__main__":
    main()
