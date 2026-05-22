#!/usr/bin/env python3
"""Unify clean_answer_text: extract from SME answer_text only, same approach as fix_explanations.py.
One source, one logic — consistent with clean_explanation.
"""

import sys, json, time, requests, argparse

SRV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
DS_KEY = "sk-8a31bc8a84ab416d97dab6ee8c19ffae"
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
HEADERS = {"apikey": SRV_KEY, "Authorization": f"Bearer {SRV_KEY}"}
HEADERS_P = {**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"}

SYSTEM_PROMPT = """You extract clean answer values from an IGCSE math mark scheme (answer_text). The answer_text is the SME original — extract values from it, do NOT invent or generate answers.

Rules:
1. Extract ALL sub-part answer values from answer_text. Preserve labels: (i), (ii), (a), (b), 1., 2.
2. Strip ALL mark scheme artifacts: [1], [2], [n], "mark for", "Award", "Incorrect", table HTML, "bold", etc.
3. Strip ALL LaTeX: $, \\frac, \\times, \\div, \\text{}, \\begin, \\end, \\bold, etc.
4. Replace English operation words: "Subtract"→"-", "Add"→"+", "Multiply by"→"×", "Divide by"→"÷", "times"→"×"
5. Use "||" between sub-parts. Use "," between multiple acceptable answers for same part.
6. Keep numbers and math symbols only: × ÷ √ ² ³ → ± ≤ ≥ °
7. For word-only answers (like "Subtract 7"), convert to symbol form ("-7")
8. Output as JSON: {"clean_answer": "..."}

CRITICAL: Every value MUST come from answer_text. Do NOT change numbers. Do NOT add answers not in answer_text.
Do NOT repeat the same value across different sub-parts — each (i), (ii) etc. gets its own values."""


def call_deepseek(answer_text, question_text):
    user_msg = f"""Question (for context only):
{question_text[:400]}

SME answer_text (EXTRACT values from here):
{answer_text[:1200]}

Extract the clean answer values from answer_text above. Every value must come from answer_text."""

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.1,
        "max_tokens": 600,
        "response_format": {"type": "json_object"},
    }
    for attempt in range(3):
        try:
            r = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DS_KEY}", "Content-Type": "application/json"},
                json=payload, timeout=60,
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            result = json.loads(content)
            return result.get("clean_answer", "")
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=500)
    args = parser.parse_args()

    # Fetch structured questions with answer_text
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/questions",
        headers=HEADERS,
        params={
            "select": "id,question_text,answer_text",
            "question_type": "eq.structured",
            "answer_text": "not.is.null",
            "order": "id",
            "offset": args.offset,
            "limit": args.limit,
        },
        timeout=30,
    )
    questions = r.json()
    if not isinstance(questions, list):
        print(f"ERROR: {type(questions)} - {questions[:200]}")
        return

    total = len(questions)
    print(f"Processing {total} questions (offset={args.offset}, limit={args.limit})")

    done = errors = skipped = 0
    start = time.time()

    for q in questions:
        qid = q["id"]
        answer_text = q.get("answer_text") or ""
        question_text = q.get("question_text") or ""

        if not answer_text.strip():
            skipped += 1
            continue

        new_ca = call_deepseek(answer_text, question_text)
        if not new_ca:
            errors += 1
            print(f"  [{done}/{total}] FAILED {qid[:12]}...")
            time.sleep(1)
            continue

        r_patch = requests.patch(
            f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}",
            headers=HEADERS_P,
            json={"clean_answer_text": new_ca},
            timeout=30,
        )
        if r_patch.status_code == 204:
            done += 1
        else:
            errors += 1

        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = (total - done - errors - skipped) / rate if rate > 0 else 0
        print(f"  [{done}/{total}] {qid[:12]}... | {r_patch.status_code} | {rate:.1f}/s | ETA {eta/60:.0f}m | err:{errors} | skip:{skipped}")

        time.sleep(0.3)

    elapsed = time.time() - start
    print(f"\nDone! offset={args.offset} limit={args.limit} | Done: {done}, Errors: {errors}, Skipped: {skipped}, Time: {elapsed/60:.1f}m")


if __name__ == "__main__":
    main()
