#!/usr/bin/env python3
"""Fix clean_explanation: replace answers with clean_answer_text values, strip [n] marks."""

import sys, json, time, requests, re

SRV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
DS_KEY = "sk-8a31bc8a84ab416d97dab6ee8c19ffae"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
HEADERS = {"apikey": SRV_KEY, "Authorization": f"Bearer {SRV_KEY}"}
HEADERS_P = {**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"}

SYSTEM_PROMPT = """You rewrite the explanation for an IGCSE math question. The clean_answer contains the final correct answers. The explanation currently has mark scheme artifacts.

Rules:
1. Use the clean_answer values as the FINAL answers. Display them clearly.
2. Strip ALL [1], [2], [n] mark scheme annotations.
3. Strip ALL LaTeX formatting artifacts: $, \\frac, \\times, \\text{}, \\begin, \\end, \\bold, etc.
4. Strip "mark for", "Award 1 mark", "Incorrect", "correct triangle", table HTML etc.
5. Keep the STEP-BY-STEP reasoning and working from the explanation.
6. Use proper math symbols: × ÷ √ ² ³ → etc.
7. Keep it concise but complete — show the working and the final answer.
8. Output as JSON: {"explanation": "..."}

IMPORTANT: The final answer values MUST match clean_answer exactly."""

def fix_one(qid, question_text, answer_text, clean_answer, old_explanation):
    user_msg = f"""Question: {question_text[:400]}

SME answer_text (reference): {answer_text[:500]}

clean_answer (FINAL correct answers): {clean_answer[:300]}

Current explanation (WITH mark scheme artifacts): {old_explanation[:600]}

Rewrite the explanation. Show step-by-step working, then the final answers matching clean_answer."""
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.1, "max_tokens": 1000,
        "response_format": {"type": "json_object"},
    }
    for attempt in range(3):
        try:
            r = requests.post("https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DS_KEY}", "Content-Type": "application/json"},
                json=payload, timeout=60)
            r.raise_for_status()
            result = json.loads(r.json()["choices"][0]["message"]["content"])
            return result.get("explanation", "")
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
    return None

def main():
    # Get structured questions with explanation
    r = requests.get(f"{SUPABASE_URL}/rest/v1/questions", headers=HEADERS,
        params={"select": "id,question_text,answer_text,clean_answer_text,explanation",
                "question_type": "eq.structured", 
                "explanation": "not.is.null",
                "order": "id", "limit": 1000}, timeout=30)
    all_qs = r.json()
    print(f"Total with explanation: {len(all_qs)}")
    
    # Filter: questions where explanation has [n] marks or LaTeX artifacts
    needs_fix = [q for q in all_qs if re.search(r'\[\d+\]', q.get('explanation') or '') or '$' in (q.get('explanation') or '')]
    print(f"Needs fix: {len(needs_fix)}")
    
    done = errors = 0
    start = time.time()
    
    for q in needs_fix:
        qid = q["id"]
        new_expl = fix_one(qid, q.get("question_text") or "",
                          q.get("answer_text") or "",
                          q.get("clean_answer_text") or "",
                          q.get("explanation") or "")
        if not new_expl:
            errors += 1
            time.sleep(1)
            continue
        
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}",
            headers=HEADERS_P, json={"clean_explanation": new_expl}, timeout=30)
        if r.status_code == 204:
            done += 1
        
        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = (len(needs_fix) - done) / rate if rate > 0 else 0
        print(f"  [{done}/{len(needs_fix)}] {qid[:12]}... | {r.status_code} | {rate:.1f}/s | ETA {eta/60:.0f}m | err:{errors}")
        time.sleep(0.3)
    
    print(f"\nDone! Fixed: {done}, Errors: {errors}, Time: {(time.time()-start)/60:.1f}m")

if __name__ == "__main__":
    main()
