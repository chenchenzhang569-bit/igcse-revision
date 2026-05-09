#!/usr/bin/env python3
"""Download PMT PDFs and upload to Supabase Storage + create DB records"""

import requests, re, os, sys, json, time, tempfile, shutil
from urllib.parse import urljoin, unquote
from pathlib import Path

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
STORAGE_BUCKET = "past-papers"
MANIFEST = "/tmp/pmt_igcse_manifest.json"

# Subject mapping to our DB subject slugs
SUBJECT_MAP = {
    "Physics_CAIE": "caie-physics-0625",
    "Physics_Edexcel": "edexcel-physics-4ph1",
    "Chemistry_CAIE": "caie-chemistry-0620",
    "Chemistry_Edexcel": "edexcel-chemistry-4ch1",
    "Biology_CAIE": "caie-biology-0610",
    "Biology_Edexcel": "edexcel-biology-4bi1",  # placeholder
    "Maths_CAIE": "caie-mathematics-0580",
    "Maths_Edexcel_A": "edexcel-mathematics-4ma1",
}

def get_service_key():
    key_file = os.path.expanduser("~/igcse-site/.env.local")
    with open(key_file) as f:
        for line in f:
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.strip().split("=", 1)[1]

def get_subject_id(supabase_key, slug):
    """Get subject UUID from slug"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/subjects?slug=eq.{slug}&select=id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    data = r.json()
    if data and len(data) > 0:
        return data[0]["id"]
    return None

def download_pdf(url, dest):
    try:
        r = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        dest.write_bytes(r.content)
        return len(r.content)
    except Exception as e:
        print(f"  DOWNLOAD ERROR: {e}")
        return 0

def upload_to_storage(supabase_key, file_path, storage_path):
    """Upload file to Supabase Storage"""
    file_size = file_path.stat().st_size
    with open(file_path, "rb") as f:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/pdf",
            },
            data=f,
        )
    if r.status_code in (200, 201):
        return True
    print(f"  UPLOAD ERROR ({r.status_code}): {r.text[:200]}")
    return False

def create_paper_record(supabase_key, subject_id, title, year, season, paper_num, paper_type, file_url):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/past_papers",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json={
            "subject_id": subject_id,
            "title": title,
            "year": year,
            "season": season,
            "paper_number": paper_num,
            "paper_type": paper_type,
            "file_url": file_url,
            "is_free": True,
        }
    )
    if r.status_code in (200, 201):
        return True
    print(f"  DB ERROR ({r.status_code}): {r.text[:200]}")
    return False

def main():
    service_key = get_service_key()
    if not service_key:
        print("ERROR: No service key")
        return

    manifest = json.loads(Path(MANIFEST).read_text())
    print(f"Processing {len(manifest)} PDFs...\n")

    # Pre-fetch subject IDs
    subject_ids = {}
    for pdf in manifest:
        sk = pdf["subject_key"]
        if sk not in subject_ids:
            slug = SUBJECT_MAP.get(sk)
            if slug:
                sid = get_subject_id(service_key, slug)
                if sid:
                    subject_ids[sk] = sid
                    print(f"  Subject {sk} → {slug} → {sid[:8]}...")
            time.sleep(0.1)

    # Download and upload
    temp_dir = Path("/tmp/pmt_downloads")
    temp_dir.mkdir(exist_ok=True)

    success = 0
    fail = 0
    for i, pdf in enumerate(manifest):
        url = pdf["url"]
        year = pdf["year"]
        ptype = pdf["type"]
        paper_num = pdf["paper_num"]
        sk = pdf["subject_key"]
        subject_id = subject_ids.get(sk)

        if not subject_id:
            print(f"[{i+1}/{len(manifest)}] SKIP: no subject_id for {sk}")
            fail += 1
            continue

        # Parse filename from URL
        filename = unquote(url.split("/")[-1])
        # Sanitize: replace spaces with underscores
        safe_name = re.sub(r'[^\w\-\.]', '_', filename)

        # Storage path
        storage_path = f"igcse/{sk}/{year}/{safe_name}"

        # Check if already uploaded (skip if exists)
        # Download
        local_path = temp_dir / safe_name
        print(f"[{i+1}/{len(manifest)}] Downloading {safe_name[:60]}... ", end="", flush=True)
        size = download_pdf(url, local_path)
        if size == 0:
            fail += 1
            continue

        print(f"{size//1024}KB ", end="", flush=True)

        # Upload
        if upload_to_storage(service_key, local_path, storage_path):
            print("UPLOADED ", end="", flush=True)
            file_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"

            # Determine season
            if "June" in filename or "Jun" in filename:
                season = "Summer"
            elif "Nov" in filename or "November" in filename:
                season = "Winter"
            elif "March" in filename or "Mar" in filename:
                season = "Spring"
            else:
                season = "Summer"

            # Title: e.g. "CAIE Physics Paper 1 2024 QP"
            paper_type = "Question Paper" if ptype == "QP" else "Mark Scheme"
            board = "CAIE" if "CAIE" in sk else "Edexcel"
            subj_short = sk.split("_")[0]
            title = f"{board} IGCSE {subj_short} Paper {paper_num} {year} {ptype}"

            if create_paper_record(service_key, subject_id, title, year, season, paper_num, paper_type, file_url):
                print("DB ✅")
                success += 1
            else:
                print("DB ❌")
                fail += 1
        else:
            print("FAIL")
            fail += 1

        # Cleanup temp
        local_path.unlink(missing_ok=True)
        time.sleep(0.3)  # Rate limit

    print(f"\n\nDone! Success: {success}, Failed: {fail}")
    shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
