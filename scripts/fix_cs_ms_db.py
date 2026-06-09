"""Fix DB inserts for CS 0478 MS PDFs already in Storage"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Get CS subject
r = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?code=eq.0478&select=id", headers=headers)
cs_id = r.json()[0]["id"]
print(f"CS 0478 ID: {cs_id}")

# Get subtopics
r = requests.get(f"{SUPABASE_URL}/rest/v1/topics?subject_id=eq.{cs_id}&select=id,display_name", headers=headers)
topic_ids = [t["id"] for t in r.json()]
r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics?topic_id=in.({','.join(topic_ids)})&select=id,display_name,topic_id", headers=headers)
st_map = {st["display_name"].lower().strip(): st for st in r.json()}

MS_NAMES = [
    "Data Storage & Compression", "Methods of Error Detection", "Encryption",
    "Computer Architecture", "Network Hardware", "Types of Software & Interrupts",
    "Automated Systems", "Artificial Intelligence",
    "Computer Sub-Systems", "Algorithms", "Standard Methods of a Solution",
    "Validation & Verification", "Identifying Errors", "Programming Concepts",
    "Arrays", "SQL", "Boolean Logic",
]

ok = 0
fail = 0
for name in MS_NAMES:
    st = st_map.get(name.lower().strip())
    if not st:
        print(f"NOT FOUND: {name}")
        fail += 1
        continue
    
    safe = name.lower().replace(" ", "-").replace("&", "and")
    safe = "".join(c for c in safe if c.isalnum() or c == "-")
    file_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/cs-topic-questions/{st['id']}/cs-0478-{safe}-ms.pdf"
    
    body = {
        "subject_id": cs_id,
        "topic_id": st["topic_id"],
        "subtopic_id": st["id"],
        "title": f"{name} MS",
        "file_url": file_url,
        "paper_type": "Topic MS",
        "is_free": True,
        "year": 2026,
        "season": "SME",
        "paper_number": "",
    }
    
    # Check if exists
    c = requests.get(
        f"{SUPABASE_URL}/rest/v1/past_papers?subtopic_id=eq.{st['id']}&paper_type=eq.Topic+MS&select=id",
        headers=headers,
    )
    if c.status_code == 200 and c.json():
        print(f"  EXISTS: {name}")
        ok += 1
        continue
    
    r = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body, headers=headers)
    if r.status_code in (200, 201):
        print(f"  OK: {name}")
        ok += 1
    else:
        print(f"  FAIL: {name} -> {r.status_code} {r.text[:150]}")
        fail += 1

print(f"\nDONE: {ok} ok, {fail} fail")
