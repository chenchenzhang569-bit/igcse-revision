#!/usr/bin/env python3
"""
Batch download PMT PDFs and upload to Supabase Storage.
Skips DB record creation (do that later via SQL Editor).
"""

import requests, re, os, json, time, shutil
from pathlib import Path
from urllib.parse import unquote

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
STORAGE_BUCKET = "past-papers"

MANIFESTS = [
    ("caie_chemistry", "/tmp/pmt_chem_revision.json", "chemistry/caie"),
    ("caie_biology", "/tmp/pmt_biology_caie_revision.json", "biology/caie"),
    ("edexcel_physics", "/tmp/pmt_physics_edx_revision.json", "physics/edexcel"),
    ("edexcel_chemistry", "/tmp/pmt_chemistry_edx_revision.json", "chemistry/edexcel"),
    ("edexcel_biology", "/tmp/pmt_biology_edx_revision.json", "biology/edexcel"),
]

def get_service_key():
    key_file = os.path.expanduser("~/igcse-site/.env.local")
    with open(key_file) as f:
        for line in f:
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.strip().split("=", 1)[1]
    return None

def download_pdf(url, dest):
    try:
        r = requests.get(url, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        dest.write_bytes(r.content)
        return len(r.content)
    except Exception as e:
        return 0

def upload_to_storage(key, file_path, storage_path, bucket="past-papers"):
    try:
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
            return "ok"
        if "Duplicate" in r.text or "already exists" in r.text or "already" in r.text.lower():
            return "dup"
        return f"err_{r.status_code}"
    except Exception as e:
        return f"err_{e}"

def main():
    key = get_service_key()
    if not key:
        print("ERROR: No service key")
        return

    temp_dir = Path("/tmp/pmt_downloads_temp")
    temp_dir.mkdir(exist_ok=True)

    total = {"ok": 0, "dup": 0, "fail": 0, "skip": 0}

    for subj_name, manifest_path, folder_prefix in MANIFESTS:
        if not os.path.exists(manifest_path):
            print(f"\nSKIP {subj_name}: no manifest")
            continue

        manifest = json.loads(open(manifest_path).read())
        print(f"\n{'='*60}")
        print(f"{subj_name}: {len(manifest)} PDFs → {folder_prefix}/")

        for i, item in enumerate(manifest):
            url = item["url"]
            cat = item.get("category", "UNKNOWN")
            topic = item.get("topic", "General")

            # Show progress every 25
            if i > 0 and i % 25 == 0:
                print(f"  [{i}/{len(manifest)}] ok={total['ok']} dup={total['dup']} fail={total['fail']}")

            # Parse and sanitize filename
            filename = unquote(url.split("/")[-1])
            safe_name = re.sub(r'[^\w\-\.]', '_', filename)
            # Limit filename length
            if len(safe_name) > 100:
                name, ext = os.path.splitext(safe_name)
                safe_name = name[:95] + ext

            topic_slug = re.sub(r'[^\w\-]', '_', topic.lower().replace(" ", "-"))[:40]
            storage_path = f"igcse/{folder_prefix}/{cat}/{topic_slug}/{safe_name}"

            # Download
            local_path = temp_dir / safe_name
            size = download_pdf(url, local_path)
            if size == 0:
                total["fail"] += 1
                continue

            # Upload
            result = upload_to_storage(key, local_path, storage_path)
            if result == "ok":
                total["ok"] += 1
            elif result == "dup":
                total["dup"] += 1
            else:
                total["fail"] += 1
                if total["fail"] <= 5:
                    print(f"    FAIL: {result} | {safe_name[:60]}")

            # Cleanup
            local_path.unlink(missing_ok=True)

            # Rate limit
            if total["ok"] % 5 == 0:
                time.sleep(0.3)

        print(f"  DONE {subj_name}: ok={total['ok']} dup={total['dup']} fail={total['fail']}")

    print(f"\n{'='*60}")
    print(f"TOTAL: ok={total['ok']}, dup={total['dup']}, fail={total['fail']}")
    shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
