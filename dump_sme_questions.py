"""
Query Supabase for all MCQ questions grouped by PMT code.
Run on your Windows machine:
    py dump_sme_questions.py
Saves results to sme_questions.json
"""
import urllib.request
import json
import re
import os

URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
}

def get_all(table, filters=""):
    """Fetch all rows from a table with optional filters"""
    results = []
    offset = 0
    limit = 1000
    while True:
        params = f"select=*&limit={limit}&offset={offset}"
        if filters:
            params += f"&{filters}"
        req = urllib.request.Request(f"{URL}/rest/v1/{table}?{params}", headers=HEADERS)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            if not data:
                break
            results.extend(data)
            offset += limit
            print(f"  Fetched {len(results)} rows...")
            if len(data) < limit:
                break
        except Exception as e:
            print(f"  Error: {e}")
            break
    return results

def extract_pmt_code(text):
    """Extract PMT code like 1.1, 2.3 from question text"""
    if not text:
        return None
    # Match patterns like "1.1", "2.3", "1.1 -", "Topic 1.1"
    m = re.search(r'(?:Topic\s+)?(\d+\.\d+)', text)
    return m.group(1) if m else None

print("=== Fetching Subjects ===")
subjects = get_all("subjects", "select=id,slug,name,code")

print("\n=== Fetching Topics ===")
topics = get_all("topics", "select=id,slug,name,subject_id")

print("\n=== Fetching Questions (MCQ only) ===")
questions = get_all("questions", "question_type=eq.mcq&order=sort_order")

print(f"\n=== Results: {len(questions)} MCQ questions ===")

# Group by PMT code
by_pmt = {}
no_pmt = []
for q in questions:
    code = extract_pmt_code(q.get("question_text", ""))
    if code:
        by_pmt.setdefault(code, []).append({
            "id": q["id"],
            "question_text": q["question_text"][:100],
            "difficulty": q.get("difficulty", "?"),
            "topic_id": q.get("topic_id", "")[:8],
        })
    else:
        no_pmt.append({
            "id": q["id"],
            "question_text": q["question_text"][:100],
            "difficulty": q.get("difficulty", "?"),
        })

print("\n--- By PMT Code ---")
for code in sorted(by_pmt.keys(), key=lambda x: tuple(int(n) for n in x.split("."))):
    items = by_pmt[code]
    print(f"  {code}: {len(items)} questions")
    
print(f"\n  No PMT code: {len(no_pmt)} questions")

# Save full data
output = {
    "total_questions": len(questions),
    "by_pmt_code": {k: len(v) for k, v in sorted(by_pmt.items())},
    "no_pmt_code_count": len(no_pmt),
    "sample_no_pmt": no_pmt[:5],
    "all_questions": questions,
}

outfile = "sme_questions.json"
with open(outfile, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✅ Full data saved to {outfile}")
print(f"   File location: {os.path.abspath(outfile)}")
