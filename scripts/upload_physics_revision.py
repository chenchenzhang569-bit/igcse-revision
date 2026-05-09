#!/usr/bin/env python3
"""Upload PMT Physics revision PDFs to Supabase - QP and MS separate"""

import requests, os, json, re, time, shutil
from pathlib import Path
from urllib.parse import unquote

MANIFEST = "/tmp/pmt_physics_revision.json"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"

def get_key():
    with open(os.path.expanduser("~/igcse-site/.env.local")) as f:
        for line in f:
            if "SERVICE_ROLE_KEY" in line:
                return line.strip().split("=", 1)[1]

def get_subject_id(key, slug):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?slug=eq.{slug}&select=id", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    data = r.json()
    return data[0]["id"] if data else None

def get_topics(key, subject_id):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/topics?subject_id=eq.{subject_id}&select=id,name,display_name,slug", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    return r.json()

def download(url, dest):
    try:
        r = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        dest.write_bytes(r.content)
        return len(r.content)
    except Exception as e:
        print(f"    DOWNLOAD ERR: {e}")
        return 0

def upload_storage(key, path, storage_path, bucket="past-papers"):
    with open(path, "rb") as f:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}",
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/pdf"},
            data=f
        )
    return r.status_code in (200, 201) or "Duplicate" in r.text

def create_past_paper(key, subj_id, title, year, season, paper_num, ptype, url):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/past_papers",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"},
        json={"subject_id": subj_id, "title": title, "year": year, "season": season, "paper_number": paper_num, "paper_type": ptype, "file_url": url, "is_free": True}
    )
    return r.status_code in (200, 201)

def match_topic(pdf_name, topics):
    """Match PDF name to closest topic by keyword"""
    name_lower = pdf_name.lower()
    for t in topics:
        t_words = t["name"].lower().replace("and", " ").replace(",", " ").split()
        matches = sum(1 for w in t_words if w in name_lower and len(w) > 3)
        if matches >= 2:
            return t
    return topics[0] if topics else None

def main():
    key = get_key()
    if not key:
        print("No service key")
        return

    manifest = json.loads(Path(MANIFEST).read_text())
    subject_id = get_subject_id(key, "caie-physics-0625")
    topics = get_topics(key, subject_id)
    print(f"Subject: caie-physics-0625 ({subject_id[:8]}...), {len(topics)} topics")

    temp = Path("/tmp/pmt_physics_temp")
    temp.mkdir(exist_ok=True)

    # Filter: QP, MS, MCQ_QP, MCQ_MS only (skip notes for now)
    to_upload = [p for p in manifest if p["category"] in ("QP", "MS", "MCQ_QP", "MCQ_MS")]
    print(f"Uploading {len(to_upload)} QP/MS PDFs...\n")

    success = 0
    for i, item in enumerate(to_upload):
        url = item["url"]
        cat = item["category"]
        topic_name = item["topic"]
        
        # Match to DB topic
        matched = match_topic(unquote(url), topics)
        topic_slug = matched["slug"] if matched else "general"
        
        # Parse filename
        fname = unquote(url.split("/")[-1])
        safe_name = re.sub(r'[^\w\-\.]', '_', fname)
        local = temp / safe_name
        
        # Determine type
        if "MCQ" in cat:
            ptype = "MCQ Question Paper" if "QP" in cat else "MCQ Mark Scheme"
        else:
            ptype = "Question Paper" if "QP" in cat else "Mark Scheme"
        
        # Storage path
        storage_path = f"physics/caie/topics/{topic_slug}/{safe_name}"
        
        print(f"[{i+1}/{len(to_upload)}] {safe_name[:60]}... ", end="", flush=True)
        
        # Download
        size = download(url, local)
        if not size:
            print("FAIL")
            continue
        
        # Upload
        if upload_storage(key, local, storage_path):
            file_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{storage_path}"
            
            # Extract year from filename (often in topic Qs)
            year_match = re.search(r'(20\d{2})', safe_name)
            year = int(year_match.group(1)) if year_match else 2024
            
            # Title
            title = f"CAIE Physics - {topic_name} - {ptype}"
            
            if create_past_paper(key, subject_id, title, year, "Summer", 0, ptype, file_url):
                print("OK")
                success += 1
            else:
                print("DB_ERR")
        else:
            print("UPLOAD_ERR (may be duplicate, skipping)")
        
        local.unlink(missing_ok=True)
        time.sleep(0.2)
    
    shutil.rmtree(temp, ignore_errors=True)
    print(f"\nDone! {success}/{len(to_upload)} uploaded")

if __name__ == "__main__":
    main()
