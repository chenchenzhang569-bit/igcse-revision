#!/usr/bin/env python3
"""Clean SME answer_text: strip mark scheme artifacts, format with math symbols, extract alternatives."""

import sys, json, time, requests, argparse

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SRV_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
DS_KEY = "sk-8a31bc8a84ab416d97dab6ee8c19ffae"

HEADERS_W = {"apikey": SRV_KEY, "Authorization": f"Bearer {SRV_KEY}", "Content-Type": "application/json"}

SYSTEM_PROMPT = """You clean up SME (SaveMyExams) answer_text. The answer_text contains the CORRECT answer but has formatting garbage.

Rules:
1. Extract the actual answer VALUES from the raw text. DO NOT change the values.
2. Strip mark scheme artifacts: [1], [2], "mark for", "Award 1 mark", "Incorrect", table attributes, etc.
3. PRESERVE part labels: keep (i), (ii), (a), (b), 1., 2. etc. exactly as they appear in the raw answer. These map to sub-parts of the question.
4. Use proper math symbols: × ÷ √ π ° ² ³ ≤ ≥ ≠ ≈ → ± (NOT LaTeX like \\times \\div \\sqrt)
4b. Replace English operation words with symbols: "Subtract 5" → "-5", "Add 6" → "+6", "Multiply by 2" → "×2", "Divide by 3" → "÷3"
5. For multi-part (different sub-questions), separate with "||". Example: "(i) -11||(ii) -7"
6. For multiple acceptable answers for ONE part, separate with "," (comma). Example: "0.5, 1/2"
7. Keep it concise - only the answer values.
8. Output as JSON: {"clean_answer": "..."}"""


def fetch_questions(offset, limit, subtopic_ids=None):
    params = {
        "select": "id,question_text,answer_text,clean_answer_text",
        "answer_text": "not.is.null",
        "order": "id",
        "offset": offset,
        "limit": limit,
    }
    if subtopic_ids:
        params["subtopic_id"] = f"in.({','.join(subtopic_ids)})"
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/questions",
        headers={"apikey": SRV_KEY, "Authorization": f"Bearer {SRV_KEY}"},
        params=params,
    )
    r.raise_for_status()
    return r.json()


def call_deepseek(question_text, answer_text):
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Question:\n{question_text}\n\nSME answer_text (contains correct values, strip formatting):\n{answer_text}"},
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
    }
    for attempt in range(3):
        try:
            r = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DS_KEY}", "Content-Type": "application/json"},
                json=payload,
                timeout=60,
            )
            r.raise_for_status()
            return json.loads(r.json()["choices"][0]["message"]["content"])
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
            else:
                return None


def patch_question(qid, clean_answer):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}",
        headers=HEADERS_W,
        json={"clean_answer_text": clean_answer},
        timeout=30,
    )
    return r.status_code


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--subtopic-ids", type=str, default=None,
                        help="Comma-separated subtopic UUIDs to filter (optional)")
    args = parser.parse_args()

    subtopic_ids = args.subtopic_ids.split(",") if args.subtopic_ids else None
    questions = fetch_questions(args.offset, args.limit, subtopic_ids)
    if not isinstance(questions, list):
        print(f"ERROR: {type(questions)}")
        return

    total = len(questions)
    done = errors = skipped = 0
    start = time.time()

    for q in questions:
        qid = q["id"]
        qtext = q.get("question_text") or ""
        atext = q.get("answer_text") or ""
        if not qtext.strip() or not atext.strip():
            continue

        # Re-process all — old runs may have stripped part labels

        result = call_deepseek(qtext, atext)
        if not result:
            errors += 1
            time.sleep(2)
            continue

        clean = result.get("clean_answer", "")
        if not clean:
            errors += 1
            continue

        status = patch_question(qid, clean)
        done += 1

        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = (total - done - skipped) / rate if rate > 0 else 0
        print(f"  [{done}/{total}] {qid[:8]}... | {status} | {rate:.1f}/s | ETA {eta/60:.0f}m | skipped:{skipped} err:{errors}")
        time.sleep(0.3)

    print(f"\nDone! offset={args.offset} | Done: {done}, Skipped: {skipped}, Errors: {errors}, Time: {(time.time()-start)/60:.1f}m")


if __name__ == "__main__":
    main()
