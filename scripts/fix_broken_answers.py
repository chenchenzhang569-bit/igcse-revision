#!/usr/bin/env python3
"""Fix broken clean_answer_text: duplicates, [n] marks, $, LaTeX, missing values."""

import sys, json, time, requests, re

SRV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
DS_KEY = "sk-8a31bc8a84ab416d97dab6ee8c19ffae"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
HEADERS = {"apikey": SRV_KEY, "Authorization": f"Bearer {SRV_KEY}"}
HEADERS_P = {**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"}

SYSTEM_PROMPT = """You fix broken clean_answer_text. The answer_text contains the CORRECT values but the clean_answer has errors.

Rules:
1. Extract CORRECT answer VALUES from answer_text. Do NOT invent or change values.
2. PRESERVE part labels: (i), (ii), (a), (b), 1., 2. etc.
3. Strip ALL mark scheme artifacts: [1], [2], [n], "bold", table attributes, "mark for" etc.
4. Strip ALL LaTeX: $, \\frac, \\times, \\div, \\text{}, \\begin, \\end, etc.
5. Replace English operations: "Subtract 5" → "-5", "Add 6" → "+6", "Multiply by 2" → "×2", "Divide by 3" → "÷3"
6. Use || between sub-parts. Use , between multiple acceptable answers for same part.
7. Output as JSON: {"clean_answer": "..."}

IMPORTANT: Do NOT repeat the same value for different sub-parts. Each (i), (ii) etc. must have its own distinct answer from answer_text."""

def is_broken(ca, at):
    """Check if clean_answer needs fixing."""
    parts = [p.strip() for p in ca.split('||') if p.strip()]
    
    # Duplicate parts
    if len(parts) >= 2 and len(set(parts)) <= len(parts) * 0.5:
        return True
    
    # Still has [n] marks
    if re.search(r'\[\d+\]', ca):
        return True
    
    # Still has LaTeX
    if '$' in ca or '\\frac' in ca or '\\begin' in ca:
        return True
    
    # Still has English operation words
    if re.search(r'\b(Subtract|Add|Multiply|Divide)\b', ca, re.I):
        return True
    
    return False

def fix_one(qid, question_text, answer_text, old_clean):
    """Use AI to fix one broken answer."""
    user_msg = f"""Question:
{question_text[:500]}

SME answer_text (CORRECT values are here):
{answer_text[:800]}

Current BROKEN clean_answer:
{old_clean[:300]}

Please fix the clean_answer. Extract ALL correct distinct values from answer_text."""
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.1, "max_tokens": 800,
        "response_format": {"type": "json_object"},
    }
    for attempt in range(3):
        try:
            r = requests.post("https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DS_KEY}", "Content-Type": "application/json"},
                json=payload, timeout=60)
            r.raise_for_status()
            result = json.loads(r.json()["choices"][0]["message"]["content"])
            return result.get("clean_answer", "")
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
    return None

def main():
    # Get all structured questions with answer_text
    r = requests.get(f"{SUPABASE_URL}/rest/v1/questions", headers=HEADERS,
        params={"select": "id,question_text,answer_text,clean_answer_text",
                "question_type": "eq.structured", "answer_text": "not.is.null",
                "order": "id", "limit": 1500}, timeout=30)
    all_qs = r.json()
    print(f"Total: {len(all_qs)}")
    
    broken = [(q, q.get("clean_answer_text") or "") for q in all_qs 
              if is_broken(q.get("clean_answer_text") or "", q.get("answer_text") or "")]
    print(f"Broken: {len(broken)}")
    
    done = errors = 0
    start = time.time()
    
    for q, old_ca in broken:
        qid = q["id"]
        new_ca = fix_one(qid, q.get("question_text") or "", 
                        q.get("answer_text") or "", old_ca)
        if not new_ca:
            errors += 1
            time.sleep(1)
            continue
        
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}",
            headers=HEADERS_P, json={"clean_answer_text": new_ca}, timeout=30)
        if r.status_code == 204:
            done += 1
        
        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = (len(broken) - done) / rate if rate > 0 else 0
        print(f"  [{done}/{len(broken)}] {qid[:12]}... | {r.status_code} | {rate:.1f}/s | ETA {eta/60:.0f}m | err:{errors}")
        time.sleep(0.3)
    
    print(f"\nDone! Fixed: {done}, Errors: {errors}, Time: {(time.time()-start)/60:.1f}m")

if __name__ == "__main__":
    main()
