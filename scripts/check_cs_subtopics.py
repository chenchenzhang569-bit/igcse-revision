"""Check DB subtopic names for CS 0478"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"

headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# Get CS subject
r = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?code=eq.0478&select=id,display_name", headers=headers)
cs = r.json()[0]
print(f"CS: {cs}")

# Get topics
r = requests.get(f"{SUPABASE_URL}/rest/v1/topics?subject_id=eq.{cs['id']}&select=id,display_name", headers=headers)
topics = r.json()
topic_ids = [t["id"] for t in topics]

# Get subtopics
r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics?topic_id=in.({','.join(topic_ids)})&select=id,display_name,slug,topic_id", headers=headers)
subtopics = r.json()

print(f"\nAll {len(subtopics)} subtopics:")
for st in subtopics:
    print(f"  [{st['slug']}] {st['display_name']}")
