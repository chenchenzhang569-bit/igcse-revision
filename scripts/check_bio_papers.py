"""Check biology past papers QP vs MS discrepancy"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# Get Biology subject
r = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?code=eq.0610&select=id,display_name", headers=headers)
if r.json():
    bio = r.json()[0]
    bio_id = bio["id"]
    print(f"Biology: {bio['display_name']} (ID: {bio_id})")
else:
    # Try without code filter
    r = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?display_name=ilike.*biology*&select=id,display_name,code", headers=headers)
    print(f"Subjects found: {r.json()}")
    bio = r.json()[0] if r.json() else None
    if not bio:
        print("Biology not found!")
        exit()
    bio_id = bio["id"]

# Get paper_type distribution
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/past_papers?subject_id=eq.{bio_id}&select=paper_type,year,season,paper_number,title",
    headers=headers
)
papers = r.json()
print(f"\nTotal papers: {len(papers)}")

# Count by type
from collections import Counter
type_counts = Counter(p["paper_type"] for p in papers)
print("\nBy paper_type:")
for t, c in sorted(type_counts.items()):
    print(f"  {t}: {c}")

# Find QP papers without matching MS
qp_papers = [p for p in papers if p["paper_type"] in ("Question Paper", "QP")]
ms_papers = [p for p in papers if p["paper_type"] in ("Mark Scheme", "MS")]

print(f"\nQP count: {len(qp_papers)}")
print(f"MS count: {len(ms_papers)}")

# Build key sets
qp_keys = set()
for p in qp_papers:
    key = f"{p['year']}|{p['season']}|{p['paper_number']}"
    qp_keys.add(key)

ms_keys = set()
for p in ms_papers:
    key = f"{p['year']}|{p['season']}|{p['paper_number']}"
    ms_keys.add(key)

qp_only = qp_keys - ms_keys
ms_only = ms_keys - qp_keys

print(f"\nQP only (no MS): {len(qp_only)}")
for k in sorted(qp_only):
    print(f"  {k}")

print(f"\nMS only (no QP): {len(ms_only)}")
for k in sorted(ms_only):
    print(f"  {k}")
