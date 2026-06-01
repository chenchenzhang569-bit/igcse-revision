"""Add all-subjects purchase for beryl_zhong"""
import requests, uuid
from datetime import datetime, timedelta

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "Prefer": "return=representation"}

user_id = "5d05e00e-4f5c-4f39-ae9a-673bc4b246b0"

# Check existing purchases
r = requests.get(f"{SUPABASE_URL}/rest/v1/purchases?user_id=eq.{user_id}&select=*", headers=h)
existing = r.json()
print(f"Existing purchases: {len(existing)}")
for p in existing:
    print(f"  subject_id={p['subject_id']}, status={p['status']}, expires={p['expires_at']}")

# Add all-subjects purchase if not already exists
has_all = any(p.get("subject_id") is None and p["status"] == "paid" for p in existing)
if has_all:
    print("Already has all-subjects paid purchase!")
else:
    now = datetime.utcnow()
    expires = now + timedelta(days=365)
    
    body = {
        "user_id": user_id,
        "subject_id": None,
        "amount_cny": 25000,
        "alipay_trade_no": f"admin_grant_{uuid.uuid4().hex[:12]}",
        "status": "paid",
        "paid_at": now.isoformat(),
        "expires_at": expires.isoformat(),
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/purchases", json=body, headers=h)
    print(f"Insert: {r.status_code}")
    if r.status_code in (200, 201):
        print(f"Created! ID: {r.json()[0]['id']}, expires: {r.json()[0]['expires_at']}")
    else:
        print(f"Error: {r.text[:300]}")
