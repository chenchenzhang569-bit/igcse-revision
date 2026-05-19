"""
Fix cross/over/bold OCR artifacts in DB questions
Run: py scripts/fix_cross_artifacts.py
"""
import requests
import re
from pathlib import Path

# ── Load service_role key from .env.local ──────────────────────────────
env_path = Path(__file__).parent.parent / ".env.local"
key = None
with open(env_path) as f:
    for line in f:
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            key = line.strip().split("=", 1)[1]
            break

if not key or len(key) < 50:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not found or truncated")
    exit(1)

URL = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1/questions"
HEADERS = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# ── Fetch all questions with "cross" in them ───────────────────────────
r = requests.get(
    URL,
    params={"select": "id,question_text,answer_text,explanation", "or": "(question_text.ilike.*cross*,answer_text.ilike.*cross*,explanation.ilike.*cross*)"},
    headers=HEADERS,
)
questions = r.json()
print(f"Found {len(questions)} questions with 'cross'")

# ── Fix functions ─────────────────────────────────────────────────────
def fix_cross(text: str) -> str:
    """Remove 'cross' word inserted before × operator"""
    if not text:
        return text
    # Pattern: number(s) followed by "cross" followed by \times or similar
    # e.g. "5cross × 2" → "5 × 2", "4.085cross \times 2" → "4.085 \times 2"
    text = re.sub(r'(\d+(?:\.\d+)?)\s*cross\s*(?=\\?times|×)', r'\1 \times ', text)
    # Also: "3cross × 2^3" type
    text = re.sub(r'(\d+(?:\.\d+)?)\s*cross\s*', r'\1 ', text)
    return text

def fix_over(text: str) -> str:
    """Fix '40over 8' → '40/8', '12over 35' → '12/35'"""
    if not text:
        return text
    return re.sub(r'(\d+)over\s+(\d+)', r'\1/\2', text)

def fix_bold(text: str) -> str:
    """Remove stray $bold$ template text"""
    if not text:
        return text
    text = re.sub(r'\$bold\s+', '$', text)
    text = re.sub(r'\s+bold\$', '$', text)
    text = re.sub(r'\$bold\$', '', text)
    return text

def fix_thin(text: str) -> str:
    """Remove stray 'thin'"""
    if not text:
        return text
    return text.replace(' thin ', ' ')

def fix_all(text: str) -> str:
    if not text:
        return text
    text = fix_cross(text)
    text = fix_over(text)
    text = fix_bold(text)
    text = fix_thin(text)
    # Collapse multiple spaces
    text = re.sub(r'  +', ' ', text)
    return text

# ── Fix and update ─────────────────────────────────────────────────────
fixed_count = 0
for q in questions:
    qid = q["id"]
    updates = {}
    
    for field in ["question_text", "answer_text", "explanation"]:
        original = q.get(field, "") or ""
        fixed = fix_all(original)
        if fixed != original:
            updates[field] = fixed
            print(f"\n  [{field}]")
            # Show diff
            for line in original.split("\n"):
                print(f"    - {line[:120]}")
            print(f"    + {fixed[:120]}")
    
    if updates:
        resp = requests.patch(f"{URL}?id=eq.{qid}", json=updates, headers=HEADERS)
        if resp.status_code in (204, 200):
            fixed_count += 1
            print(f"  ✅ Updated {qid[:12]}...")
        else:
            print(f"  ❌ Failed {qid[:12]}... ({resp.status_code}): {resp.text[:200]}")
    else:
        print(f"  ⏭️  No changes needed for {qid[:12]}...")

print(f"\n🎉 Fixed {fixed_count}/{len(questions)} questions")

# ── Summary: Show final state ──────────────────────────────────────────
print("\n📋 Final verification:")
r2 = requests.get(URL, params={
    "select": "id,question_text",
    "or": "(question_text.ilike.*cross*,answer_text.ilike.*cross*)"
}, headers=HEADERS)
remaining = r2.json()
if remaining:
    print(f"  ⚠️  {len(remaining)} questions still contain 'cross'")
    for q in remaining:
        print(f"     {q['id'][:12]}...: {q['question_text'][:100]}")
else:
    print("  ✅ All 'cross' artifacts cleaned!")
