#!/usr/bin/env python3
"""
每日统计同步脚本：从 DB + R2 汇总数据到 subject_stats 和 subject_coverage 表。
使用 supabase CLI 执行 SQL 查询（已 linked）。
"""
import os, sys, json, subprocess, tempfile, urllib.request
from collections import defaultdict

# ─── Config ───
R2_ACCOUNT = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET = os.environ.get("R2_SECRET_KEY", "")
WORKDIR = "/home/ubuntu/igcse-revision"

# ─── Helpers ───
def sql(query_str, output="json"):
    """Run SQL via supabase CLI and return parsed JSON."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write(query_str)
        sqlfile = f.name
    try:
        result = subprocess.run(
            ["supabase", "db", "query", "--linked", f"--file={sqlfile}", f"-o={output}"],
            capture_output=True, text=True, cwd=WORKDIR, timeout=60,
        )
        if result.returncode != 0:
            print(f"  SQL Error: {result.stderr[:500]}")
            return []
        if output == "json":
            # Parse JSON from stdout (skip any non-JSON lines)
            lines = result.stdout.strip().split("\n")
            for i, line in enumerate(lines):
                if line.startswith("["):
                    return json.loads("\n".join(lines[i:]))
            return []
        return result.stdout
    finally:
        os.unlink(sqlfile)

def rest_upsert(table, rows, conflict_col=None):
    """Upsert rows via Supabase REST API with service_role key."""
    if not rows:
        return
    SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
    SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if conflict_col:
        url += f"?on_conflict={conflict_col}"
    headers = {
        "apikey": SERVICE_ROLE,
        "Authorization": f"Bearer {SERVICE_ROLE}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    req = urllib.request.Request(url, data=json.dumps(rows).encode(), headers=headers, method="POST")
    urllib.request.urlopen(req, timeout=120)

def get_r2_question_count(prefix):
    """Count questions in R2 JSON files under a prefix."""
    import boto3
    s3 = boto3.client("s3",
        endpoint_url=f"https://{R2_ACCOUNT}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS,
        aws_secret_access_key=R2_SECRET,
    )
    total_q = 0
    token = None
    while True:
        params = {"Bucket": "past-papers", "Prefix": prefix}
        if token:
            params["ContinuationToken"] = token
        resp = s3.list_objects_v2(**params)
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".json"):
                continue
            try:
                obj_data = s3.get_object(Bucket="past-papers", Key=key)
                data = json.loads(obj_data["Body"].read().decode("utf-8"))
                total_q += len(data) if isinstance(data, list) else 0
            except:
                pass
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    return total_q
def get_r2_mock_counts():
    """Count questions in R2 mock exam JSON files."""
    import boto3
    s3 = boto3.client("s3",
        endpoint_url=f"https://{R2_ACCOUNT}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS,
        aws_secret_access_key=R2_SECRET,
    )
    mock_map = {
        "4MA1 Foundation": "mock/edexcel_4ma1_foundation_mock_questions.json",
        "4MA1 Higher": "mock/edexcel_4ma1_higher_mock_questions.json",
        "4BI1": "mock/edexcel_bio_mock_questions.json",
        "4BS1": "mock/edexcel_business_4bs1_mock_questions.json",
        "4CH1": "mock/edexcel_chem_mock_questions.json",
        "4PH1": "mock/edexcel_phys_mock_questions.json",
    }
    results = {}
    for name, key in mock_map.items():
        try:
            obj_data = s3.get_object(Bucket="sme-images", Key=key)
            raw = obj_data["Body"].read().decode("utf-8")
            data = json.loads(raw)
            if isinstance(data, list):
                count = len(data)
            else:
                count = sum(len(p.get("questions", [])) for s in data.get("sets", []) for p in s.get("papers", []))
            results[name] = count
        except Exception as e:
            print(f"  WARN: R2 mock {key}: {e}")
            results[name] = 0
    return results


# ─── Main ───
def main():
    import urllib.request
    print("=== Syncing subject_stats + subject_coverage ===")
    
    # 1. Subjects
    subjects = sql("""
        SELECT s.id, s.code, s.name, s.display_name, s.slug, s.exam_board_id, eb.slug as board_slug
        FROM subjects s
        JOIN exam_boards eb ON eb.id = s.exam_board_id
        ORDER BY eb.slug, s.code
    """)
    print(f"  Subjects: {len(subjects)}")
    code_to_ids = defaultdict(list)
    for s in subjects:
        code_to_ids[s["code"]].append(s["id"])
    
    # 2. DB counts
    pp_raw = sql("SELECT subject_id, COUNT(*)::int as cnt FROM past_papers GROUP BY subject_id")
    pp_map = {r["subject_id"]: r["cnt"] for r in pp_raw}
    
    notes_raw = sql("SELECT subject_id, COUNT(*)::int as cnt FROM notes GROUP BY subject_id")
    notes_map = {r["subject_id"]: r["cnt"] for r in notes_raw}
    
    q_raw = sql("SELECT subject_id, COUNT(*)::int as cnt FROM questions GROUP BY subject_id")
    q_map = {r["subject_id"]: r["cnt"] for r in q_raw}
    
    mcq_raw = sql("""
        SELECT subject_id,
            COUNT(*) FILTER (WHERE question_type = 'mcq')::int as mcq,
            COUNT(*) FILTER (WHERE question_type = 'structured')::int as structured
        FROM questions GROUP BY subject_id
    """)
    mcq_map = {r["subject_id"]: r["mcq"] for r in mcq_raw}
    struct_map = {r["subject_id"]: r["structured"] for r in mcq_raw}
    
    pp_type_raw = sql("""
        SELECT subject_id,
            COUNT(*) FILTER (WHERE paper_type IN ('Question Paper','QP'))::int as qp_count,
            COUNT(*) FILTER (WHERE paper_type IN ('Mark Scheme','MS'))::int as ms_count
        FROM past_papers GROUP BY subject_id
    """)
    pp_qp_map = {r["subject_id"]: r["qp_count"] for r in pp_type_raw}
    pp_ms_map = {r["subject_id"]: r["ms_count"] for r in pp_type_raw}
    
    # Mock exam questions (count questions per subject via set→paper→question)
    mock_raw = sql("""
        SELECT ms.subject, COUNT(*)::int as questions
        FROM mock_exam_sets ms
        JOIN mock_exam_papers mp ON mp.set_id = ms.id
        JOIN mock_exam_questions mq ON mq.paper_id = mp.id
        GROUP BY ms.subject
    """)
    mock_code_map = {
        "maths": ["0580"],
        "0606": ["0606"],
        "biology": ["0610"],
        "chemistry": ["0620"],
        "physics": ["0625"],
        "economics": ["0455"],
        "computer-science": ["0478"],
        "edexcel-biology": ["4BI1"],
    }
    mock_counts = defaultdict(int)
    for row in mock_raw:
        codes = mock_code_map.get(row["subject"], [])
        for code in codes:
            for sid in code_to_ids.get(code, []):
                mock_counts[sid] += row["questions"]
    
    # 3. Coverage: topics, subtopics
    topics = sql("SELECT id, display_name, subject_id FROM topics")
    topic_map = {t["id"]: t for t in topics}
    subtopics = sql("SELECT id, display_name, topic_id FROM subtopics")
    
    topic_ids_by_subject = defaultdict(list)
    for t in topics:
        topic_ids_by_subject[t["subject_id"]].append(t["id"])
    
    subtopics_by_topic = defaultdict(list)
    for st in subtopics:
        subtopics_by_topic[st["topic_id"]].append(st)
    
    # Coverage: past_paper types per subtopic
    pp_cov = sql("""
        SELECT subtopic_id, paper_type FROM past_papers
        WHERE subtopic_id IS NOT NULL AND paper_type IN ('Topic QP','Topic MS','MCQ QP','MCQ MS')
    """)
    st_cov = {"notes": set(), "topic_qp": set(), "topic_ms": set(), "mcq_qp": set(), "mcq_ms": set()}
    for p in pp_cov:
        stid = p["subtopic_id"]
        pt = p["paper_type"]
        if pt == "Topic QP": st_cov["topic_qp"].add(stid)
        elif pt == "Topic MS": st_cov["topic_ms"].add(stid)
        elif pt == "MCQ QP": st_cov["mcq_qp"].add(stid)
        elif pt == "MCQ MS": st_cov["mcq_ms"].add(stid)
    
    notes_cov = sql("SELECT subtopic_id FROM notes WHERE file_url IS NOT NULL")
    for n in notes_cov:
        if n.get("subtopic_id"):
            st_cov["notes"].add(n["subtopic_id"])
    
    # 3b. Coverage: R2 PDF files by pmt_code
    print("  Fetching R2 coverage data...")
    import boto3
    s3 = boto3.client("s3",
        endpoint_url=f"https://{R2_ACCOUNT}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS,
        aws_secret_access_key=R2_SECRET,
    )
    
    # Get all subtopics with pmt_code, grouped by subject code
    st_pmt = sql("""
        SELECT s.code, st.id as stid, st.pmt_code 
        FROM subtopics st
        JOIN topics t ON t.id = st.topic_id
        JOIN subjects s ON s.id = t.subject_id
        WHERE st.pmt_code IS NOT NULL
    """)
    
    # Map R2 folders to subject codes
    r2_coverage = {
        "chemistry": {"codes": ["0620"], "types": {"Summary": "notes", "Topic_QP": "topic_qp", "Topic_MS": "topic_ms", "MCQ_QP": "mcq_qp", "MCQ_MS": "mcq_ms"}},
        "physics": {"codes": ["0625"], "types": {"Summary": "notes", "Definition": "notes"}},
        "biology": {"codes": ["0610"], "types": {"Summary": "notes"}},
    }
    
    import re
    for folder, config in r2_coverage.items():
        prefix = f"{folder}/"
        resp = s3.list_objects_v2(Bucket="past-papers", Prefix=prefix)
        if not resp.get("Contents"):
            continue
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".pdf"):
                continue
            fname = key.replace(prefix, "")
            m = re.match(r'([\d.]+)_(.+)\.pdf', fname)
            if not m:
                continue
            pmt = m.group(1)
            ftype = m.group(2)
            dim = config["types"].get(ftype)
            if not dim:
                continue
            # Find matching subtopics for this pmt_code
            for row in st_pmt:
                if row["pmt_code"] == pmt and row["code"] in config["codes"]:
                    st_cov[dim].add(row["stid"])
    
    # Edexcel Physics (4PH1) R2 coverage
    phy_prefix = "edexcel_physics_questions/"
    resp = s3.list_objects_v2(Bucket="past-papers", Prefix=phy_prefix)
    if resp.get("Contents"):
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".pdf"):
                continue
            fname = key.replace(phy_prefix, "")
            m = re.match(r'([\d.]+)_(ms|qp)\.pdf', fname)
            if not m:
                continue
            pmt = m.group(1)
            ftype = "topic_qp" if m.group(2) == "qp" else "topic_ms"
            for row in st_pmt:
                if row["pmt_code"] == pmt and row["code"] == "4PH1":
                    st_cov[ftype].add(row["stid"])
    
    # CS (0478) R2 coverage: cs-topic-questions/ organized by UUID
    cs_prefix = "cs-topic-questions/"
    resp = s3.list_objects_v2(Bucket="past-papers", Prefix=cs_prefix)
    if resp.get("Contents"):
        # Group by UUID folder
        cs_files = defaultdict(lambda: {"qp": False, "ms": False})
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            path = key.replace(cs_prefix, "")
            parts = path.split("/")
            if len(parts) >= 2:
                uuid = parts[0]
                fname = parts[1].lower()
                if "_q." in fname and fname.endswith(".pdf"):
                    cs_files[uuid]["qp"] = True
                elif "_a.pdf" in fname or "_ms.pdf" in fname or "ms.pdf" in fname:
                    cs_files[uuid]["ms"] = True
        for uuid, flags in cs_files.items():
            for row in st_pmt:
                if row["stid"] == uuid and row["code"] == "0478":
                    if flags["qp"]: st_cov["topic_qp"].add(uuid)
                    if flags["ms"]: st_cov["topic_ms"].add(uuid)

    # Edexcel science subjects: igcse/{subject}/edexcel/{QP|MS|NOTES}/{slug}/
    edexcel_sci_config = [
        {"r2_subj": "biology", "code": "4BI1"},
        {"r2_subj": "chemistry", "code": "4CH1"},
        {"r2_subj": "physics", "code": "4PH1"},
    ]
    # Get subtopic slugs by subject code
    st_slugs = sql("""
        SELECT s.code, st.id as stid, st.slug, t.slug as topic_slug
        FROM subtopics st
        JOIN topics t ON t.id = st.topic_id
        JOIN subjects s ON s.id = t.subject_id
        WHERE s.code IN ('4BI1','4CH1','4PH1')
    """)
    # Build: code → {slug: stid} and code → {topic_slug: [stid]}
    st_by_code = {}
    topic_sts = {}
    for row in st_slugs:
        code = row["code"]
        if code not in st_by_code:
            st_by_code[code] = {}
            topic_sts[code] = {}
        st_by_code[code][row["slug"]] = row["stid"]
        ts = row["topic_slug"]
        if ts not in topic_sts[code]:
            topic_sts[code][ts] = []
        topic_sts[code][ts].append(row["stid"])

    for cfg in edexcel_sci_config:
        subj = cfg["r2_subj"]
        code = cfg["code"]
        slug_map = st_by_code.get(code, {})
        topic_map = topic_sts.get(code, {})

        for r2_type, cov_dim in [("QP", "topic_qp"), ("MS", "topic_ms"), ("NOTES", "notes")]:
            prefix = f"igcse/{subj}/edexcel/{r2_type}/"
            resp = s3.list_objects_v2(Bucket="past-papers", Prefix=prefix)
            if not resp.get("Contents"):
                continue
            # Collect unique slugs from subdirectories
            dir_slugs = set()
            for obj in resp["Contents"]:
                key = obj["Key"]
                if not key.endswith(".pdf"):
                    continue
                path = key.replace(prefix, "")
                parts = path.split("/")
                if len(parts) >= 1:
                    dir_slugs.add(parts[0])  # the folder/slug name
            if not dir_slugs:
                continue
            print(f"  R2 edexcel {subj}/{r2_type}: {len(dir_slugs)} slugs")
            for slug in dir_slugs:
                # Try exact subtopic slug match
                if slug in slug_map:
                    st_cov[cov_dim].add(slug_map[slug])
                else:
                    # Try topic slug match (mark all subtopics under that topic)
                    # R2 slugs might be shorter (no numeric prefix like "1-")
                    for topic_slug, stids in topic_map.items():
                        if slug in topic_slug or topic_slug.endswith(slug):
                            for stid in stids:
                                st_cov[cov_dim].add(stid)

    
    print(f"  Coverage: notes={len(st_cov['notes'])}, topic_qp={len(st_cov['topic_qp'])}, mcq_qp={len(st_cov['mcq_qp'])}")
    
    # 4. R2 questions
    print("  Fetching R2 question counts...")
    
    r2_counts = {}
    r2_counts["4MA1 Foundation"] = get_r2_question_count("igcse/maths/edexcel/sme-questions/foundation/")
    r2_counts["4MA1 Higher"] = get_r2_question_count("igcse/maths/edexcel/sme-questions/higher/")
    r2_counts["4EC1"] = get_r2_question_count("igcse/economics/edexcel/sme-questions/")
    r2_counts["4GE1"] = get_r2_question_count("igcse/geography/edexcel/sme-questions/")
    
    # 4PM1: root-level files only (skip subdirs)
    import boto3
    s3 = boto3.client("s3",
        endpoint_url=f"https://{R2_ACCOUNT}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS,
        aws_secret_access_key=R2_SECRET,
    )
    pm1_q = 0
    token = None
    while True:
        params = {"Bucket": "past-papers", "Prefix": "igcse/maths/edexcel/sme-questions/"}
        if token:
            params["ContinuationToken"] = token
        resp = s3.list_objects_v2(**params)
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".json"):
                continue
            path = key.replace("igcse/maths/edexcel/sme-questions/", "")
            if "/" not in path:  # root-level only
                try:
                    obj_data = s3.get_object(Bucket="past-papers", Key=key)
                    data = json.loads(obj_data["Body"].read().decode("utf-8"))
                    pm1_q += len(data) if isinstance(data, list) else 0
                except:
                    pass
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    r2_counts["4PM1"] = pm1_q
    
    for k, v in r2_counts.items():
        print(f"  R2 {k}: {v} questions")
    
    # 5. R2 mock exams
    print("  Fetching R2 mock exam counts...")
    r2_mocks = get_r2_mock_counts()
    for k, v in r2_mocks.items():
        print(f"  R2 Mock {k}: {v} questions")
    
    # 6. Build subject_stats
    stats_rows = []
    for s in subjects:
        sid = s["id"]
        code = s["code"]
        display = s.get("display_name", "")
        name = s.get("name", "")
        
        if code == "4MA1":
            name_lower = (name or "").lower()
            if "foundation" in name_lower or "(f)" in display.lower():
                r2_q = r2_counts.get("4MA1 Foundation", 0)
                r2_m = r2_mocks.get("4MA1 Foundation", 0)
            else:
                r2_q = r2_counts.get("4MA1 Higher", 0)
                r2_m = r2_mocks.get("4MA1 Higher", 0)
        else:
            r2_q = r2_counts.get(code, 0)
            r2_m = r2_mocks.get(code, 0)
        
        topic_ids = topic_ids_by_subject.get(sid, [])
        sub_subtopics = []
        for tid in topic_ids:
            sub_subtopics.extend(subtopics_by_topic.get(tid, []))
        
        total_st = len(sub_subtopics)
        st_notes = sum(1 for st in sub_subtopics if st["id"] in st_cov["notes"])
        st_practice = sum(1 for st in sub_subtopics if st["id"] in st_cov["topic_qp"])
        st_practice_ans = sum(1 for st in sub_subtopics if st["id"] in st_cov["topic_ms"])
        st_mcq = sum(1 for st in sub_subtopics if st["id"] in st_cov["mcq_qp"])
        st_mcq_ans = sum(1 for st in sub_subtopics if st["id"] in st_cov["mcq_ms"])
        
        row = {
            "subject_id": sid,
            "past_papers": pp_map.get(sid, 0),
            "notes": notes_map.get(sid, 0),
            "questions": q_map.get(sid, 0),
            "questions_mcq": mcq_map.get(sid, 0),
            "questions_structured": struct_map.get(sid, 0),
            "mock_exams": mock_counts.get(sid, 0),
            "r2_questions": r2_q,
            "r2_mock_exams": r2_m,
            "past_paper_qp_count": pp_qp_map.get(sid, 0),
            "past_paper_ms_count": pp_ms_map.get(sid, 0),
            "total_subtopics": total_st,
            "subtopics_with_notes": st_notes,
            "subtopics_with_practice": st_practice,
            "subtopics_with_practice_answers": st_practice_ans,
            "subtopics_with_mcq": st_mcq,
            "subtopics_with_mcq_answers": st_mcq_ans,
        }
        stats_rows.append(row)
    
    print(f"\n  Upserting {len(stats_rows)} subject_stats rows...")
    rest_upsert("subject_stats", stats_rows)
    
    # 7. Build subject_coverage
    coverage_rows = []
    for s in subjects:
        sid = s["id"]
        for tid in topic_ids_by_subject.get(sid, []):
            t = topic_map.get(tid, {})
            tname = t.get("display_name", "")
            for st in subtopics_by_topic.get(tid, []):
                coverage_rows.append({
                    "subject_id": sid,
                    "subtopic_id": st["id"],
                    "topic_name": tname,
                    "subtopic_name": st["display_name"],
                    "has_notes": st["id"] in st_cov["notes"],
                    "has_topic_qp": st["id"] in st_cov["topic_qp"],
                    "has_topic_ms": st["id"] in st_cov["topic_ms"],
                    "has_mcq_qp": st["id"] in st_cov["mcq_qp"],
                    "has_mcq_ms": st["id"] in st_cov["mcq_ms"],
                })
    
    print(f"  Upserting {len(coverage_rows)} subject_coverage rows...")
    for i in range(0, len(coverage_rows), 500):
        rest_upsert("subject_coverage", coverage_rows[i:i+500], conflict_col="subtopic_id")
    
    # 8. Verify
    stats_cnt = sql("SELECT COUNT(*)::int as cnt FROM subject_stats")
    cov_cnt = sql("SELECT COUNT(*)::int as cnt FROM subject_coverage")
    print(f"\n  Verified: subject_stats={stats_cnt[0]['cnt']} rows, subject_coverage={cov_cnt[0]['cnt']} rows")
    print("=== Done ===")

if __name__ == "__main__":
    main()
