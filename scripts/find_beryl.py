"""Debug: find beryl user"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
h = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# profiles
r = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?select=*", headers=h)
data = r.json()
print(f"Type: {type(data).__name__}")
if isinstance(data, list):
    print(f"Count: {len(data)}")
    for p in data:
        print(f"  {p}")
elif isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    print(f"  {data}")
