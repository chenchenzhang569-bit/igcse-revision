"""Upload Biology 0610 2024 May/Jun QP Paper 52"""
import requests, uuid

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
h = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

bio_id = "2dcd4850-8512-4913-b922-559a2d3412bc"

# Check if QP already exists in storage
qp_path = "0610/2024/0610_s24_qp_52.pdf"
r = requests.head(f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{qp_path}", headers=h)
print(f"QP in Storage: HTTP {r.status_code}")

if r.status_code == 200:
    # Already exists, just create DB record
    pub_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{qp_path}"
    body = {
        "subject_id": bio_id,
        "title": "CAIE IGCSE Biology-0610 - 2024 May/Jun - QP Paper 52",
        "file_url": pub_url,
        "paper_type": "Question Paper",
        "year": 2024,
        "season": "May/Jun",
        "paper_number": "52",
        "is_free": True,
    }
    r2 = requests.post(
        f"{SUPABASE_URL}/rest/v1/past_papers",
        json=body,
        headers={**h, "Content-Type": "application/json", "Prefer": "return=representation"},
    )
    if r2.status_code in (200, 201):
        print(f"DB record created: {r2.json()[0]['id']}")
    else:
        print(f"DB insert failed: {r2.status_code} {r2.text[:200]}")
else:
    print("File not in Storage yet. Upload via admin upload page or put file at path:")
    print(f"  {qp_path}")
    print(f"\nOr run this to upload from local file:")
    print(f"  curl -X POST '{SUPABASE_URL}/storage/v1/object/past-papers/{qp_path}' \\")
    print(f"    -H 'Authorization: Bearer {KEY}' \\")
    print(f"    -H 'Content-Type: application/pdf' \\")
    print(f"    --data-binary @0610_s24_qp_52.pdf")
