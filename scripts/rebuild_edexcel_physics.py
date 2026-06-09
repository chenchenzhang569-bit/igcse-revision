import os, requests, json

SKEY = os.environ.get("SERVICE_ROLE_KEY", "")
ANON = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"
HEADERS = {"apikey": ANON, "Authorization": f"Bearer {SKEY}", "Content-Type": "application/json"}

topic_ids = [
    "9ca67dcf-723b-4890-835e-14522956f71b",
    "3fcb8cfe-27a3-475d-98a7-2e0c4b17154e",
    "71d0b029-5a92-49f0-9701-2588f02f1f5c",
    "aab608cc-fbd4-4412-90a4-92137cf8e1d0",
    "213f4185-8ac5-4371-afaf-622d7a011521",
    "f0ad45ea-8d94-492e-959d-42eb7da2c045",
    "54306bcd-6ea1-4e78-ba6b-5d5cfc5dad81",
    "b57580b8-92ea-4cf4-be82-2873d073dadb",
]
tid_str = ",".join(topic_ids)

# 1. Nullify past_papers
r = requests.patch(f"{API}/past_papers?topic_id=in.({tid_str})", json={"subtopic_id": None, "topic_id": None}, headers=HEADERS)
print(f"1. Nullify past_papers: {r.status_code}")

# 2. Delete subtopics
r = requests.delete(f"{API}/subtopics?topic_id=in.({tid_str})", headers=HEADERS)
print(f"2. Delete subtopics: {r.status_code}")

# 3. Insert new subtopics
subtopics = [
    {"topic_id": topic_ids[0], "name": "1.1 Movement/Position", "display_name": "Movement & Position", "slug": "1-1-movement-and-position", "sort_order": 1},
    {"topic_id": topic_ids[0], "name": "1.2 Forces,Movement/Changing Shape", "display_name": "Forces, Movement & Changing Shape", "slug": "1-2-forces-movement-and-changing-shape", "sort_order": 2},
    {"topic_id": topic_ids[0], "name": "1.3 Momentum", "display_name": "Momentum", "slug": "1-3-momentum", "sort_order": 3},
    {"topic_id": topic_ids[0], "name": "1.4 Moments", "display_name": "Moments", "slug": "1-4-moments", "sort_order": 4},
    {"topic_id": topic_ids[1], "name": "2.1 Current,Potential Difference/Resistance", "display_name": "Current, Potential Difference & Resistance", "slug": "2-1-current-potential-difference-and-resistance", "sort_order": 1},
    {"topic_id": topic_ids[1], "name": "2.2 Components Series/Parallel Circuits", "display_name": "Components in Series & Parallel Circuits", "slug": "2-2-components-in-series-and-parallel-circuits", "sort_order": 2},
    {"topic_id": topic_ids[1], "name": "2.3 Electrical Power/Mains Electricity", "display_name": "Electrical Power & Mains Electricity", "slug": "2-3-electrical-power-and-mains-electricity", "sort_order": 3},
    {"topic_id": topic_ids[1], "name": "2.4 Static Electricity", "display_name": "Static Electricity", "slug": "2-4-static-electricity", "sort_order": 4},
    {"topic_id": topic_ids[2], "name": "3.1 Waves/Electromagnetic Spectrum", "display_name": "Waves & The Electromagnetic Spectrum", "slug": "3-1-waves-and-the-electromagnetic-spectrum", "sort_order": 1},
    {"topic_id": topic_ids[2], "name": "3.2 Reflection/Refraction", "display_name": "Reflection & Refraction", "slug": "3-2-reflection-and-refraction", "sort_order": 2},
    {"topic_id": topic_ids[2], "name": "3.3 Sound", "display_name": "Sound", "slug": "3-3-sound", "sort_order": 3},
    {"topic_id": topic_ids[3], "name": "4.1 Energy Stores/Transfers", "display_name": "Energy Stores & Transfers", "slug": "4-1-energy-stores-and-transfers", "sort_order": 1},
    {"topic_id": topic_ids[3], "name": "4.2 Work,Power/Energy Resources", "display_name": "Work, Power & Energy Resources", "slug": "4-2-work-power-and-energy-resources", "sort_order": 2},
    {"topic_id": topic_ids[4], "name": "5.1 Density/Pressure", "display_name": "Density & Pressure", "slug": "5-1-density-and-pressure", "sort_order": 1},
    {"topic_id": topic_ids[4], "name": "5.2 Changes of State", "display_name": "Changes of State", "slug": "5-2-changes-of-state", "sort_order": 2},
    {"topic_id": topic_ids[4], "name": "5.3 Ideal Gases", "display_name": "Ideal Gases", "slug": "5-3-ideal-gases", "sort_order": 3},
    {"topic_id": topic_ids[5], "name": "6.1 Magnetism/Electromagnetism", "display_name": "Magnetism & Electromagnetism", "slug": "6-1-magnetism-and-electromagnetism", "sort_order": 1},
    {"topic_id": topic_ids[5], "name": "6.2 Electromagnetic Induction", "display_name": "Electromagnetic Induction", "slug": "6-2-electromagnetic-induction", "sort_order": 2},
    {"topic_id": topic_ids[6], "name": "7.1 Properties of Radiation", "display_name": "Properties of Radiation", "slug": "7-1-properties-of-radiation", "sort_order": 1},
    {"topic_id": topic_ids[6], "name": "7.2 Radioactivity,Uses/Dangers", "display_name": "Radioactivity, Uses & Dangers", "slug": "7-2-radioactivity-uses-and-dangers", "sort_order": 2},
    {"topic_id": topic_ids[6], "name": "7.3 Fission/Fusion", "display_name": "Fission & Fusion", "slug": "7-3-fission-and-fusion", "sort_order": 3},
    {"topic_id": topic_ids[7], "name": "8.1 Motion in the Universe", "display_name": "Motion in the Universe", "slug": "8-1-motion-in-the-universe", "sort_order": 1},
    {"topic_id": topic_ids[7], "name": "8.2 Stellar Evolution", "display_name": "Stellar Evolution", "slug": "8-2-stellar-evolution", "sort_order": 2},
    {"topic_id": topic_ids[7], "name": "8.3 Cosmology", "display_name": "Cosmology", "slug": "8-3-cosmology", "sort_order": 3},
]

for i in range(0, len(subtopics), 5):
    batch = subtopics[i : i + 5]
    r = requests.post(f"{API}/subtopics", json=batch, headers={**HEADERS, "Prefer": "return=representation"})
    print(f"3.{i//5+1} Insert batch: {r.status_code}")
    if r.status_code >= 400:
        print(f"   Error: {r.text[:200]}")

# Verify
r = requests.get(f"{API}/subtopics?select=id,name,sort_order,topic_id&topic_id=in.({tid_str})&order=sort_order", headers=HEADERS)
data = r.json()
print(f"\nTotal subtopics: {len(data)}")
for s in data:
    t_idx = topic_ids.index(s["topic_id"]) if s["topic_id"] in topic_ids else -1
    print(f"  T{t_idx+1}.{s['sort_order']} {s['name']}")
