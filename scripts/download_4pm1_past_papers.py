#!/usr/bin/env python3
"""Download 4PM1 past papers from Paperlords → upload R2 → insert DB."""
import json, re, subprocess, os, time, sys, urllib.parse, urllib.request

MGMT_TOKEN = ""
PROJECT_REF = "aondldqwwvttwpervrfq"
R2_BUCKET = "past-papers"
R2_PREFIX = "igcse/further-maths/edexcel/past-papers"
SUBJECT_SLUG = "edexcel-further-maths-4pm1"

# Subject UUID (lookup)
r = subprocess.run(["curl", "-s",
    f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
    "-H", f"Authorization: Bearer {MGMT_TOKEN}",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"query": f"SELECT id FROM subjects WHERE slug = '{SUBJECT_SLUG}'"})],
    capture_output=True, text=True, timeout=15)
SUBJECT_ID = json.loads(r.stdout)[0]["id"]
print(f"Subject ID: {SUBJECT_ID}")

BASE = "https://archive.paperlords.org/library/IGCSE/Further%20Pure%20Maths"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# Full availability matrix
papers = [
    # (year, season_DB, season_dir, season_fname, papers_with_ms)
    (2025, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P2","QP")]),  # no MS
    (2024, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2023, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2022, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2021, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2020, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2019, "May/Jun", "MayJune", "MayJune", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2025, "Nov", "Nov", "Nov", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2023, "Nov", "Nov", "Nov", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
    (2021, "Nov", "Nov", "Nov", [("P1","QP"),("P1","MS"),("P2","QP"),("P2","MS")]),
]

os.makedirs("/tmp/4pm1_pastpapers", exist_ok=True)

total = sum(len(pps) for _,_,_,_,pps in papers)
done = 0

for year, db_season, sdir, sm, pp_list in papers:
    for paper, ptype in pp_list:
        done += 1
        filename = f"IGCSE_FURTHER_PURE_MATHEMATICS_{year}_{sm}_{paper}_{ptype}.pdf"
        url = f"{BASE}/{sdir}%20{year}/{urllib.parse.quote(filename)}"
        local = f"/tmp/4pm1_pastpapers/{filename}"
        
        print(f"[{done}/{total}] {year} {db_season} {paper} {ptype}...", end=" ", flush=True)
        
        # Download
        req = urllib.request.Request(url, method="GET", headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
        except Exception as e:
            print(f"FAILED download: {e}")
            continue
        
        if len(data) < 10000:
            print(f"too small ({len(data)}B), skip")
            continue
        
        with open(local, "wb") as f:
            f.write(data)
        size_kb = len(data)//1024
        print(f"{size_kb}KB ", end="", flush=True)
        
        # Upload to R2
        r2_key = f"{R2_PREFIX}/{year}/{sdir}/{paper}_{ptype}.pdf"
        r = subprocess.run(["python3", "-c", f"""
import boto3
s3 = boto3.client("s3",
    endpoint_url="https://7524670a3d7d50fd979765dedb5b378d.r2.cloudflarestorage.com",
    aws_access_key_id="",
    aws_secret_access_key="",
    region_name="auto")
with open('{local}', 'rb') as f:
    s3.put_object(Bucket='{R2_BUCKET}', Key='{r2_key}', Body=f)
print('OK')
"""], capture_output=True, text=True, timeout=30)
        if r.stdout.strip() != "OK":
            print(f"R2 fail: {r.stderr[:100]}", end="")
            continue
        
        file_url = f"r2://past-papers/{r2_key}"
        
        # Insert DB record  
        title = f"Paper {paper} {ptype}"
        r = subprocess.run(["curl", "-s", "-X", "POST",
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            "-H", f"Authorization: Bearer {MGMT_TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"query": f"""INSERT INTO past_papers (subject_id, title, year, season, paper_number, paper_type, file_url, is_free)
VALUES ('{SUBJECT_ID}', '{title}', {year}, '{db_season}', '{paper}', '{ptype}', '{file_url}', true)
ON CONFLICT DO NOTHING;"""})],
            capture_output=True, text=True, timeout=15)
        print(f"DB {'✅' if r.returncode==0 else '⚠️'}")
        
        os.remove(local)
        time.sleep(0.5)  # rate limit

print(f"\n{'='*40}\nDone! {done} files processed")
