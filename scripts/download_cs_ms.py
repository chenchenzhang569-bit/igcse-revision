"""Download missing CS 0478 MS PDFs from SME, upload to Supabase"""
import requests, json, re, sys, time, io, os

# === CONFIG ===
SME_EMAIL = "inspiringchermann@vmail.dev"
SME_PASS = "WXVm8Chqq2"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
# ^ Fill in SERVICE_ROLE_KEY below or pass via env
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# CS 0478 subject UUID
CS_SUBJECT_ID = None  # will be fetched

# Missing MS: subtopic → tqst_id mapping (from the 18 missing)
MISSING_MS = [
    # (sme_topic_name, tqst_id, db_subtopic_name)
    ("Data Storage & Compression", "tqst_ZtxjRzyYV9MWrnQx", "Data Storage & Compression"),
    ("Methods of Error Detection", "tqst_Vjkxqxxv2wZ7QYpQ", "Methods of Error Detection"),
    ("Encryption", "tqst_xztvyqmYfrBK9pTG", "Encryption"),
    ("Computer Architecture", "tqst_N7HsHPcdHjtjbDHD", "Computer Architecture"),
    ("Network Hardware", "tqst_F6sGcdDtKqwSXcKx", "Network Hardware"),
    ("Types of Software & Interrupts", "tqst_qyZCtvjFFP5Q8Zjd", "Types of Software & Interrupts"),
    ("Automated Systems", "tqst_rQRZxxN4pwQvZ2bM", "Automated Systems"),
    ("Artificial Intelligence", "tqst_yWCWBYTFvsKvPwNv", "Artificial Intelligence"),
    ("Development Life Cycle", "tqst_WR9pRBTzGRBQqC", "Development Life Cycle"),
    ("Computer Sub-Systems", "tqst_jsfSBwHx96jd97Z6", "Computer Sub-Systems"),
    ("Algorithms", "tqst_Y4g4QDPT6qFpnG7K", "Algorithms"),
    ("Standard Methods of a Solution", "tqst_NdzPZBmNw6jZfbgn", "Standard Methods of a Solution"),
    ("Validation & Verification", "tqst_fN63ybsJfQpKRsWf", "Validation & Verification"),
    ("Identifying Errors", "tqst_s3njfkXmg5VtVQ64", "Identifying Errors"),
    ("Programming Concepts", "tqst_Kyd9xQWfPcF5SkXh", "Programming Concepts"),
    ("Arrays", "tqst_fgq4Smn7Hgn78jrw", "Arrays"),
    ("SQL", "tqst_FH6SSbrt4KpDgHJz", "SQL"),
    ("Boolean Logic", "tqst_jpqZ2YP8Hxg45VHZ", "Boolean Logic"),
]

def get_subtopic_map():
    """Fetch CS subtopics from Supabase and build name→id map"""
    if not SERVICE_ROLE_KEY:
        print("No SERVICE_ROLE_KEY set. Will save PDFs locally instead.")
        return None
    
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }
    
    # Get CS subject
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/subjects?code=eq.0478&select=id",
        headers=headers, timeout=15
    )
    subjects = r.json()
    if not subjects:
        print("ERROR: CS 0478 subject not found")
        return None
    cs_id = subjects[0]["id"]
    print(f"CS 0478 subject ID: {cs_id}")
    
    # Get topics
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/topics?subject_id=eq.{cs_id}&select=id,display_name",
        headers=headers, timeout=15
    )
    topics = r.json()
    topic_ids = [t["id"] for t in topics]
    
    # Get subtopics
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/subtopics?topic_id=in.({','.join(topic_ids)})&select=id,display_name,topic_id",
        headers=headers, timeout=15
    )
    subtopics = r.json()
    
    # Build map: display_name → {id, topic_id}
    st_map = {}
    for st in subtopics:
        st_map[st["display_name"].lower().strip()] = st
    
    print(f"Found {len(subtopics)} subtopics for CS 0478")
    return st_map, cs_id


def main():
    # Step 0: Get subtopic map
    result = get_subtopic_map()
    if result:
        st_map, cs_id = result
        has_db = True
    else:
        st_map = {}
        cs_id = "unknown"
        has_db = False
    
    # Step 1: Login to SME
    print("\n=== Logging in to SME ===")
    s = requests.Session()
    s.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.savemyexams.com',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    })
    r = s.post('https://www.savemyexams.com/api/auth/v1/supertokens/signin/',
        json={'formFields': [
            {'id': 'email', 'value': SME_EMAIL},
            {'id': 'password', 'value': SME_PASS}
        ]}, timeout=15)
    token = r.headers.get('st-access-token', '')
    if not token:
        print(f"Login failed! Status: {r.status_code}")
        return
    s.headers.update({'Authorization': f'Bearer {token}'})
    print(f"Logged in! Token: {token[:20]}...")
    
    # Step 2: Download each MS
    success = 0
    failed = 0
    local_files = []
    
    for sme_topic, tqst_id, db_name in MISSING_MS:
        print(f"\n--- {sme_topic} ({tqst_id}) ---")
        
        # Generate download URL
        r = s.post('https://www.savemyexams.com/api/usage/v1/pdf-downloads', json={
            'data': {
                'type': 'pdf_download',
                'attributes': {'download_type': 'topic_question_set_answers_pdf'},
                'relationships': {
                    'topic_question_set': {
                        'data': {'id': tqst_id, 'type': 'topic_question_set'}
                    }
                }
            }
        }, timeout=30)
        
        if r.status_code != 201:
            print(f"FAILED: {r.status_code} - {r.text[:200]}")
            failed += 1
            time.sleep(5)
            continue
        
        dl_url = r.json()['data']['attributes']['download_url']
        
        # Download PDF
        pdf = requests.get(dl_url, timeout=60)
        if len(pdf.content) < 1000:
            print(f"FAILED: PDF too small ({len(pdf.content)} bytes)")
            failed += 1
            time.sleep(5)
            continue
        
        print(f"Downloaded: {len(pdf.content)} bytes")
        
        # Save locally (always)
        safe_name = sme_topic.lower().replace(' ', '-').replace('&', 'and')
        safe_name = re.sub(r'[^a-z0-9-]', '', safe_name)
        filename = f"cs-0478-{safe_name}-ms.pdf"
        filepath = f"/tmp/sme_pdfs/{filename}"
        os.makedirs("/tmp/sme_pdfs", exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(pdf.content)
        local_files.append(filepath)
        print(f"Saved locally: {filepath}")
        
        # Upload to Supabase if we have the key
        if has_db and st_map:
            st_key = db_name.lower().strip()
            st_info = st_map.get(st_key)
            if not st_info:
                # Try fuzzy match
                for k, v in st_map.items():
                    if db_name.lower() in k or k in db_name.lower():
                        st_info = v
                        break
            
            if st_info:
                subtopic_id = st_info["id"]
                topic_id = st_info["topic_id"]
                
                # Upload to Storage
                upload_path = f"cs-topic-questions/{subtopic_id}/{filename}"
                storage_url = f"{SUPABASE_URL}/storage/v1/object/past-papers/{upload_path}"
                
                h = {
                    "apikey": SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                    "Content-Type": "application/pdf",
                    "x-upsert": "true",
                }
                ru = requests.post(storage_url, headers=h, data=pdf.content, timeout=120)
                if ru.status_code not in (200, 201):
                    print(f"Storage upload failed: {ru.status_code} {ru.text[:200]}")
                else:
                    pub_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{upload_path}"
                    print(f"Uploaded to Storage: {pub_url}")
                    
                    # Insert past_papers record
                    body = {
                        "subject_id": cs_id,
                        "topic_id": topic_id,
                        "subtopic_id": subtopic_id,
                        "title": f"{sme_topic} MS",
                        "file_url": pub_url,
                        "paper_type": "Topic MS",
                        "is_free": True,
                        "year": 2026,
                        "season": "SME",
                        "paper_number": "",
                    }
                    ri = requests.post(
                        f"{SUPABASE_URL}/rest/v1/past_papers",
                        json=body,
                        headers={**h, "Prefer": "return=representation"},
                        timeout=15
                    )
                    if ri.status_code in (200, 201):
                        print(f"DB record created: {ri.json()[0]['id']}")
                    else:
                        print(f"DB insert failed: {ri.status_code} {ri.text[:200]}")
            else:
                print(f"WARNING: Subtopic '{db_name}' not found in DB - saved locally only")
        else:
            print("(No DB key - file saved locally)")
        
        success += 1
        time.sleep(2)  # be nice to SME
    
    print(f"\n=== DONE: {success} success, {failed} failed ===")
    if local_files:
        print(f"Local files in /tmp/sme_pdfs/")
        for f in local_files:
            print(f"  {f}")


if __name__ == "__main__":
    main()
