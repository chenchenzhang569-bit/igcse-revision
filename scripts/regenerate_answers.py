#!/usr/bin/env python3
"""Regenerate clean_answer_text and clean_explanation using DeepSeek API.
Takes --offset and --limit for parallel runs."""

import os, sys, json, time, requests, argparse

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SRV_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
DS_KEY = "sk-8a31bc8a84ab416d97dab6ee8c19ffae"

HEADERS = {
    "apikey": SRV_KEY,
    "Authorization": f"Bearer {SRV_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

SYSTEM_PROMPT = """You are an IGCSE math tutor. Generate the correct answer and step-by-step explanation for each question.

Rules:
1. clean_answer: Use LaTeX ($...$ inline). Multi-part: "||" separator. Example: "i) $-11$||ii) $\\text{Subtract }7$"
2. clean_explanation: Step-by-step solution in LaTeX. Educational, clear.
3. NEVER include mark scheme artifacts: [1], [2], "mark for", "Incorrect", "Award"
4. Output as JSON: {"clean_answer": "...", "clean_explanation": "..."}"""


def fetch_questions(offset, limit):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/questions",
        headers={"apikey": SRV_KEY, "Authorization": f"Bearer {SRV_KEY}"},
        params={
            "select": "id,question_text,subject_id",
            "order": "id",
            "offset": offset,
            "limit": limit,
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def call_deepseek(question_text):
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Question:\n{question_text}"},
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
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
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
            else:
                return None


def patch_question(qid, answer, explanation):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}",
        headers=HEADERS,
        json={"clean_answer_text": answer, "clean_explanation": explanation},
        timeout=30,
    )
    return r.status_code


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()

    questions = fetch_questions(args.offset, args.limit)
    if not isinstance(questions, list):
        print(f"ERROR fetching: {type(questions)}")
        return

    total = len(questions)
    done = errors = 0
    start = time.time()

    for q in questions:
        qid = q["id"]
        qtext = q.get("question_text") or ""
        if not qtext.strip():
            continue

        result = call_deepseek(qtext)
        if not result:
            errors += 1
            print(f"  [{done}/{total}] FAILED {qid[:8]}...")
            time.sleep(2)
            continue

        answer = result.get("clean_answer", "")
        explanation = result.get("clean_explanation", "")
        status = patch_question(qid, answer, explanation)
        done += 1

        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = (total - done) / rate if rate > 0 else 0
        print(f"  [{done}/{total}] {qid[:8]}... | {status} | {rate:.1f}/s | ETA {eta/60:.0f}m")
        time.sleep(0.3)  # rate limit

    elapsed = time.time() - start
    print(f"\nDone! offset={args.offset} limit={args.limit} | Done: {done}, Errors: {errors}, Time: {elapsed/60:.1f}m")


if __name__ == "__main__":
    main()
