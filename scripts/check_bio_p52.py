"""Check what Paper 52 records exist for Biology"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
h = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
bio_id = "2dcd4850-8512-4913-b922-559a2d3412bc"

# All paper 52
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/past_papers?subject_id=eq.{bio_id}&year=eq.2024&paper_number=eq.52&select=id,title,paper_type,season,file_url",
    headers=h,
)
print(f"Paper 52 records: {len(r.json())}")
for p in r.json():
    print(f"  [{p['season']}] [{p['paper_type']}] {p['title']}")
    print(f"    URL: {p['file_url']}")
