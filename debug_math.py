import requests, json
API = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"

# Get one math question to see structure
r = requests.get(f"{API}/rest/v1/questions?select=id,question_text,marks,answer_text,difficulty,topic_id&subject=eq.math&limit=3",
    headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}, timeout=10)
qs = r.json()
for q in qs:
    t = q["question_text"]
    print(f"\n{'='*60}")
    print(f"ID: {q['id']}")
    print(f"Marks: {q.get('marks')}")
    print(f"Difficulty: {q.get('difficulty')}")
    print(f"Topic: {q.get('topic_id')}")
    print(f"Answer: {q.get('answer_text','')[:100]}")
    print(f"Text length: {len(t)}")
    lines = t.split("\n")
    print(f"Lines: {len(lines)}")
    # Show all lines
    for i, l in enumerate(lines):
        flags = []
        if l.startswith(("A) ","B) ","C) ","D) ")): flags.append("OPT")
        if "data:image" in l or "<img" in l or "![" in l: flags.append("IMG")
        if "|" in l and "---" in t: flags.append("TBL")
        if l.startswith(("(a)","(b)","(c)","(d)","(i)","(ii)","(iii)")): flags.append("SUB")
        if "[mark" in l.lower() or l.strip().endswith("]"): flags.append("MRK")
        flag_str = " <-- " + ",".join(flags) if flags else ""
        print(f"  [{i}] {l[:130]}{flag_str}")
