#!/usr/bin/env python3
"""
Download PMT PDFs and upload to Supabase Storage, creating DB records.
Reads from manifest JSON files.
"""

import requests, re, os, sys, json, time, shutil
from pathlib import Path
from urllib.parse import unquote
from collections import Counter

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
STORAGE_BUCKET = "past-papers"

# Subject mapping from manifest prefix to DB slug
SUBJECT_MAP = {
    "caie_chemistry": "caie-chemistry-0620",
    "caie_biology": "caie-biology-0610",
    "edexcel_physics": "edexcel-physics-4ph1",
    "edexcel_chemistry": "edexcel-chemistry-4ch1",
    "edexcel_biology": "edexcel-biology-4bi1",
}

MANIFESTS = {
    "caie_chemistry": "/tmp/pmt_chem_revision.json",
    "caie_biology": "/tmp/pmt_biology_caie_revision.json",
    "edexcel_physics": "/tmp/pmt_physics_edx_revision.json",
    "edexcel_chemistry": "/tmp/pmt_chemistry_edx_revision.json",
    "edexcel_biology": "/tmp/pmt_biology_edx_revision.json",
}

def get_service_key():
    key_file = os.path.expanduser("~/igcse-site/.env.local")
    with open(key_file) as f:
        for line in f:
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.strip().split("=", 1)[1]
    return None

def get_subject_id(key, slug):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/subjects?slug=eq.{slug}&select=id",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        timeout=10
    )
    data = r.json()
    return data[0]["id"] if data else None

def download_pdf(url, dest):
    try:
        r = requests.get(url, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        dest.write_bytes(r.content)
        return len(r.content)
    except Exception as e:
        print(f"    DOWNLOAD ERROR: {e}")
        return 0

def upload_to_storage(key, file_path, storage_path, bucket="past-papers"):
    with open(file_path, "rb") as f:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/pdf",
            },
            data=f,
            timeout=60
        )
    if r.status_code in (200, 201):
        return True
    # "Duplicate" or "already exists" is OK too
    if "Duplicate" in r.text or "already exists" in r.text:
        return True
    print(f"    UPLOAD ERROR ({r.status_code}): {r.text[:100]}")
    return False

def get_or_create_note_record(key, subject_id, title, file_url, topic_name, category):
    """Create or find a record in the 'notes' table"""
    # First check if exists
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/notes?file_url=eq.{requests.utils.quote(file_url)}&select=id",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        timeout=10
    )
    if r.status_code == 200 and r.json():
        return True  # Already exists
    
    # Create
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/notes",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json={
            "subject_id": subject_id,
            "title": title,
            "file_url": file_url,
            "topic": topic_name,
            "category": category,
            "is_free": True,
        },
        timeout=10
    )
    return r.status_code in (200, 201)

def main():
    key = get_service_key()
    if not key:
        print("ERROR: No service key")
        return
    
    temp_dir = Path("/tmp/pmt_downloads")
    temp_dir.mkdir(exist_ok=True)
    
    total_success = 0
    total_fail = 0
    
    for subj_key, manifest_path in MANIFESTS.items():
        if not os.path.exists(manifest_path):
            print(f"\nSKIP {subj_key}: manifest not found ({manifest_path})")
            continue
        
        manifest = json.loads(open(manifest_path).read())
        slug = SUBJECT_MAP[subj_key]
        
        print(f"\n{'='*60}")
        print(f"{subj_key} ({slug}): {len(manifest)} PDFs")
        
        subject_id = get_subject_id(key, slug)
        if not subject_id:
            print(f"  ERROR: Subject not found for slug '{slug}'")
            continue
        print(f"  Subject ID: {subject_id[:8]}...")
        
        success = 0
        fail = 0
        for i, item in enumerate(manifest):
            url = item["url"]
            cat = item.get("category", "UNKNOWN")
            topic = item.get("topic", "General")
            
            # Parse filename
            filename = unquote(url.split("/")[-1])
            safe_name = re.sub(r'[^\w\-\.]', '_', filename)
            
            # Build storage path: igcse/{subject_key}/{topic_slug}/{safe_name}
            topic_slug = re.sub(r'[^\w\-]', '_', topic.lower().replace(" ", "-"))
            storage_path = f"igcse/{subj_key}/{topic_slug}/{safe_name}"
            
            local_path = temp_dir / safe_name
            
            if (i + 1) % 20 == 0:
                print(f"  [{i+1}/{len(manifest)}] ...")
            
            # Download
            size = download_pdf(url, local_path)
            if size == 0:
                fail += 1
                continue
            
            # Upload
            if upload_to_storage(key, local_path, storage_path):
                file_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"
                title = f"{topic} - {cat} - {safe_name.replace('.pdf','')}"
                
                if get_or_create_note_record(key, subject_id, title, file_url, topic, cat):
                    success += 1
                else:
                    fail += 1
            else:
                fail += 1
            
            # Cleanup
            local_path.unlink(missing_ok=True)
            time.sleep(0.2)
        
        print(f"  Done: {success} success, {fail} failed")
        total_success += success
        total_fail += fail
    
    print(f"\n{'='*60}")
    print(f"TOTAL: {total_success} success, {total_fail} failed")
    shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
