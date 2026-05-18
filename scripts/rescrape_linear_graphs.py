#!/usr/bin/env python3
"""Re-scrape linear-graphs topic from SME and update Supabase."""
import urllib.request, ssl, json, re, uuid, sys

ctx = ssl.create_default_context()
SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"
TOPIC_ID = "365cb82c-529f-4444-8cad-23c3e10ed998"

# ─── alt_to_math converter ───
def alt_to_math(alt):
    if not alt: return ""
    text = alt.strip()
    # Fraction
    text = re.sub(r'fraction\s*numerator\s*(.+?)\s*(?:/denominator|over\s*denominator)\s*(.+?)\s*end\s*fraction',
                  r'\\frac{\1}{\2}', text)
    # Parentheses
    text = re.sub(r'\b(?:open|left)\s*parenthes[ie]s\b', '(', text)
    text = re.sub(r'\b(?:close|right)\s*parenthes[ie]s\b', ')', text)
    text = re.sub(r'\b(?:open|left)\s*bracket\b', '[', text)
    text = re.sub(r'\b(?:close|right)\s*bracket\b', ']', text)
    text = text.replace('space', '')
    # Inequalities
    text = re.sub(r'\bnegative\s+(\d)', r'-\1', text)
    text = re.sub(r'\bless-than or slanted equal to\b', r'\\leq', text)
    text = re.sub(r'\bgreater-than or slanted equal to\b', r'\\geq', text)
    text = re.sub(r'\bless or equal than\b', r'\\leq', text)
    text = re.sub(r'\bgreater or equal than\b', r'\\geq', text)
    text = re.sub(r'\bless-than\b', '<', text)
    text = re.sub(r'\bgreater-than\b', '>', text)
    # Operators
    text = re.sub(r'\bminus\b', '-', text)
    text = re.sub(r'\bplus\b', '+', text)
    text = re.sub(r'\bequals\b', '=', text)
    text = re.sub(r'\btimes\b', r'\\times', text)
    text = re.sub(r'\bdivided\s*by\b', r'\\div', text)
    text = re.sub(r'\bcomma\b', ',', text)
    # Powers
    text = re.sub(r'to\s*the\s*power\s*of\s*(\S+)', r'^{\1}', text)
    text = text.replace('squared', '^2').replace('cubed', '^3')
    # Spacing
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'(\d)\s+([a-zA-Z])', r'\1\2', text)
    text = re.sub(r'=\s*=', '=', text)
    return re.sub(r'\s+', ' ', text).strip()

# ─── ProseMirror → markdown converter ───
def pm_to_md(nodes, context="doc"):
    """Convert ProseMirror nodes to markdown text."""
    if isinstance(nodes, str):
        return nodes
    if isinstance(nodes, list):
        return "".join(pm_to_md(n, context) for n in nodes)
    if not isinstance(nodes, dict):
        return str(nodes)
    
    t = nodes.get("type", "")
    attrs = nodes.get("attrs", {})
    content = nodes.get("content", [])
    text = nodes.get("text", "")
    marks = nodes.get("marks", [])
    
    # Check marks for bold/italic
    has_bold = any(m.get("type") == "bold" for m in marks)
    has_italic = any(m.get("type") == "italic" for m in marks)
    is_commentary = any(m.get("type") == "emphasis" and m.get("attrs", {}).get("type") == "commentary" for m in marks)
    
    if is_commentary:
        return ""  # Skip teacher commentary
    
    if text:
        result = text
        if has_bold: result = f"**{result}**"
        if has_italic: result = f"*{result}*"
        return result
    
    inner = pm_to_md(content, t)
    
    if t == "paragraph":
        return inner + "\n"
    elif t == "heading":
        level = attrs.get("level", 1)
        return f"{'#' * level} {inner}\n"
    elif t == "hardBreak":
        return "\n"
    elif t == "equation":
        alt = attrs.get("alt", "")
        return f"${alt_to_math(alt)}$" if alt else ""
    elif t == "inlineMath":
        return f"${inner.strip()}$"
    elif t == "mathDisplay":
        return f"$$\n{inner.strip()}\n$$"
    elif t == "figure":
        alt = attrs.get("alt", "")
        src = attrs.get("src", "")
        if src:
            return f'\n<img src="{src}" alt="{alt}"/>\n'
        return ""
    elif t == "image":
        alt = attrs.get("alt", "")
        src = attrs.get("src", "")
        return f"![{alt}]({src})" if src else ""
    elif t == "orderedList":
        return "\n" + inner + "\n"
    elif t == "bulletList":
        return "\n" + inner + "\n"
    elif t == "listItem":
        return "• " + inner + "\n"
    elif t == "table":
        # Process raw table content directly: tableRow → tableCell/tableHeader → paragraph → text/equation
        rows = nodes.get("content", [])
        if not rows:
            return ""
        
        parsed_rows = []
        for row_node in rows:
            if row_node.get("type") != "tableRow":
                continue
            cells = []
            for cell_node in row_node.get("content", []):
                ct = cell_node.get("type", "")
                if ct in ("tableCell", "tableHeader"):
                    # Get cell text content directly
                    cell_text = pm_to_md(cell_node.get("content", []), "cell").strip()
                    cells.append(cell_text)
            if cells:
                parsed_rows.append(cells)
        
        if not parsed_rows:
            return ""
        
        col_count = max(len(r) for r in parsed_rows)
        result = "\n"
        
        for ri, row in enumerate(parsed_rows):
            padded = row + [""] * (col_count - len(row))
            result += "| " + " | ".join(padded[:col_count]) + " |\n"
            if ri == 0:
                result += "|" + " --- |" * col_count + "\n"
        
        return result
    elif t == "tableRow":
        cells = [c.strip() for c in inner.split(" | ")]
        # Don't filter empty cells — they're needed for table structure
        return "| " + " | ".join(cells) + " |\n"
    elif t in ("tableCell", "tableHeader"):
        return inner.strip().replace("\n", " ") + " | "
    else:
        return inner

# ─── Extract answer text (skip commentary) ───
def extract_answer(solution_nodes):
    result = []
    for n in solution_nodes:
        t = n.get("type", "")
        if t == "paragraph":
            content = n.get("content", [])
            line = ""
            for c in content:
                ct = c.get("type", "")
                if ct == "text":
                    marks = c.get("marks", [])
                    is_commentary = any(m.get("type") == "emphasis" and m.get("attrs", {}).get("type") == "commentary" for m in marks)
                    if not is_commentary:
                        line += c.get("text", "")
                elif ct == "equation":
                    alt = c.get("attrs", {}).get("alt", "")
                    line += f"${alt_to_math(alt)}$"
            if line.strip():
                result.append(line.strip())
        elif t == "equation":
            alt = n.get("attrs", {}).get("alt", "")
            result.append(f"${alt_to_math(alt)}$")
    return "\n".join(result)

# ─── Main ───
print("Fetching SME data...")
url = "https://www.savemyexams.com/igcse/maths/cie/25/core/topic-questions/coordinate-geometry-and-graphs/linear-graphs/exam-questions/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    html = resp.read().decode("utf-8", errors="replace")

match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
data = json.loads(match.group(1))
questions = data["props"]["pageProps"]["questions"]

# Group by (difficulty, order)
from collections import defaultdict
grouped = defaultdict(lambda: defaultdict(list))
for q in questions:
    attrs = q.get("attributes", {})
    diff = attrs.get("difficulty", "medium")
    order = attrs.get("order", 0)
    grouped[diff][order].append(q)

print(f"Total SME questions: {len(questions)}")
print(f"Grouped: {sum(len(v) for d in grouped.values() for v in d.values())} parts")

# Build new question rows
DIFF_ORDER = ["easy", "medium", "hard"]
LABELS = "abcdefghijklmnopqrstuvwxyz"
new_questions = []
sort_counter = 0

for diff in DIFF_ORDER:
    if diff not in grouped:
        continue
    for order in sorted(grouped[diff].keys()):
        qs = grouped[diff][order]
        parts_list = []
        answers_list = []
        total_marks = 0
        
        for q in qs:
            attrs = q.get("attributes", {})
            parts = attrs.get("parts", [])
            for p in parts:
                problem = p.get("problem", [])
                solution = p.get("solution", [])
                marks = p.get("marks", 0)
                total_marks += marks
                parts_list.append(problem)
                ans = extract_answer(solution)
                if ans:
                    answers_list.append(ans)
                else:
                    answers_list.append(f"[{marks} mark{'s' if marks != 1 else ''}]")
        
        if len(parts_list) == 1:
            problem_text = pm_to_md(parts_list[0]).strip()
            answer_text = answers_list[0] if answers_list else ""
        else:
            part_texts = []
            part_answers = []
            for pi, problem in enumerate(parts_list):
                label = LABELS[pi]
                pt = pm_to_md(problem).strip()
                part_texts.append(f"**({label})** {pt}")
                if pi < len(answers_list):
                    part_answers.append(f"({label}) {answers_list[pi]}")
            problem_text = "\n\n".join(part_texts)
            answer_text = "\n".join(part_answers)
        
        # Clean up: remove extra blank lines, normalize
        problem_text = re.sub(r'\n{3,}', '\n\n', problem_text)
        problem_text += f"\n\n**[Total: {total_marks} mark{'s' if total_marks > 1 else ''}]**"
        
        new_questions.append({
            "id": str(uuid.uuid4()),
            "topic_id": TOPIC_ID,
            "question_text": problem_text,
            "answer_text": answer_text[:500],
            "difficulty": diff,
            "question_type": "structured",
            "marks": total_marks,
            "is_free_preview": False,
            "sort_order": sort_counter,
            "explanation": answer_text[:500],
        })
        sort_counter += 1
        
        print(f"  {diff:6s} order={order:2d} parts={len(parts_list)} marks={total_marks}")
        print(f"    Q: {problem_text[:120]}...")

print(f"\nNew questions: {len(new_questions)}")

# DELETE all existing questions for this topic
print("\nDeleting old questions...")
try:
    # First get all IDs
    del_req = urllib.request.Request(
        f"{API}/questions?select=id&topic_id=eq.{TOPIC_ID}",
        headers={"apikey": SK, "Authorization": f"Bearer {SK}"}
    )
    with urllib.request.urlopen(del_req, timeout=10, context=ctx) as resp:
        old_ids = [q["id"] for q in json.loads(resp.read())]
    print(f"  Found {len(old_ids)} old questions")
    
    # Delete in batches of 50
    for i in range(0, len(old_ids), 50):
        batch = old_ids[i:i+50]
        ids_str = ",".join(batch)
        del2 = urllib.request.Request(
            f"{API}/questions?id=in.({ids_str})",
            headers={"apikey": SK, "Authorization": f"Bearer {SK}"},
            method="DELETE",
        )
        with urllib.request.urlopen(del2, timeout=10, context=ctx) as resp:
            print(f"  Deleted batch {i//50+1}: HTTP {resp.status}")
except Exception as e:
    print(f"  Delete error: {e}")
    sys.exit(1)

# INSERT all new questions
print("\nInserting new questions...")
for i, q in enumerate(new_questions):
    try:
        ins_req = urllib.request.Request(
            f"{API}/questions",
            data=json.dumps(q).encode(),
            headers={
                "apikey": SK, "Authorization": f"Bearer {SK}",
                "Content-Type": "application/json", "Prefer": "return=minimal",
            },
            method="POST",
        )
        with urllib.request.urlopen(ins_req, timeout=10, context=ctx) as resp:
            if resp.status not in (200, 201, 204):
                print(f"  Q{i}: HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"  Q{i} ERROR: HTTP {e.code} - {e.read().decode()[:200]}")
        break
    if (i+1) % 5 == 0:
        print(f"  Inserted {i+1}/{len(new_questions)}...")

# Verify
v_req = urllib.request.Request(
    f"{API}/questions?topic_id=eq.{TOPIC_ID}&select=id,question_text,difficulty&order=sort_order",
    headers={"apikey": SK, "Authorization": f"Bearer {SK}"}
)
with urllib.request.urlopen(v_req, timeout=10, context=ctx) as resp:
    final = json.loads(resp.read())

print(f"\n✅ Final count: {len(final)} questions in DB")
has_math = sum(1 for q in final if "$" in q.get("question_text", ""))
print(f"  With LaTeX: {has_math}/{len(final)}")
for q in final[:3]:
    print(f"  {q['difficulty']:6s} | {q['question_text'][:100]}...")
