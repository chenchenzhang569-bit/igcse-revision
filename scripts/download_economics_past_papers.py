#!/usr/bin/env python3
"""
Download Edexcel Economics 4EC1 past papers from Paperlords.
Upload to R2, insert into past_papers table.
"""
import json, os, sys, time, urllib.request

# ── Config ──
SUBJECT_ID = "9acca9c0-2e35-4665-b4fa-7e0bb41be518"
SUBJECT_SLUG = "edexcel-economics-4ec1"

BASE = "https://archive.paperlords.org/library/IGCSE/Economics"
SUBJ = "ECONOMICS"
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}

# Season mappings
# URL season → DB season, R2 directory
SEASONS = {
    "MayJune": ("May/Jun", "MayJun"),
    "Nov": ("Oct/Nov", "Nov"),
    "Jan": ("January", "Jan"),
}

PAPERS = ["P1", "P2", "P1R", "P2R"]
TYPES = ["QP", "MS"]
YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019]

KNOWN_GOOD = [
    (2019, "MayJune", "P1", "QP"), (2019, "MayJune", "P1", "MS"),
    (2019, "MayJune", "P2", "QP"), (2019, "MayJune", "P2", "MS"),
    (2019, "MayJune", "P1R", "QP"), (2019, "MayJune", "P1R", "MS"),
    (2019, "MayJune", "P2R", "QP"), (2019, "MayJune", "P2R", "MS"),
    (2020, "Jan", "P1", "QP"), (2020, "Jan", "P1", "MS"),
    (2020, "Jan", "P2", "QP"), (2020, "Jan", "P2", "MS"),
    (2020, "Jan", "P1R", "QP"), (2020, "Jan", "P1R", "MS"),
    (2020, "Jan", "P2R", "QP"), (2020, "Jan", "P2R", "MS"),
    (2020, "MayJune", "P1", "QP"), (2020, "MayJune", "P1", "MS"),
    (2020, "MayJune", "P2", "QP"), (2020, "MayJune", "P2", "MS"),
    (2020, "MayJune", "P1R", "QP"), (2020, "MayJune", "P1R", "MS"),
    (2020, "MayJune", "P2R", "QP"), (2020, "MayJune", "P2R", "MS"),
    (2021, "MayJune", "P1", "QP"), (2021, "MayJune", "P1", "MS"),
    (2021, "MayJune", "P2", "QP"), (2021, "MayJune", "P2", "MS"),
    (2021, "Nov", "P1", "QP"), (2021, "Nov", "P1", "MS"),
    (2021, "Nov", "P2", "QP"), (2021, "Nov", "P2", "MS"),
    (2022, "MayJune", "P1", "QP"), (2022, "MayJune", "P1", "MS"),
    (2022, "MayJune", "P2", "QP"), (2022, "MayJune", "P2", "MS"),
    (2022, "MayJune", "P1R", "QP"), (2022, "MayJune", "P1R", "MS"),
    (2022, "MayJune", "P2R", "QP"), (2022, "MayJune", "P2R", "MS"),
    (2023, "Nov", "P1", "QP"), (2023, "Nov", "P2", "QP"),
    (2024, "MayJune", "P1", "QP"), (2024, "MayJune", "P2", "QP"),
    (2024, "MayJune", "P1R", "QP"), (2024, "MayJune", "P1R", "MS"),
    (2024, "MayJune", "P2R", "QP"), (2024, "MayJune", "P2R", "MS"),
    (2024, "Nov", "P1", "QP"), (2024, "Nov", "P1", "MS"),
    (2024, "Nov", "P2", "QP"), (2024, "Nov", "P2", "MS"),
    (2025, "Nov", "P1", "QP"), (2025, "Nov", "P1", "MS"),
    (2025, "Nov", "P2", "QP"), (2025, "Nov", "P2", "MS"),
]

# ── Download ──
print(f"Downloading {len(KNOWN_GOOD)} files...", file=sys.stderr)

import boto3
s3 = boto3.client("s3",
    endpoint_url="https://7524670a3d7d50fd979765dedb5b378d.r2.cloudflarestorage.com",
    aws_access_key_id="",
    aws_secret_access_key="",
    region_name="auto",
)

success = 0
failed = []
db_records = []

for year, season_url, paper, ptype in KNOWN_GOOD:
    url = f"{BASE}/{season_url}%20{year}/IGCSE_{SUBJ}_{year}_{season_url}_{paper}_{ptype}.pdf"
    print(f"  {year} {season_url} {paper} {ptype}...", file=sys.stderr)

    # Download
    req = urllib.request.Request(url, method="GET", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read()
    except Exception as e:
        print(f"    ✗ Download failed: {e}", file=sys.stderr)
        failed.append(f"{year}_{season_url}_{paper}_{ptype}")
        continue

    if len(data) < 10000:
        print(f"    ✗ Too small ({len(data)} bytes)", file=sys.stderr)
        failed.append(f"{year}_{season_url}_{paper}_{ptype}")
        continue

    # Upload to R2
    season_db, season_dir = SEASONS[season_url]
    r2_key = f"igcse/economics/edexcel/past-papers/{year}/{season_dir}/{paper}_{ptype}.pdf"
    try:
        s3.put_object(
            Bucket="past-papers",
            Key=r2_key,
            Body=data,
            ContentType="application/pdf",
        )
    except Exception as e:
        print(f"    ✗ R2 upload failed: {e}", file=sys.stderr)
        failed.append(f"{year}_{season_url}_{paper}_{ptype}")
        continue

    # DB record
    title = f"Paper {paper} {ptype}"
    file_url = f"r2://past-papers/{r2_key}"
    db_records.append({
        "subject_id": SUBJECT_ID,
        "title": title,
        "year": year,
        "season": season_db,
        "paper_number": paper,
        "paper_type": ptype,
        "file_url": file_url,
        "is_free": False,
    })

    print(f"    ✓ {len(data)//1024}KB", file=sys.stderr)
    success += 1
    time.sleep(0.3)

print(f"\nDownloaded: {success}, Failed: {len(failed)}", file=sys.stderr)
if failed:
    print(f"Failed: {failed}", file=sys.stderr)

# ── Insert into DB ──
if db_records:
    print(f"\nInserting {len(db_records)} records into past_papers...", file=sys.stderr)

    MGMT_TOKEN = ""
    MGMT_URL = "https://api.supabase.com/v1/projects/aondldqwwvttwpervrfq/database/query"
    MGMT_H = {"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"}

    # Delete existing exam papers for this subject
    import subprocess
    subprocess.run([
        "curl", "-s", "-X", "POST", MGMT_URL,
        "-H", f"Authorization: Bearer {MGMT_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": f"DELETE FROM past_papers WHERE subject_id = '{SUBJECT_ID}' AND season != 'Topic';"})
    ], capture_output=True, text=True, timeout=15)

    # Insert in batches
    for i in range(0, len(db_records), 10):
        batch = db_records[i:i+10]
        rows = []
        for r in batch:
            title = r["title"].replace("'", "''")
            furi = r["file_url"].replace("'", "''")
            rows.append(
                f"('{r['subject_id']}','{title}',{r['year']},'{r['season']}','{r['paper_number']}','{r['paper_type']}','{furi}',{str(r['is_free']).lower()})"
            )
        sql = f"""INSERT INTO past_papers (subject_id, title, year, season, paper_number, paper_type, file_url, is_free)
VALUES {','.join(rows)};"""
        r = subprocess.run([
            "curl", "-s", "-X", "POST", MGMT_URL,
            "-H", f"Authorization: Bearer {MGMT_TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"query": sql})
        ], capture_output=True, text=True, timeout=30)
        if r.returncode != 0 or (r.stdout and '"error"' in r.stdout):
            print(f"  ✗ Batch {i//10} failed", file=sys.stderr)

    print(f"  ✓ {len(db_records)} records inserted", file=sys.stderr)

print("\n=== Done! ===", file=sys.stderr)
