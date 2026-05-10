#!/usr/bin/env python3
"""
Import scraped past papers into Supabase past_papers table.
Uses service_role key for INSERT (RLS restricts anon key).
"""

import json
import sys
import os
import requests

# Load env
env = {}
with open(os.path.expanduser("~/igcse-site/.env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k] = v

SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
ANON_KEY = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

API = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

SUBJECT_CODE_MAP = {
    "0580": "caie-mathematics-0580",
    "0625": "caie-physics-0625",
    "0620": "caie-chemistry-0620",
    "0610": "caie-biology-0610",
}

def get_subject_ids():
    """Fetch subject UUIDs from Supabase"""
    r = requests.get(
        f"{API}/subjects?select=id,slug,code",
        headers={**HEADERS, "Prefer": ""}
    )
    r.raise_for_status()
    subjects = r.json()
    id_map = {}
    for s in subjects:
        code = s.get("code", "")
        if code in SUBJECT_CODE_MAP:
            id_map[code] = s["id"]
    return id_map

def insert_papers(papers, batch_size=500):
    """Insert papers in batches via REST API"""
    total = len(papers)
    inserted = 0
    errors = []
    
    for i in range(0, total, batch_size):
        batch = papers[i:i+batch_size]
        sys.stdout.write(f"\r  Inserting {i+1}-{min(i+batch_size, total)}/{total}...")
        sys.stdout.flush()
        
        r = requests.post(
            f"{API}/past_papers",
            headers=HEADERS,
            json=batch,
            timeout=60
        )
        
        if r.status_code in (200, 201, 204):
            inserted += len(batch)
        else:
            # Try one by one for this batch
            for paper in batch:
                r2 = requests.post(
                    f"{API}/past_papers",
                    headers=HEADERS,
                    json=paper,
                    timeout=30
                )
                if r2.status_code in (200, 201, 204):
                    inserted += 1
                else:
                    errors.append(f"  {paper['subject_code']} {paper['year']} {paper['season']} P{paper['paper_number']}: {r2.status_code} {r2.text[:100]}")
    
    print(f"\n  Done: {inserted}/{total} inserted, {len(errors)} errors")
    for e in errors[:10]:
        print(e)
    return inserted

def main():
    print("Loading data...", flush=True)
    with open("/tmp/pastpapers_data.json") as f:
        data = json.load(f)
    
    # Filter valid subjects only
    valid = [p for p in data if p["subject_code"] in SUBJECT_CODE_MAP]
    print(f"Valid papers: {len(valid)}", flush=True)
    
    print("Getting subject IDs...", flush=True)
    subject_ids = get_subject_ids()
    print(f"Found subjects: {list(subject_ids.keys())}", flush=True)
    
    if not subject_ids:
        print("ERROR: No matching subjects found in database!")
        print("Make sure seed data has been run and subjects exist.")
        return
    
    # Map papers to DB rows
    rows = []
    skipped = 0
    for p in valid:
        subject_id = subject_ids.get(p["subject_code"])
        if not subject_id:
            skipped += 1
            continue
        
        # Skip paper_number 0 (these are usually CI/GT files, not real papers)
        if p["paper_number"] == 0:
            skipped += 1
            continue
        
        row = {
            "subject_id": subject_id,
            "title": p["title"],
            "year": p["year"],
            "season": p["season"],
            "paper_number": p["paper_number"],
            "paper_type": p["paper_type"],
            "file_url": p["file_url"],
            "is_free": True,
        }
        rows.append(row)
    
    print(f"Ready to insert: {len(rows)} rows (skipped {skipped} non-papers)", flush=True)
    
    if not rows:
        print("Nothing to insert!")
        return
    
    # Check existing
    r = requests.get(
        f"{API}/past_papers?select=id&limit=1",
        headers={"apikey": ANON_KEY}
    )
    if r.status_code == 200:
        existing = len(r.json()) > 0
        print(f"Database reachable, has data: {existing}", flush=True)
    else:
        print(f"DB check: {r.status_code} - {r.text[:100]}", flush=True)
    
    inserted = insert_papers(rows)
    print(f"\nTotal inserted: {inserted}")

if __name__ == "__main__":
    main()
