import os
from supabase import create_client

URL = "https://aondldqwwvttwpervrfq.supabase.co"
SKEY = os.environ.get("SERVICE_ROLE_KEY", "")

supabase = create_client(URL, SKEY)

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

# 1. Nullify past_papers FK
res = supabase.table("past_papers").update({"subtopic_id": None, "topic_id": None}).in_("topic_id", topic_ids).execute()
print(f"1. Nullify past_papers: OK ({len(res.data)} rows)")

# 2. Delete existing subtopics
res = supabase.table("subtopics").delete().in_("topic_id", topic_ids).execute()
print(f"2. Delete subtopics: OK ({len(res.data)} rows)")

# 3. Insert new subtopics
subtopics = [
    {"topic_id": topic_ids[0], "name": "1.1 Movement & Position", "display_name": "Movement & Position", "slug": "1-1-movement-and-position", "sort_order": 1},
    {"topic_id": topic_ids[0], "name": "1.2 Forces, Movement & Changing Shape", "display_name": "Forces, Movement & Changing Shape", "slug": "1-2-forces-movement-and-changing-shape", "sort_order": 2},
    {"topic_id": topic_ids[0], "name": "1.3 Momentum", "display_name": "Momentum", "slug": "1-3-momentum", "sort_order": 3},
    {"topic_id": topic_ids[0], "name": "1.4 Moments", "display_name": "Moments", "slug": "1-4-moments", "sort_order": 4},
    {"topic_id": topic_ids[1], "name": "2.1 Current, Potential Difference & Resistance", "display_name": "Current, Potential Difference & Resistance", "slug": "2-1-current-potential-difference-and-resistance", "sort_order": 1},
    {"topic_id": topic_ids[1], "name": "2.2 Components in Series & Parallel Circuits", "display_name": "Components in Series & Parallel Circuits", "slug": "2-2-components-in-series-and-parallel-circuits", "sort_order": 2},
    {"topic_id": topic_ids[1], "name": "2.3 Electrical Power & Mains Electricity", "display_name": "Electrical Power & Mains Electricity", "slug": "2-3-electrical-power-and-mains-electricity", "sort_order": 3},
    {"topic_id": topic_ids[1], "name": "2.4 Static Electricity", "display_name": "Static Electricity", "slug": "2-4-static-electricity", "sort_order": 4},
    {"topic_id": topic_ids[2], "name": "3.1 Waves & The Electromagnetic Spectrum", "display_name": "Waves & The Electromagnetic Spectrum", "slug": "3-1-waves-and-the-electromagnetic-spectrum", "sort_order": 1},
    {"topic_id": topic_ids[2], "name": "3.2 Reflection & Refraction", "display_name": "Reflection & Refraction", "slug": "3-2-reflection-and-refraction", "sort_order": 2},
    {"topic_id": topic_ids[2], "name": "3.3 Sound", "display_name": "Sound", "slug": "3-3-sound", "sort_order": 3},
    {"topic_id": topic_ids[3], "name": "4.1 Energy Stores & Transfers", "display_name": "Energy Stores & Transfers", "slug": "4-1-energy-stores-and-transfers", "sort_order": 1},
    {"topic_id": topic_ids[3], "name": "4.2 Work, Power & Energy Resources", "display_name": "Work, Power & Energy Resources", "slug": "4-2-work-power-and-energy-resources", "sort_order": 2},
    {"topic_id": topic_ids[4], "name": "5.1 Density & Pressure", "display_name": "Density & Pressure", "slug": "5-1-density-and-pressure", "sort_order": 1},
    {"topic_id": topic_ids[4], "name": "5.2 Changes of State", "display_name": "Changes of State", "slug": "5-2-changes-of-state", "sort_order": 2},
    {"topic_id": topic_ids[4], "name": "5.3 Ideal Gases", "display_name": "Ideal Gases", "slug": "5-3-ideal-gases", "sort_order": 3},
    {"topic_id": topic_ids[5], "name": "6.1 Magnetism & Electromagnetism", "display_name": "Magnetism & Electromagnetism", "slug": "6-1-magnetism-and-electromagnetism", "sort_order": 1},
    {"topic_id": topic_ids[5], "name": "6.2 Electromagnetic Induction", "display_name": "Electromagnetic Induction", "slug": "6-2-electromagnetic-induction", "sort_order": 2},
    {"topic_id": topic_ids[6], "name": "7.1 Properties of Radiation", "display_name": "Properties of Radiation", "slug": "7-1-properties-of-radiation", "sort_order": 1},
    {"topic_id": topic_ids[6], "name": "7.2 Radioactivity, Uses & Dangers", "display_name": "Radioactivity, Uses & Dangers", "slug": "7-2-radioactivity-uses-and-dangers", "sort_order": 2},
    {"topic_id": topic_ids[6], "name": "7.3 Fission & Fusion", "display_name": "Fission & Fusion", "slug": "7-3-fission-and-fusion", "sort_order": 3},
    {"topic_id": topic_ids[7], "name": "8.1 Motion in the Universe", "display_name": "Motion in the Universe", "slug": "8-1-motion-in-the-universe", "sort_order": 1},
    {"topic_id": topic_ids[7], "name": "8.2 Stellar Evolution", "display_name": "Stellar Evolution", "slug": "8-2-stellar-evolution", "sort_order": 2},
    {"topic_id": topic_ids[7], "name": "8.3 Cosmology", "display_name": "Cosmology", "slug": "8-3-cosmology", "sort_order": 3},
]

res = supabase.table("subtopics").insert(subtopics).execute()
print(f"3. Insert subtopics: OK ({len(res.data)} rows)")

# Verify
res = supabase.table("subtopics").select("id,name,sort_order,topic_id").in_("topic_id", topic_ids).order("sort_order").execute()
print(f"\nTotal subtopics: {len(res.data)}")
for s in res.data:
    t_idx = topic_ids.index(s["topic_id"]) + 1
    print(f"  T{t_idx}.{s['sort_order']} {s['name']}")
