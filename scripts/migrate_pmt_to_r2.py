"""
Migrate Edexcel Physics PMT past papers to R2 + assign subtopics.
Also download missing papers for 8 subtopics from PMT.
"""
import requests, json, re, time, os, subprocess, io

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SUPABASE_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
SUBJECT_UUID = "bc5149b5-9700-4b2a-a2f5-8d908a88be38"

# R2 config
R2_ACCOUNT_ID = "7fb096b9ee46660a994f7f286823fca6"
R2_ACCESS_KEY = "7e24b04ca6f4917d68b7ed28267dc8ef"
R2_SECRET_KEY = "aaa0f139e6ff1051e2ca65d56b0ee62b5454f47f8a7c915e84ec6de6b4a68336"
R2_BUCKET = "sme-images"

def r2_upload(file_bytes, key):
    """Upload bytes to R2"""
    url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{R2_BUCKET}/{key}"
    import hashlib
    content_md5 = hashlib.md5(file_bytes).hexdigest()
    r = requests.put(url,
        headers={
            "Authorization": f"AWS4-HMAC-SHA256 Credential={R2_ACCESS_KEY}/20260609/auto/s3/aws4_request",
            "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
            "Content-Type": "application/pdf",
            "Content-MD5": content_md5,
        },
        data=file_bytes,
        auth=(R2_ACCESS_KEY, R2_SECRET_KEY)
    )
    return r.status_code in (200, 201)

def download_from_supabase(file_url):
    """Download PDF from Supabase Storage"""
    # Convert public URL to authenticated URL
    try:
        r = requests.get(file_url, timeout=30, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}"
        })
        if r.status_code == 200:
            return r.content
    except:
        pass
    return None

# === STEP 1: Get all unassigned PMT papers ===
def get_pmt_papers():
    """Get all past papers without subtopic_id"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/past_papers?select=id,title,paper_type,file_url,subtopic_id,topic_id&subject_id=eq.{SUBJECT_UUID}&subtopic_id=is.null",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    return r.json()

def get_subtopics():
    """Get all subtopics for this subject"""
    # Get topics first
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/topics?select=id,name,sort_order&subject_id=eq.{SUBJECT_UUID}&order=sort_order.asc",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    topics = r.json()
    topic_ids = [t['id'] for t in topics]
    
    r2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/subtopics?select=id,name,display_name,topic_id,sort_order&topic_id=in.({','.join(topic_ids)})&order=sort_order.asc",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    return r2.json()

# === STEP 2: Build keyword mapping ===
def build_keyword_map(subtopics):
    """PMT title → subtopic mapping"""
    keyword_rules = [
        ("movement and position", "Movement & Position"),
        ("forces movement shape and momentum", "Forces, Movement & Changing Shape"),
        ("energy and voltage in circuits electric charge", "Static Electricity"),
        ("energy and voltage in circuits", "Current, Potential Difference & Resistance"),
        ("mains electricity", "Electrical Power & Mains Electricity"),
        ("light and sound", "Reflection & Refraction"),
        ("the electromagnetic spectrum", "Waves & The Electromagnetic Spectrum"),
        ("properties of waves", "Waves & The Electromagnetic Spectrum"),
        ("density and pressure", "Density & Pressure"),
        ("ideal gas molecules", "Ideal Gases"),
        ("solids liquids and gases", "Ideal Gases"),
        ("change of state", "Changes of State"),
        ("energy transfers", "Energy Stores & Transfers"),
        ("work and power", "Work, Power & Energy Resources"),
        ("energy resources and electricity generation", "Work, Power & Energy Resources"),
        ("magnetism", "Magnetism & Electromagnetism"),
        ("electromagnetic induction", "Electromagnetic Induction"),
        ("fission and fusion", "Fission & Fusion"),
        ("radioactivity", "Radioactivity, Uses & Dangers"),
        ("motion in the universe", "Motion in the Universe"),
    ]
    
    # Build subtopic lookup by display_name
    st_lookup = {}
    for s in subtopics:
        dn = (s.get('display_name') or s['name']).strip()
        st_lookup[dn.lower()] = s
        clean = re.sub(r'^\d+\.\d+\s+', '', dn).strip()
        st_lookup[clean.lower()] = s
    
    all_assigned = {}
    for kw, st_name in keyword_rules:
        if st_name.lower() in st_lookup:
            all_assigned[kw] = st_lookup[st_name.lower()]
    
    return all_assigned, st_lookup

def map_paper(title, keyword_map, st_lookup):
    """Map a PMT paper title to a subtopic"""
    base = re.sub(r'\s+\d+\s+(QP|MS)$', '', title)
    base = re.sub(r'\s+(QP|MS)$', '', base)
    base_clean = re.sub(r'\s+', ' ', base).strip().lower()
    
    for kw, st in keyword_map.items():
        if kw in base_clean or base_clean in kw:
            return st
    return None

# === MAIN ===
def main():
    os.makedirs("/tmp/edexcel_pmt_pdfs", exist_ok=True)
    
    pmt_papers = get_pmt_papers()
    subtopics = get_subtopics()
    keyword_map, st_lookup = build_keyword_map(subtopics)
    
    print(f"PMT papers to migrate: {len(pmt_papers)}")
    print(f"Subtopics: {len(subtopics)}")
    
    # Track which subtopics get papers
    subtopic_papers = {s['id']: [] for s in subtopics}
    
    # Migrate each paper
    migrated = 0
    failed = 0
    for p in pmt_papers:
        pid = p['id']
        title = p['title']
        file_url = p.get('file_url', '')
        
        matched_st = map_paper(title, keyword_map, st_lookup)
        if not matched_st:
            print(f"  ⚠️ Cannot map: {title[:50]}")
            failed += 1
            continue
        
        stid = matched_st['id']
        topid = matched_st['topic_id']
        
        # Download from Supabase
        pdf = download_from_supabase(file_url)
        if not pdf:
            print(f"  ❌ Cannot download: {title[:40]}")
            failed += 1
            continue
        
        # Determine QP or MS
        suffix = "MS" if p['paper_type'] == 'Mark Scheme' else "QP"
        
        # Upload to R2
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', title)[:60]
        r2_key = f"past-papers/edexcel-physics-4ph1/{stid}/{safe_name}.pdf"
        
        success = r2_upload(pdf, r2_key)
        if not success:
            print(f"  ❌ R2 upload failed: {title[:40]}")
            failed += 1
            continue
        
        # Build R2 URL
        r2_url = f"/api/r2/img?bucket=sme-images&key={r2_key}"
        
        # Update DB record
        body = {
            "subtopic_id": stid,
            "topic_id": topid,
            "file_url": r2_url,
        }
        rr = requests.patch(
            f"{SUPABASE_URL}/rest/v1/past_papers?id=eq.{pid}",
            json=body,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
        )
        
        if rr.status_code in (200, 204):
            subtopic_papers[stid].append(pid)
            migrated += 1
            pt = "QP" if suffix == "QP" else "MS"
            print(f"  ✅ {title[:40]} → R2 + {pt} ({matched_st['name'][:30]})")
        else:
            print(f"  ❌ DB update failed: {title[:40]} ({rr.status_code})")
            failed += 1
    
    print(f"\n✅ Migrated: {migrated}, Failed: {failed}")
    
    # Show subtopics with/without papers
    print("\n=== Subtopics Coverage ===")
    for s in subtopics:
        count = len(subtopic_papers[s['id']])
        if count > 0:
            print(f"  ✅ {s['name']}: {count} papers")
        else:
            print(f"  ❌ {s['name']}: NO papers — needs download from PMT")
    
    # Missing subtopics
    missing = [s for s in subtopics if len(subtopic_papers[s['id']]) == 0]
    if missing:
        print(f"\n⚠️ {len(missing)} subtopics need PMT downloads:")
        for s in missing:
            print(f"  - {s['name']} (need 1 QP + 1 MS)")

if __name__ == "__main__":
    main()
