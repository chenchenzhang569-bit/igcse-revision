#!/usr/bin/env python3
"""Download 4PM1 R papers from Paperlords → upload R2 → insert DB."""
import json, re, subprocess, os, time, sys, urllib.parse, urllib.request

MGMT_TOKEN = ""
PROJECT_REF = "aondldqwwvttwpervrfq"
R2_BUCKET = "past-papers"
R2_PREFIX = "igcse/further-maths/edexcel/past-papers"

SUBJECT_ID = "04164d42-c352-4f42-9659-620fbd154d70"

BASE = "https://archive.paperlords.org/library/IGCSE/Further%20Pure%20Maths"
HEADERS = {"User-Agent": "Mozilla/5.0"}

papers = [
    # (year, season_DB, season_dir, season_fname, paper, type)
    (2025, "May/Jun", "MayJune", "MayJune", "P1R", "QP"),
    (2025, "May/Jun", "MayJune", "MayJune", "P2R", "QP"),
    (2024, "May/Jun", "MayJune", "MayJune", "P1R", "QP"),
    (2024, "May/Jun", "MayJune", "MayJune", "P1R", "MS"),
    (2024, "May/Jun", "MayJune", "MayJune", "P2R", "QP"),
    (2024, "May/Jun", "MayJune", "MayJune", "P2R", "MS"),
    (2023, "May/Jun", "MayJune", "MayJune", "P1R", "QP"),
    (2023, "May/Jun", "MayJune", "MayJune", "P1R", "MS"),
    (2023, "May/Jun", "MayJune", "MayJune", "P2R", "QP"),
    (2023, "May/Jun", "MayJune", "MayJune", "P2R", "MS"),
    (2022, "May/Jun", "MayJune", "MayJune", "P1R", "QP"),
    (2022, "May/Jun", "MayJune", "MayJune", "P1R", "MS"),
    (2022, "May/Jun", "MayJune", "MayJune", "P2R", "QP"),
    (2022, "May/Jun", "MayJune", "MayJune", "P2R", "MS"),
    (2020, "May/Jun", "MayJune", "MayJune", "P1R", "QP"),
    (2020, "May/Jun", "MayJune", "MayJune", "P1R", "MS"),
    (2020, "May/Jun", "MayJune", "MayJune", "P2R", "QP"),
    (2020, "May/Jun", "MayJune", "MayJune", "P2R", "MS"),
    (2019, "May/Jun", "MayJune", "MayJune", "P1R", "QP"),
    (2019, "May/Jun", "MayJune", "MayJune", "P1R", "MS"),
    (2019, "May/Jun", "MayJune", "MayJune", "P2R", "QP"),
    (2019, "May/Jun", "MayJune", "MayJune", "P2R", "MS"),
]

os.makedirs("/tmp/4pm1_r", exist_ok=True)
done = 0
total = len(papers)

for year, db_season, sdir, sm, paper, ptype in papers:
    done += 1
    filename = f"IGCSE_FURTHER_PURE_MATHEMATICS_{year}_{sm}_{paper}_{ptype}.pdf"
    url = f"{BASE}/{sdir}%20{year}/{urllib.parse.quote(filename)}"
    local = f"/tmp/4pm1_r/{filename}"
    
    print(f"[{done}/{total}] {year} {db_season} {paper} {ptype}...", end=" ", flush=True)
    
    req = urllib.request.Request(url, method="GET", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
    except Exception as e:
        print(f"FAIL: {e}")
        continue
    
    if len(data) < 10000:
        print(f"too small ({len(data)}B)")
        continue
    
    sz = len(data)//1024
    print(f"{sz}KB ", end="", flush=True)
    with open(local, "wb") as f: f.write(data)
    
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
        print(f"R2: {r.stderr[:100]}", end="")
        continue
    
    file_url = f"r2://past-papers/{r2_key}"
    r = subprocess.run(["curl", "-s", "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-H", f"Authorization: Bearer {MGMT_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": f"""INSERT INTO past_papers (subject_id, title, year, season, paper_number, paper_type, file_url, is_free)
VALUES ('{SUBJECT_ID}', 'Paper {paper} {ptype}', {year}, '{db_season}', '{paper}', '{ptype}', '{file_url}', true)
ON CONFLICT DO NOTHING;"""})],
        capture_output=True, text=True, timeout=15)
    print(f"DB ✅" if r.returncode==0 else f"DB ⚠️")
    os.remove(local)
    time.sleep(0.5)

print(f"\nDone! {done} R papers processed")
