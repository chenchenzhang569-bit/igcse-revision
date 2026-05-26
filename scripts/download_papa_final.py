#!/usr/bin/env python3
"""Download papacambridge-linked PDFs from bestexamhelp.com mirror to Supabase Storage.
Strategy: HEAD-check availability first, then GET+upload for available papers.
Focus: bestexamhelp has ~97% May/Jun, 100% Oct/Nov, 25% March coverage."""

import os, re, time, sys
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/igcse-site/.env.local"))
SURL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SKEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": SKEY, "Authorization": f"Bearer {SKEY}"}

SUBJ_MAP = {"0580": "mathematics", "0625": "physics", "0620": "chemistry", "0610": "biology"}

ses = requests.Session()
ses.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

BATCH = 100
total_ok = 0
total_skip = 0
total_fail = 0
offset = 0

def fetch_batch(offset):
    r = requests.get(
        f"{SURL}/rest/v1/past_papers?select=id,file_url,year&file_url=ilike.*papacambridge*&limit={BATCH}&offset={offset}&order=id",
        headers=H, timeout=30)
    return r.json()

def check_available(subj, code, year, fname):
    """HEAD request to bestexamhelp"""
    try:
        r = ses.head(
            f"https://bestexamhelp.com/exam/cambridge-igcse/{subj}-{code}/{year}/{fname}",
            timeout=10)
        return r.status_code == 200
    except:
        return False

def download(subj, code, year, fname):
    """GET the PDF"""
    try:
        r = ses.get(
            f"https://bestexamhelp.com/exam/cambridge-igcse/{subj}-{code}/{year}/{fname}",
            timeout=60)
        if r.status_code == 200 and len(r.content) > 2000:
            return r.content
    except:
        pass
    return None

def upload(code, year, fname, data):
    path = f"{code}/{year}/{fname}"
    try:
        r = requests.post(f"{SURL}/storage/v1/object/past-papers/{path}",
            headers={**H, "Content-Type":"application/pdf", "x-upsert":"true"},
            data=data, timeout=60)
        return r.status_code in (200, 201)
    except:
        return False

def update_db(pid, code, year, fname):
    new_url = f"{SURL}/storage/v1/object/public/past-papers/{code}/{year}/{fname}"
    try:
        r = requests.patch(f"{SURL}/rest/v1/past_papers?id=eq.{pid}",
            headers={**H, "Prefer":"return=minimal"},
            json={"file_url": new_url}, timeout=15)
        return r.status_code in (200, 204)
    except:
        return False

print(f"=== PapaCambridge PDF Download ===")
print(f"Started: {datetime.now().isoformat()}")
sys.stdout.flush()

while True:
    papers = fetch_batch(offset)
    if not papers:
        print(f"\nNo more papers at offset {offset}. Done!")
        break
    
    batch_ok = batch_skip = batch_fail = 0
    
    for i, p in enumerate(papers):
        pid = p["id"]
        url = p.get("file_url", "")
        year = str(p.get("year", "2020"))
        fname = url.rstrip("/").rsplit("/", 1)[-1]
        
        m = re.match(r"(\d{4})_", fname)
        if not m:
            batch_skip += 1
            continue
        code = m.group(1)
        subj = SUBJ_MAP.get(code, "")
        if not subj:
            batch_skip += 1
            continue
        
        # HEAD check first (fast)
        if not check_available(subj, code, year, fname):
            batch_skip += 1
            continue
        
        # Download
        data = download(subj, code, year, fname)
        if not data:
            batch_fail += 1
            continue
        
        # Upload
        if not upload(code, year, fname, data):
            batch_fail += 1
            continue
        
        # Update DB
        if not update_db(pid, code, year, fname):
            batch_fail += 1
            continue
        
        batch_ok += 1
        if batch_ok % 20 == 0:
            print(f"  [{batch_ok:3d}/{len(papers)}] {fname}")
    
    total_ok += batch_ok
    total_skip += batch_skip
    total_fail += batch_fail
    print(f"Batch {offset//BATCH:2d} (offset {offset:4d}): {batch_ok:3d} ok | {batch_skip:3d} skip | {batch_fail:3d} fail | Total: {total_ok}/{total_skip}/{total_fail}")
    sys.stdout.flush()
    
    offset += BATCH

print(f"\n{'='*50}")
print(f"COMPLETE: {total_ok} downloaded | {total_skip} skipped | {total_fail} failed")
print(f"Finished: {datetime.now().isoformat()}")
