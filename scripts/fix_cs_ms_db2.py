"""Match SME topic names to DB subtopics (with prefix) and insert past_papers records"""
import requests

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Get CS subject
r = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?code=eq.0478&select=id,display_name", headers=headers)
cs = r.json()[0]
cs_id = cs["id"]
print(f"CS 0478: {cs_id}")

# Get all subtopics
r = requests.get(f"{SUPABASE_URL}/rest/v1/topics?subject_id=eq.{cs_id}&select=id,display_name", headers=headers)
topic_ids = [t["id"] for t in r.json()]
r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics?topic_id=in.({','.join(topic_ids)})&select=id,display_name,slug,topic_id", headers=headers)
subtopics = r.json()
print(f"Found {len(subtopics)} subtopics")

# SME topic name → DB subtopic matching
SME_TOPICS = {
    "data storage & compression": "Data Storage & Compression",
    "methods of error detection": "Methods of Error Detection",
    "encryption": "Encryption",
    "computer architecture": "Computer Architecture",
    "network hardware": "Network Hardware",
    "types of software & interrupts": "Types of Software & Interrupts",
    "automated systems": "Automated Systems",
    "artificial intelligence": "Artificial Intelligence",
    "development life cycle": "Development Life Cycle",
    "computer sub-systems": "Computer Sub-Systems",
    "algorithms": "Algorithms",
    "standard methods of a solution": "Standard Methods of a Solution",
    "validation & verification": "Validation & Verification",
    "identifying errors": "Identifying Errors",
    "programming concepts": "Programming Concepts",
    "arrays": "Arrays",
    "sql": "SQL",
    "boolean logic": "Boolean Logic",
}

ok = 0
fail = 0
for sme_key, db_partial in SME_TOPICS.items():
    # Find matching subtopic by partial name
    matched = [st for st in subtopics if db_partial.lower() in st["display_name"].lower()]
    
    if not matched:
        # try exact slug match
        slug_key = sme_key.replace(" & ", "-").replace(" ", "-")
        matched = [st for st in subtopics if slug_key in st["slug"].lower()]
    
    if not matched:
        print(f"  NOT FOUND: {db_partial}")
        fail += 1
        continue
    
    st = matched[0]
    safe = sme_key.replace(" & ", "-").replace(" ", "-").replace("/", "-")
    safe = "".join(c for c in safe if c.isalnum() or c == "-")
    filename = f"cs-0478-{safe}-ms.pdf"
    file_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/cs-topic-questions/{st['id']}/{filename}"
    
    # Check if already exists
    c = requests.get(
        f"{SUPABASE_URL}/rest/v1/past_papers?subtopic_id=eq.{st['id']}&paper_type=eq.Topic+MS&select=id",
        headers=headers,
    )
    if c.status_code == 200 and c.json():
        print(f"  EXISTS: [{st['slug']}] {st['display_name']}")
        ok += 1
        continue
    
    body = {
        "subject_id": cs_id,
        "topic_id": st["topic_id"],
        "subtopic_id": st["id"],
        "title": f"{st['display_name']} MS",
        "file_url": file_url,
        "paper_type": "Topic MS",
        "is_free": True,
        "year": 2026,
        "season": "SME",
        "paper_number": "",
    }
    
    r = requests.post(f"{SUPABASE_URL}/rest/v1/past_papers", json=body, headers=headers)
    if r.status_code in (200, 201):
        print(f"  OK: [{st['slug']}] {st['display_name']}")
        ok += 1
    else:
        print(f"  FAIL: [{st['slug']}] {st['display_name']} -> {r.status_code} {r.text[:150]}")
        fail += 1

print(f"\nDONE: {ok} ok, {fail} fail")
