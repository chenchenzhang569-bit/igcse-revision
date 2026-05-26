#!/usr/bin/env python3
"""Batch download papacambridge-linked PDFs from mirrors and upload to Supabase."""

import os, re, time, sys, json
from datetime import datetime

import requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/igcse-site/.env.local"))
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

SUBJ_MAP = {"0580": "mathematics", "0625": "physics", "0620": "chemistry", "0610": "biology"}

BATCH = 100
TOTAL_OK = 0
TOTAL_SKIP = 0
TOTAL_FAIL = 0

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

def fetch_batch(offset):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/past_papers?select=id,file_url,year&file_url=ilike.*papacambridge*&limit={BATCH}&offset={offset}&order=id",
        headers=HEADERS, timeout=30)
    return resp.json()

def download(url):
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200 and len(r.content) > 2000:
            return r.content
    except:
        pass
    return None

def upload_pdf(code, year, fname, data):
    path = f"{code}/{year}/{fname}"
    h = {**HEADERS, "Content-Type": "application/pdf", "x-upsert": "true"}
    r = requests.post(f"{SUPABASE_URL}/storage/v1/object/past-papers/{path}", headers=h, data=data, timeout=60)
    return r.status_code in (200, 201)

def update_db(pid, path):
    new_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{path}"
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/past_papers?id=eq.{pid}",
                       headers={**HEADERS, "Prefer": "return=minimal"},
                       json={"file_url": new_url}, timeout=15)
    return r.status_code in (200, 204)

def process_paper(p):
    pid = p["id"]
    url = p.get("file_url", "")
    year = str(p.get("year", "2020"))
    fname = url.rstrip("/").rsplit("/", 1)[-1]
    
    m = re.match(r"(\d{4})_", fname)
    code = m.group(1) if m else ""
    subj = SUBJ_MAP.get(code, "")
    if not subj:
        return "SKIP", "unknown subject"
    
    # Source 1: bestexamhelp
    data = download(f"https://bestexamhelp.com/exam/cambridge-igcse/{subj}-{code}/{year}/{fname}")
    src = "bestexam"
    
    # Source 2: dynamicpapers
    if not data:
        data = download(f"https://dynamicpapers.com/wp-content/uploads/2015/09/{fname}")
        src = "dp"
    
    if not data:
        return "SKIP", "not found"
    
    path = f"{code}/{year}/{fname}"
    if not upload_pdf(code, year, fname, data):
        return "FAIL", "upload error"
    
    if not update_db(pid, path):
        return "FAIL", "db update error"
    
    return "OK", f"[{src}] {len(data)}B"

def main():
    global TOTAL_OK, TOTAL_SKIP, TOTAL_FAIL
    offset = 0
    
    print(f"=== Download PapaCambridge PDFs ===")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Sources: bestexamhelp → dynamicpapers.com")
    sys.stdout.flush()
    
    while True:
        try:
            papers = fetch_batch(offset)
        except Exception as e:
            print(f"FETCH ERROR at offset {offset}: {e}")
            time.sleep(5)
            continue
        
        if not papers:
            print(f"\nNo more papers. Done!")
            break
        
        print(f"\n--- Batch offset={offset}, {len(papers)} papers [{TOTAL_OK} ok / {TOTAL_SKIP} skip / {TOTAL_FAIL} fail] ---")
        sys.stdout.flush()
        
        for i, p in enumerate(papers):
            try:
                status, detail = process_paper(p)
            except Exception as e:
                status, detail = "FAIL", str(e)[:80]
            
            if status == "OK":
                TOTAL_OK += 1
            elif status == "SKIP":
                TOTAL_SKIP += 1
            else:
                TOTAL_FAIL += 1
            
            fname = p.get("file_url", "").rstrip("/").rsplit("/", 1)[-1]
            if status == "OK":
                print(f"  [{i+1}/{len(papers)}] {detail}: {fname}")
            elif i < 5 or status == "FAIL":
                print(f"  [{i+1}/{len(papers)}] {status}: {fname} ({detail})")
            
            time.sleep(0.1)
        
        offset += BATCH
    
    print(f"\n{'='*50}")
    print(f"COMPLETE: {TOTAL_OK} downloaded | {TOTAL_SKIP} skipped | {TOTAL_FAIL} failed")
    print(f"Finished: {datetime.now().isoformat()}")

if __name__ == "__main__":
    main()
