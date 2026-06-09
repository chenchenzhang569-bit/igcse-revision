"""
Download Edexcel Physics SME topic question PDFs and import to DB.
24 subtopics → 48 PDFs (24 QP + 24 MS)
"""
import requests, json, re, time, os, sys, html

# === CONFIG ===
SME_EMAIL = "inspiringchermann@vmail.dev"
SME_PASS = "WXVm8Chqq2"
SME_TOPIC_URL = "https://www.savemyexams.com/igcse/physics/edexcel/19/topic-questions/"

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SUPABASE_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
SERVICE_ROLE_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"

SUBJECT_UUID = "bc5149b5-9700-4b2a-a2f5-8d908a88be38"

# === STEP 1: Login to SME ===
def sme_login():
    s = requests.Session()
    s.headers.update({
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Origin': 'https://www.savemyexams.com',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    })
    r = s.post('https://www.savemyexams.com/api/auth/v1/supertokens/signin/',
        json={"formFields": [
            {"id": "email", "value": SME_EMAIL},
            {"id": "password", "value": SME_PASS}
        ]}, timeout=15)
    if 'st-access-token' not in r.headers:
        print(f"Login failed! Status: {r.status_code}")
        print(f"Headers: {dict(r.headers)}")
        sys.exit(1)
    token = r.headers['st-access-token']
    s.headers.update({'Authorization': f'Bearer {token}'})
    print("✅ SME Login successful")
    return s, token

# === STEP 2: Get question sets & map to DB subtopics ===
def get_question_sets(s):
    r = s.get(SME_TOPIC_URL, timeout=30)
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.DOTALL)
    if not match:
        print("❌ No __NEXT_DATA__ found")
        sys.exit(1)
    raw = html.unescape(match.group(1))
    data = json.loads(raw)
    pp = data['props']['pageProps']
    
    sections = {s['id']: s for s in pp['sections']}
    topics = {t['id']: t for t in pp['topics']}
    qsets = pp['questionSets']
    
    print(f"Found {len(qsets)} question sets, {len(sections)} sections, {len(topics)} topics")
    
    # Build list: (qset_id, section_name, topic_name)
    result = []
    for qs in qsets:
        sec_id = qs['relationships']['section']['data']['id']
        top_id = qs['relationships']['topic']['data']['id']
        sec_name = sections[sec_id]['attributes']['name'] if sec_id in sections else ""
        top_name = topics[top_id]['attributes']['name'] if top_id in topics else ""
        result.append((qs['id'], sec_name, top_name))
    
    return result

# === STEP 3: Get DB subtopics ===
def get_db_subtopics():
    # First get all topic IDs for this subject
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/topics?select=id,name,sort_order&subject_id=eq.{SUBJECT_UUID}&order=sort_order.asc",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    topics = r.json()
    topic_ids = [t['id'] for t in topics]
    
    # Get topic_name -> topic_id map
    topic_by_name = {}
    for t in topics:
        # Normalize name: "and" -> "&" to match SME format
        name = t['name'].replace(' and ', ' & ').strip()
        topic_by_name[name] = t
    
    # Get subtopics
    topic_ids_str = ','.join(topic_ids)
    r2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/subtopics?select=id,name,display_name,slug,topic_id,sort_order&topic_id=in.({topic_ids_str})&order=sort_order.asc",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    subtopics = r2.json()
    
    print(f"Found {len(subtopics)} DB subtopics")
    
    # Build lookup: sme_topic_name -> (subtopic_id, topic_id, display_name)
    lookup = {}
    for st in subtopics:
        # display_name has clean name without "1.1 " prefix (e.g. "Movement & Position")
        # name has prefix (e.g. "1.1 Movement & Position")
        clean_name = (st.get('display_name') or st['name']).strip()
        # Normalize 'and' -> '&' for SME matching
        lookup[clean_name.lower().replace(' and ', ' & ')] = {
            'id': st['id'],
            'topic_id': st['topic_id'],
            'name': clean_name
        }
    
    return lookup, topic_by_name

# === STEP 4: Download PDF ===
def download_pdf(s, qset_id, dl_type):
    url = 'https://www.savemyexams.com/api/usage/v1/pdf-downloads'
    body = {
        "data": {
            "type": "pdf_download",
            "attributes": {"download_type": dl_type},
            "relationships": {
                "topic_question_set": {
                    "data": {"id": qset_id, "type": "topic_question_set"}
                }
            }
        }
    }
    r = s.post(url, json=body, timeout=15)
    if r.status_code == 429:
        print(f"  ⛔ 429 Rate limited!")
        return None
    if r.status_code != 201:
        print(f"  ❌ Failed ({r.status_code}): {r.text[:200]}")
        return None
    
    dl_url = r.json()['data']['attributes']['download_url']
    pdf = requests.get(dl_url, timeout=30)
    if pdf.status_code != 200:
        print(f"  ❌ Download failed ({pdf.status_code})")
        return None
    
    return pdf.content

# === STEP 5: Upload to Supabase ===
def upload_to_supabase(pdf_bytes, filepath, svc_key):
    url = f"{SUPABASE_URL}/storage/v1/object/past-papers/{filepath}"
    r = requests.post(url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {svc_key}",
            "Content-Type": "application/pdf",
            "x-upsert": "true"
        },
        data=pdf_bytes, timeout=60
    )
    if r.status_code not in (200, 201):
        print(f"  ❌ Upload failed ({r.status_code}): {r.text[:200]}")
        return False
    print(f"  ✅ Uploaded to {filepath}")
    return True

# === MAIN ===
def main():
    # Step 1: Login
    s, token = sme_login()
    
    # Step 2: Get question sets
    qsets = get_question_sets(s)
    
    # Step 3: Get DB subtopics
    db_lookup, topic_by_name = get_db_subtopics()
    
    # Check unmapped question sets
    print("\n=== Question Set → DB Subtopic Mapping ===")
    mapped = []
    unmapped = []
    for qid, sec_name, top_name in qsets:
        key = top_name.lower().replace(' and ', ' & ')
        if key in db_lookup:
            info = db_lookup[key]
            mapped.append((qid, info['id'], info['topic_id'], top_name, sec_name))
            print(f"  ✅ {top_name} -> subtopic {info['id'][:8]}")
        else:
            unmapped.append((qid, top_name, sec_name))
            print(f"  ❌ UNMAPPED: {top_name}")
    
    if unmapped:
        print(f"\n⚠️ {len(unmapped)} unmapped question sets!")
        for qid, name, sec in unmapped:
            print(f"  - {name} ({sec})")
        return
    
    print(f"\n✅ All {len(mapped)} question sets mapped to DB subtopics")
    
    # Step 4: Download and upload
    print("\n=== Downloading PDFs ===")
    svc_key = SERVICE_ROLE_KEY
    results = {"downloaded": 0, "uploaded": 0, "errors": 0, "ratelimited": False}
    os.makedirs("/tmp/edexcel_physics_pdfs", exist_ok=True)
    
    for i, (qid, stid, topid, top_name, sec_name) in enumerate(mapped):
        print(f"\n[{i+1}/{len(mapped)}] {top_name}:")
        
        for dl_type, suffix in [("topic_question_set_pdf", "QP"), ("topic_question_set_answers_pdf", "MS")]:
            print(f"  Downloading {suffix}...", end=" ")
            pdf = download_pdf(s, qid, dl_type)
            if pdf is None:
                results['errors'] += 1
                # Check if rate limited
                continue
            
            results['downloaded'] += 1
            safe_name = top_name.replace('/', '_').replace('&', 'and').replace(',', '').replace('  ', ' ').strip()
            local_path = f"/tmp/edexcel_physics_pdfs/{safe_name}_{suffix}.pdf"
            with open(local_path, 'wb') as f:
                f.write(pdf)
            print(f"{len(pdf)} bytes -> {local_path}")
            
            # Upload to Supabase
            filepath = f"edexcel-physics-topic-questions/{stid}/{suffix}_{i+1}_{safe_name}.pdf"
            if upload_to_supabase(pdf_bytes=pdf, filepath=filepath, svc_key=svc_key):
                results['uploaded'] += 1
                
                # Create past_papers record
                paper_type = "Topic QP" if suffix == "QP" else "Topic MS"
                title = f"{top_name} ({suffix})"
                pub_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{filepath}"
                
                body = {
                    "subject_id": SUBJECT_UUID,
                    "subtopic_id": stid,
                    "topic_id": topid,
                    "title": title,
                    "file_url": pub_url,
                    "paper_type": paper_type,
                    "is_free": True,
                    "year": 2026,
                    "season": "SME",
                    "paper_number": "",
                }
                rr = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers",
                    json=body,
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {svc_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    timeout=15
                )
                if rr.status_code in (200, 201):
                    print(f"  ✅ past_papers record created")
                else:
                    print(f"  ❌ past_papers record failed ({rr.status_code}): {rr.text[:100]}")
            else:
                print(f"  ❌ Upload failed")
            
            time.sleep(1)  # Rate limit spacing
        
        time.sleep(2)  # Between subtopics
    
    print(f"\n=== Summary ===")
    print(f"Downloaded: {results['downloaded']}")
    if svc_key:
        print(f"Uploaded to DB: {results['uploaded']}")
    print(f"Errors: {results['errors']}")
    print(f"Done!")

if __name__ == "__main__":
    main()
