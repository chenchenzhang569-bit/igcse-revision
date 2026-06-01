"""Debug: find beryl user"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
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
