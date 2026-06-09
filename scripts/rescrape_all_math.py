#!/usr/bin/env python3
"""Batch re-scrape ALL CAIE Math 0580 topics from SME to fix missing LaTeX."""
import urllib.request, ssl, json, re, uuid, sys, time
from collections import defaultdict

ctx = ssl.create_default_context()
SK = "os.environ.get("SERVICE_ROLE_KEY", "")"
API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1"

# ─── alt_to_math converter ───
def alt_to_math(alt):
    if not alt: return ""
    text = str(alt).strip()
    if 'table' in text.lower() and 'row' in text.lower():
        text = re.sub(r'\bend table\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bend cell\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bend attributes\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\brow cell\b', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'\brow\b', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'\btable attributes columnalign right center left columnspacing 0px\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\btable\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcell\b', '', text, flags=re.IGNORECASE)
        def clean_line(l):
            l = re.sub(r'\bspace\b', ' ', l)
            l = re.sub(r'\bminus\b', '-', l); l = re.sub(r'\bplus\b', '+', l); l = re.sub(r'\bequals\b', '=', l)
            l = l.replace('squared', '^2').replace('cubed', '^3')
            l = re.sub(r'(\d)\s+([a-zA-Z])', r'\1\2', l)
            return re.sub(r'\s+', ' ', l).strip()
        lines = [clean_line(l) for l in text.split('\n') if l.strip()]
        return ' \\\\ '.join(lines)
    text = re.sub(r'fraction\s*numerator\s*(.+?)\s*(?:/denominator|over\s*denominator)\s*(.+?)\s*end\s*fraction', r'\\frac{\1}{\2}', text)
    text = re.sub(r'\b(?:open|left)\s*parenthes[ie]s\b', '(', text)
    text = re.sub(r'\b(?:close|right)\s*parenthes[ie]s\b', ')', text)
    text = re.sub(r'\b(?:open|left)\s*bracket\b', '[', text)
    text = re.sub(r'\b(?:close|right)\s*bracket\b', ']', text)
    text = re.sub(r'\bspace\b', ' ', text)
    text = re.sub(r'\bnegative\s+(\d)', r'-\1', text)
    text = re.sub(r'\bless-than or slanted equal to\b', r'\\leq', text)
    text = re.sub(r'\bgreater-than or slanted equal to\b', r'\\geq', text)
    text = re.sub(r'\bless or equal than\b', r'\\leq', text)
    text = re.sub(r'\bgreater or equal than\b', r'\\geq', text)
    text = re.sub(r'\bless-than\b', '<', text); text = re.sub(r'\bgreater-than\b', '>', text)
    text = re.sub(r'\bless than\b', '<', text); text = re.sub(r'\bgreater than\b', '>', text)
    text = re.sub(r'\bminus\b', '-', text); text = re.sub(r'\bplus\b', '+', text)
    text = re.sub(r'\bequals\b', '=', text); text = re.sub(r'\btimes\b', r'\\times', text)
    text = re.sub(r'\bdivided\s*by\b', r'\\div', text); text = re.sub(r'\bcomma\b', ',', text)
    text = re.sub(r'to\s*the\s*power\s*of\s*(\S+)', r'^{\1}', text)
    text = text.replace('squared', '^2').replace('cubed', '^3')
    text = re.sub(r'\(\s+', '(', text); text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'(\d)\s+([a-zA-Z])', r'\1\2', text)
    text = re.sub(r'=\s*=', '=', text)
    return re.sub(r'\s+', ' ', text).strip() text = re.sub(r'\(\s+', '(', text); text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'(\d)\s+([a-zA-Z])', r'\1\2', text)
    text = re.sub(r'=\s*=', '=', text)
    return re.sub(r'\s+', ' ', text).strip()

# ─── ProseMirror → markdown converter ───
def pm_to_md(nodes, context="doc"):
    if isinstance(nodes, str): return nodes
    if isinstance(nodes, list): return "".join(pm_to_md(n, context) for n in nodes)
    if not isinstance(nodes, dict): return str(nodes)
    
    t = nodes.get("type", "")
    attrs = nodes.get("attrs", {})
    content = nodes.get("content", [])
    text = nodes.get("text", "")
    marks = nodes.get("marks", [])
    
    has_bold = any(m.get("type") == "bold" for m in marks)
    has_italic = any(m.get("type") == "italic" for m in marks)
    is_commentary = any(m.get("type") == "emphasis" and m.get("attrs", {}).get("type") == "commentary" for m in marks)
    
    if is_commentary: return ""
    
    if text:
        result = text
        if has_bold: result = f"**{result}**"
        if has_italic: result = f"*{result}*"
        return result
    
    inner = pm_to_md(content, t)
    
    if t == "paragraph": return inner + "\n"
    elif t == "heading": return f"{'#' * attrs.get('level', 1)} {inner}\n"
    elif t == "hardBreak": return "\n"
    elif t == "equation":
        alt = attrs.get("alt", "")
        return f"${alt_to_math(alt)}$" if alt else ""
    elif t == "inlineMath": return f"${inner.strip()}$"
    elif t == "mathDisplay": return f"$$\n{inner.strip()}\n$$"
    elif t == "figure":
        alt = attrs.get("alt", "")
        src = attrs.get("src", "")
        return f'\n<img src="{src}" alt="{alt}"/>\n' if src else ""
    elif t == "image":
        alt = attrs.get("alt", "")
        src = attrs.get("src", "")
        return f"![{alt}]({src})" if src else ""
    elif t == "orderedList": return "\n" + inner + "\n"
    elif t == "bulletList": return "\n" + inner + "\n"
    elif t == "listItem": return "• " + inner + "\n"
    elif t == "table":
        rows = nodes.get("content", [])
        if not rows: return ""
        parsed_rows = []
        for row_node in rows:
            if row_node.get("type") != "tableRow": continue
            cells = []
            for cell_node in row_node.get("content", []):
                if cell_node.get("type") in ("tableCell", "tableHeader"):
                    cell_text = pm_to_md(cell_node.get("content", []), "cell").strip()
                    cells.append(cell_text)
            if cells: parsed_rows.append(cells)
        if not parsed_rows: return ""
        col_count = max(len(r) for r in parsed_rows)
        result = "\n"
        for ri, row in enumerate(parsed_rows):
            padded = row + [""] * (col_count - len(row))
            result += "| " + " | ".join(padded[:col_count]) + " |\n"
            if ri == 0: result += "|" + " --- |" * col_count + "\n"
        return result
    elif t == "tableRow":
        cells = [c.strip() for c in inner.split(" | ")]
        return "| " + " | ".join(cells) + " |\n"
    elif t in ("tableCell", "tableHeader"):
        return inner.strip().replace("\n", " ") + " | "
    else:
        return inner

# ─── Extract answer ───
def extract_answer(solution_nodes):
    result = []
    for n in solution_nodes:
        t = n.get("type", "")
        if t == "paragraph":
            line = ""
            for c in n.get("content", []):
                ct = c.get("type", "")
                if ct == "text":
                    marks = c.get("marks", [])
                    is_commentary = any(m.get("type") == "emphasis" and m.get("attrs", {}).get("type") == "commentary" for m in marks)
                    if not is_commentary: line += c.get("text", "")
                elif ct == "equation":
                    line += f"${alt_to_math(c.get('attrs', {}).get('alt', ''))}$"
            if line.strip(): result.append(line.strip())
        elif t == "equation":
            alt = n.get("attrs", {}).get("alt", "")
            result.append(f"${alt_to_math(alt)}$")
    return "\n".join(result)

# ─── SME section/topic mapping ───
SME_MAP = {
    "caie-mathematics-0580-types-of-numbers": ("number", "types-of-numbers"),
    "caie-mathematics-0580-reading-and-ordering-numbers": ("number", "reading-and-ordering-numbers"),
    "caie-mathematics-0580-operations-with-numbers-and-decimals": ("number", "operations-with-numbers-and-decimals"),
    "caie-mathematics-0580-prime-factors-hcf-and-lcm": ("number", "prime-factors-hcf-and-lcm"),
    "caie-mathematics-0580-powers-roots-and-standard-form": ("number", "powers-roots-and-standard-form"),
    "caie-mathematics-0580-introduction-to-fractions": ("number", "introduction-to-fractions"),
    "caie-mathematics-0580-operations-with-fractions": ("number", "operations-with-fractions"),
    "caie-mathematics-0580-percentages": ("number", "percentages"),
    "caie-mathematics-0580-simple-and-compound-interest": ("number", "simple-and-compound-interest"),
    "caie-mathematics-0580-fractions-decimals-and-percentages": ("number", "fractions-decimals-and-percentages"),
    "caie-mathematics-0580-ratio-and-proportion": ("number", "ratio-and-proportion"),
    "caie-mathematics-0580-money-calculations": ("number", "money-calculations"),
    "caie-mathematics-0580-time-currency-and-conversions": ("number", "time-currency-and-conversions"),
    "caie-mathematics-0580-compound-measures": ("number", "compound-measures"),
    "caie-mathematics-0580-rounding-estimation-and-bounds": ("number", "rounding-estimation-and-bounds"),
    "caie-mathematics-0580-using-a-calculator": ("number", "using-a-calculator"),
    "caie-mathematics-0580-introduction-to-algebra": ("algebra-and-sequences", "introduction-to-algebra"),
    "caie-mathematics-0580-algebraic-roots-and-indices": ("algebra-and-sequences", "algebraic-roots-and-indices"),
    "caie-mathematics-0580-expanding-and-factorising-brackets": ("algebra-and-sequences", "expanding-and-factorising-brackets"),
    "caie-mathematics-0580-linear-equations": ("algebra-and-sequences", "linear-equations"),
    "caie-mathematics-0580-inequalities": ("algebra-and-sequences", "inequalities"),
    "caie-mathematics-0580-rearranging-formulas": ("algebra-and-sequences", "rearranging-formulas"),
    "caie-mathematics-0580-simultaneous-equations": ("algebra-and-sequences", "simultaneous-equations"),
    "caie-mathematics-0580-sequences": ("algebra-and-sequences", "sequences"),
    "caie-mathematics-0580-linear-graphs": ("coordinate-geometry-and-graphs", "linear-graphs"),
    "caie-mathematics-0580-further-graphs": ("coordinate-geometry-and-graphs", "further-graphs"),
    "caie-mathematics-0580-real-life-graphs": ("coordinate-geometry-and-graphs", "real-life-graphs"),
    "caie-mathematics-0580-symmetry-and-shapes": ("geometry", "symmetry-and-shapes"),
    "caie-mathematics-0580-basic-angle-properties": ("geometry", "basic-angle-properties"),
    "caie-mathematics-0580-angles-in-polygons-and-parallel-lines": ("geometry", "angles-in-polygons-and-parallel-lines"),
    "caie-mathematics-0580-bearings-constructions-and-scale-drawings": ("geometry", "bearings-constructions-and-scale-drawings"),
    "caie-mathematics-0580-circle-theorems": ("geometry", "circle-theorems"),
    "caie-mathematics-0580-area-and-perimeter": ("lengths-areas-and-volumes", "area-and-perimeter"),
    "caie-mathematics-0580-circles-arcs-and-sectors": ("lengths-areas-and-volumes", "circles-arcs-and-sectors"),
    "caie-mathematics-0580-volume-and-surface-area": ("lengths-areas-and-volumes", "volume-and-surface-area"),
    "caie-mathematics-0580-congruence-and-similarity": ("lengths-areas-and-volumes", "congruence-and-similarity"),
    "caie-mathematics-0580-pythagoras": ("pythagoras-and-trigonometry", "pythagoras"),
    "caie-mathematics-0580-trigonometry": ("pythagoras-and-trigonometry", "trigonometry"),
    "caie-mathematics-0580-transformations": ("transformations", "transformations"),
    "caie-mathematics-0580-basic-probability": ("probability", "basic-probability"),
    "caie-mathematics-0580-set-notation-and-probability-diagrams": ("probability", "set-notation-and-probability-diagrams"),
    "caie-mathematics-0580-averages-and-range": ("statistics", "averages-and-range"),
    "caie-mathematics-0580-statistical-diagrams": ("statistics", "statistical-diagrams"),
    "caie-mathematics-0580-scatter-graphs-and-correlation": ("statistics", "scatter-graphs-and-correlation"),
}

DIFF_ORDER = ["easy", "medium", "hard"]
LABELS = "abcdefghijklmnopqrstuvwxyz"
SME_BASE = "https://www.savemyexams.com/igcse/maths/cie/25/core/topic-questions"

# ─── Get all math topics from DB ───
r = urllib.request.Request(f"{API}/subjects?slug=eq.caie-mathematics-0580&select=id", headers={"apikey": SK, "Authorization": f"Bearer {SK}"})
with urllib.request.urlopen(r, timeout=8, context=ctx) as resp:
    math_id = json.loads(resp.read())[0]["id"]

r2 = urllib.request.Request(f"{API}/topics?subject_id=eq.{math_id}&select=id,name,slug&limit=50", headers={"apikey": SK, "Authorization": f"Bearer {SK}"})
with urllib.request.urlopen(r2, timeout=8, context=ctx) as resp:
    topics = json.loads(resp.read())

# Count questions per topic
topic_ids = ",".join(t["id"] for t in topics)
r3 = urllib.request.Request(f"{API}/questions?topic_id=in.({topic_ids})&select=id,topic_id&limit=2000", headers={"apikey": SK, "Authorization": f"Bearer {SK}"})
with urllib.request.urlopen(r3, timeout=15, context=ctx) as resp:
    all_qs = json.loads(resp.read())

from collections import Counter
q_counts = Counter(q["topic_id"] for q in all_qs)

# Build processing list
to_process = []
for t in topics:
    slug = t["slug"]
    if slug in SME_MAP and q_counts.get(t["id"], 0) > 0 and slug != "caie-mathematics-0580-linear-graphs":
        to_process.append((t["id"], t["name"], slug, SME_MAP[slug]))

print(f"Topics to process: {len(to_process)}")
for tid, name, slug, (sec, sme) in to_process[:5]:
    print(f"  {name}: {sec}/{sme} ({q_counts.get(tid,0)} questions)")
print(f"  ... and {len(to_process)-5} more")

# ─── Process each topic ───
successes = 0
failures = []

for idx, (tid, name, slug, (section, sme_topic)) in enumerate(to_process):
    url = f"{SME_BASE}/{section}/{sme_topic}/exam-questions/"
    print(f"\n[{idx+1}/{len(to_process)}] {name} ({section}/{sme_topic})")
    
    try:
        # Fetch SME data
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
        if not match:
            print(f"  ❌ No __NEXT_DATA__")
            failures.append(name)
            continue
        
        data = json.loads(match.group(1))
        questions = data.get("props", {}).get("pageProps", {}).get("questions", [])
        print(f"  SME: {len(questions)} questions")
        
        # Group by difficulty + order
        grouped = defaultdict(lambda: defaultdict(list))
        for q in questions:
            attrs = q.get("attributes", {})
            diff = attrs.get("difficulty", "medium")
            order = attrs.get("order", 0)
            grouped[diff][order].append(q)
        
        # Build new questions
        new_questions = []
        sort_counter = 0
        
        for diff in DIFF_ORDER:
            if diff not in grouped: continue
            for order in sorted(grouped[diff].keys()):
                qs = grouped[diff][order]
                parts_list, answers_list = [], []
                total_marks = 0
                
                for q in qs:
                    parts = q.get("attributes", {}).get("parts", [])
                    for p in parts:
                        problem = p.get("problem", [])
                        solution = p.get("solution", [])
                        marks = p.get("marks", 0)
                        total_marks += marks
                        parts_list.append(problem)
                        ans = extract_answer(solution)
                        answers_list.append(ans if ans else f"[{marks} mark{'s' if marks != 1 else ''}]")
                
                if len(parts_list) == 1:
                    problem_text = pm_to_md(parts_list[0]).strip()
                    answer_text = answers_list[0] if answers_list else ""
                else:
                    part_texts, part_answers = [], []
                    for pi, problem in enumerate(parts_list):
                        pt = pm_to_md(problem).strip()
                        part_texts.append(f"**({LABELS[pi]})** {pt}")
                        if pi < len(answers_list):
                            part_answers.append(f"({LABELS[pi]}) {answers_list[pi]}")
                    problem_text = "\n\n".join(part_texts)
                    answer_text = "\n".join(part_answers)
                
                problem_text = re.sub(r'\n{3,}', '\n\n', problem_text)
                problem_text += f"\n\n**[Total: {total_marks} mark{'s' if total_marks > 1 else ''}]**"
                
                new_questions.append({
                    "id": str(uuid.uuid4()),
                    "topic_id": tid,
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
        
        # Delete old questions
        del_req = urllib.request.Request(
            f"{API}/questions?select=id&topic_id=eq.{tid}",
            headers={"apikey": SK, "Authorization": f"Bearer {SK}"}
        )
        with urllib.request.urlopen(del_req, timeout=10, context=ctx) as resp:
            old_ids = [q["id"] for q in json.loads(resp.read())]
        
        for i in range(0, len(old_ids), 50):
            batch = old_ids[i:i+50]
            ids_str = ",".join(batch)
            del2 = urllib.request.Request(
                f"{API}/questions?id=in.({ids_str})",
                headers={"apikey": SK, "Authorization": f"Bearer {SK}"}, method="DELETE")
            urllib.request.urlopen(del2, timeout=10, context=ctx)
        
        # Insert new questions
        for q in new_questions:
            ins_req = urllib.request.Request(
                f"{API}/questions",
                data=json.dumps(q).encode(),
                headers={"apikey": SK, "Authorization": f"Bearer {SK}", "Content-Type": "application/json", "Prefer": "return=minimal"},
                method="POST")
            urllib.request.urlopen(ins_req, timeout=10, context=ctx)
        
        print(f"  ✅ {len(new_questions)} questions inserted")
        successes += 1
        
        # Small delay between topics
        time.sleep(0.5)
        
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        failures.append(name)

print(f"\n{'='*60}")
print(f"Done: {successes}/{len(to_process)} succeeded, {len(failures)} failed")
if failures:
    print(f"Failed: {failures}")
