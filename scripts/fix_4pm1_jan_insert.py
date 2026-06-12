#!/usr/bin/env python3
"""Re-insert January 4PM1 past papers that were missed."""
import requests

MGMT_TOKEN = ""
PROJECT_REF = "aondldqwwvttwpervrfq"
SUBJECT_ID = "04164d42-c352-4f42-9659-620fbd154d70"

papers = [
    (2020, "January", "Jan", "P1", "QP"), (2020, "January", "Jan", "P1", "MS"),
    (2020, "January", "Jan", "P2", "QP"), (2020, "January", "Jan", "P2", "MS"),
    (2020, "January", "Jan", "P1R", "QP"), (2020, "January", "Jan", "P1R", "MS"),
    (2020, "January", "Jan", "P2R", "QP"), (2020, "January", "Jan", "P2R", "MS"),
    (2022, "January", "Jan", "P1", "QP"), (2022, "January", "Jan", "P1", "MS"),
    (2022, "January", "Jan", "P2", "QP"), (2022, "January", "Jan", "P2", "MS"),
    (2022, "January", "Jan", "P1R", "QP"), (2022, "January", "Jan", "P1R", "MS"),
    (2022, "January", "Jan", "P2R", "QP"), (2022, "January", "Jan", "P2R", "MS"),
]

for year, db_season, sdir, paper, ptype in papers:
    r2_key = f"igcse/further-maths/edexcel/past-papers/{year}/{sdir}/{paper}_{ptype}.pdf"
    file_url = f"r2://past-papers/{r2_key}"
    title = f"Paper {paper} {ptype}"
    
    r = requests.post(f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        headers={"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"},
        json={"query": f"""INSERT INTO past_papers (subject_id, title, year, season, paper_number, paper_type, file_url, is_free)
VALUES ('{SUBJECT_ID}', '{title}', {year}, '{db_season}', '{paper}', '{ptype}', '{file_url}', true)
ON CONFLICT DO NOTHING;"""})
    status = "✅" if r.status_code == 201 else f"⚠️ {r.status_code}"
    print(f"{year} {db_season} {paper} {ptype} {status}")

# Verify
r = requests.post(f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
    headers={"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"},
    json={"query": f"SELECT season, year, COUNT(*) as cnt FROM past_papers WHERE subject_id = '{SUBJECT_ID}' AND season='January' GROUP BY season, year"})
print(f"\nJanuary records now: {r.json()}")
