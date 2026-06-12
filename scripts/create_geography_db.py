#!/usr/bin/env python3
"""Create Edexcel Geography 4GE1: subject + topics + subtopics."""

import requests, json

MGMT_TOKEN = ""
MGMT_URL = "https://api.supabase.com/v1/projects/aondldqwwvttwpervrfq/database/query"
H = {"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json"}
BOARD_ID = "8e13308d-b803-439c-8808-e8f36f6ab6b8"
SLUG_BASE = "edexcel-geography-4ge1"

# 17 sections (DB topics) with their topics (DB subtopics)
STRUCTURE = [
    ("River Environments", "1-river-environments", [
        ("The Water Cycle & Drainage Basin System", "1-1-the-water-cycle-and-drainage-basin-system"),
        ("River Processes & Landforms", "1-2-river-processes-and-landforms"),
        ("Management of River Environments", "1-3-management-of-river-environments"),
    ]),
    ("Coastal Environments", "2-coastal-environments", [
        ("Coastal Processes & Landforms", "2-1-coastal-processes-and-landforms"),
        ("Ecosystems of the Coastline", "2-2-ecosystems-of-the-coastline"),
        ("Management of Coasts", "2-3-management-of-coasts"),
    ]),
    ("Hazardous Environments", "3-hazardous-environments", [
        ("Anatomy of Natural Hazards", "3-1-anatomy-of-natural-hazards"),
        ("Impact of Natural Hazards", "3-2-impact-of-natural-hazards"),
        ("Earthquake Management", "3-3-earthquake-management"),
    ]),
    ("Economic Activity & Energy", "4-economic-activity-and-energy", [
        ("Economic Sectors", "4-1-economic-sectors"),
        ("Impacts of Economic Sectors on Resources", "4-2-impacts-of-economic-sectors-on-resources"),
        ("Energy - Production, Security & Management", "4-3-energy---production-security-and-management"),
    ]),
    ("Rural Environments", "5-rural-environments", [
        ("The World's Biomes", "5-1-the-worlds-biomes"),
        ("Characteristics of Rural Environments", "5-2-characteristics-of-rural-environments"),
        ("Management of Rural Environments", "5-3-management-of-rural-environments"),
    ]),
    ("Urban Environments", "6-urban-environments", [
        ("The Rise & Characteristics of Urbanisation", "6-1-the-rise-and-characteristics-of-urbanisation"),
        ("Challenges to Urban Environments", "6-2-challenges-to-urban-environments"),
        ("Management of Urban Environments", "6-3-management-of-urban-environments"),
    ]),
    ("Fragile Environments & Climate Change", "7-fragile-environments-and-climate-change", [
        ("Threats to Fragile Environments", "7-1-threats-to-fragile-environments"),
        ("Impacts on Fragile Environments", "7-2-impacts-on-fragile-environments"),
        ("Responses on Fragile Environments", "7-3-responses-on-fragile-environments"),
    ]),
    ("Globalisation & Migration", "8-globalisation-and-migration", [
        ("The Globalised World", "8-1-the-globalised-world"),
        ("Impacts of Globalisation", "8-2-impacts-of-globalisation"),
        ("Responses to Globalisation", "8-3-responses-to-globalisation"),
    ]),
    ("Development & Human Welfare", "9-development-and-human-welfare", [
        ("Development & Human Welfare", "9-1-development-and-human-welfare"),
        ("Consequences of Uneven Development", "9-2-consequences-of-uneven-development"),
        ("Management of Uneven Development", "9-3-management-of-uneven-development"),
    ]),
    ("River Fieldwork", "10-river-fieldwork", [
        ("River Practical Skills", "10-1-river-practical-skills"),
        ("River Enquiry Skills", "10-2-river-enquiry-skills"),
    ]),
    ("Coastal Fieldwork", "11-coastal-fieldwork", [
        ("Coastal Practical Skills", "11-1-coastal-practical-skills"),
        ("Coastal Enquiry Skills", "11-2-coastal-enquiry-skills"),
    ]),
    ("Hazardous Fieldwork", "12-hazardous-fieldwork", [
        ("Hazardous Practical Skills", "12-1-hazardous-practical-skills"),
        ("Hazardous Enquiry Skills", "12-2-hazardous-enquiry-skills"),
    ]),
    ("Economic Activity & Energy Fieldwork", "13-economic-activity-and-energy-fieldwork", [
        ("Economic Activity & Energy Practical Skills", "13-1-economic-activity-and-energy-practical-skills"),
        ("Economic Activity & Energy Enquiry Skills", "13-2-economic-activity-and-energy-enquiry-skills"),
    ]),
    ("Rural Fieldwork", "14-rural-fieldwork", [
        ("Rural Practical Skills", "14-1-rural-practical-skills"),
        ("Rural Enquiry Skills", "14-2-rural-enquiry-skills"),
    ]),
    ("Urban Fieldwork", "15-urban-fieldwork", [
        ("Urban Practical Skills", "15-1-urban-practical-skills"),
        ("Urban Enquiry Skills", "15-2-urban-enquiry-skills"),
    ]),
    ("General Fieldwork Skills", "16-general-fieldwork-skills", [
        ("The Geographical Enquiry", "16-1-the-geographical-enquiry"),
    ]),
    ("Extended Response Questions", "17-extended-response-questions", [
        ("How to Answer an Extended Response Question", "17-1-how-to-answer-an-extended-response-question"),
    ]),
]

def run_sql(sql):
    resp = requests.post(MGMT_URL, headers=H, json={"query": sql})
    return resp

# 1. Insert subject
print("Creating subject...")
sql = f"""INSERT INTO subjects (name, display_name, slug, code, exam_board_id, is_published)
VALUES ('Geography', 'Geography', '{SLUG_BASE}', '4GE1', '{BOARD_ID}', true)
RETURNING id;"""
resp = run_sql(sql)
if resp.status_code == 201:
    subj_id = resp.json()[0]['id']
    print(f"✅ Subject created: {subj_id}")
else:
    print(f"❌ Subject failed: {resp.status_code} {resp.text[:200]}")
    exit(1)

# 2. Insert topics and subtopics
print(f"\nCreating {len(STRUCTURE)} topics + subtopics...")
t_order = 0
for s_name, s_slug, subs in STRUCTURE:
    t_slug = f"{SLUG_BASE}-{s_slug}"
    sql = f"""INSERT INTO topics (name, display_name, slug, subject_id, sort_order)
VALUES ('{s_name.replace("'","''")}', '{s_name.replace("'","''")}', '{t_slug}', '{subj_id}', {t_order})
RETURNING id;"""
    resp = run_sql(sql)
    if resp.status_code != 201:
        print(f"❌ Topic '{s_name}' failed: {resp.status_code} {resp.text[:100]}")
        continue
    topic_id = resp.json()[0]['id']
    
    s_order = 0
    for sub_name, sub_slug in subs:
        sub_slug_full = f"{SLUG_BASE}-{sub_slug}"
        sql = f"""INSERT INTO subtopics (name, display_name, slug, topic_id, sort_order)
VALUES ('{sub_name.replace("'","''")}', '{sub_name.replace("'","''")}', '{sub_slug_full}', '{topic_id}', {s_order});"""
        resp = run_sql(sql)
        if resp.status_code == 201:
            print(f"  ✅  [{t_order+1}.{s_order+1}] {s_name} → {sub_name}")
        else:
            print(f"  ❌  Subtopic '{sub_name}' failed: {resp.status_code} {resp.text[:100]}")
        s_order += 1
    t_order += 1

# 3. Set price
print("\nSetting price...")
sql = f"UPDATE subjects SET price_cny = 5000 WHERE slug = '{SLUG_BASE}';"
resp = run_sql(sql)
print(f"Price set: {resp.status_code}")

print("\n✅ DB setup complete!")
PYEOF