import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch { return null; }
}

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  if (!payload?.sub) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles").select("role").eq("user_id", payload.sub).maybeSingle();
  return data?.role === "admin" ? admin : null;
}

export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filterSubjectId = searchParams.get("subject_id") || "";

  // 1. Subjects for display names
  const { data: subjects } = await admin.from("subjects").select("id, display_name, code, exam_board_id");
  const { data: examBoards } = await admin.from("exam_boards").select("id, name");
  const boardName: Record<string, string> = {};
  if (examBoards) for (const b of examBoards) boardName[b.id] = b.name;

  const subjectDisplay: Record<string, string> = {};
  for (const s of subjects || []) {
    const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
    subjectDisplay[s.id] = b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim();
  }

  // 2. Coverage from subject_coverage table (pre-computed per subtopic)
  let covQuery = admin.from("subject_coverage").select("subject_id, subtopic_id, topic_name, subtopic_name, has_notes, has_topic_qp, has_topic_ms, has_mcq_qp, has_mcq_ms");
  if (filterSubjectId) covQuery = covQuery.eq("subject_id", filterSubjectId);
  const { data: coverageRows } = await covQuery;

  // Group coverage by subject_id
  const covBySubject: Record<string, typeof coverageRows> = {};
  if (coverageRows) {
    for (const row of coverageRows) {
      if (!covBySubject[row.subject_id]) covBySubject[row.subject_id] = [];
      covBySubject[row.subject_id].push(row);
    }
  }

  // 3. Stats from subject_stats table (aggregate counts)
  let statsQuery = admin.from("subject_stats").select("subject_id, past_paper_qp_count, past_paper_ms_count, total_subtopics");
  if (filterSubjectId) statsQuery = statsQuery.eq("subject_id", filterSubjectId);
  const { data: statsRows } = await statsQuery;
  const statsBySubject: Record<string, any> = {};
  if (statsRows) {
    for (const row of statsRows) {
      statsBySubject[row.subject_id] = row;
    }
  }

  // 4. Past paper missing details — targeted lightweight query
  // Find QP keys and MS keys per subject to identify unmatched pairs
  let ppQuery = admin.from("past_papers").select("subject_id, year, season, paper_number, paper_type");
  if (filterSubjectId) ppQuery = ppQuery.eq("subject_id", filterSubjectId);
  const { data: pastPapers } = await ppQuery;

  // Group past papers by subject
  const qpKeysBySub: Record<string, Set<string>> = {};
  const msKeysBySub: Record<string, Set<string>> = {};
  const qpPapersBySub: Record<string, { year: number; season: string; paper_number: string }[]> = {};
  const msPapersBySub: Record<string, { year: number; season: string; paper_number: string }[]> = {};

  for (const p of pastPapers || []) {
    const sid = p.subject_id;
    if (!sid) continue;
    const pt = p.paper_type || "";

    if (pt === "Question Paper" || pt === "QP") {
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!qpKeysBySub[sid]) qpKeysBySub[sid] = new Set();
      qpKeysBySub[sid].add(key);
      if (!qpPapersBySub[sid]) qpPapersBySub[sid] = [];
      qpPapersBySub[sid].push({ year: p.year, season: p.season, paper_number: p.paper_number });
    } else if (pt === "Mark Scheme" || pt === "MS") {
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!msKeysBySub[sid]) msKeysBySub[sid] = new Set();
      msKeysBySub[sid].add(key);
      if (!msPapersBySub[sid]) msPapersBySub[sid] = [];
      msPapersBySub[sid].push({ year: p.year, season: p.season, paper_number: p.paper_number });
    }
  }

  // 5. Build response
  const coverage: Record<string, any> = {};

  for (const s of subjects || []) {
    const sid = s.id;
    const sts = covBySubject[sid];
    if (!sts || sts.length === 0) {
      if (!filterSubjectId) continue;
      // Still add an entry with 0s
      coverage[sid] = {
        subject_name: subjectDisplay[sid] || sid,
        total_subtopics: 0,
        subtopics: [],
        notes: { has: 0, total: 0, missing: [] },
        practice: { has: 0, total: 0, missing: [] },
        practice_answer: { has: 0, total: 0, missing: [] },
        mcq: { has: 0, total: 0, missing: [] },
        mcq_answer: { has: 0, total: 0, missing: [] },
        past_paper_qp: statsBySubject[sid]?.past_paper_qp_count || 0,
        past_paper_mcq_qp: 0,
        past_paper_ms: statsBySubject[sid]?.past_paper_ms_count || 0,
        past_paper_missing_ms: 0,
        past_paper_missing_ms_details: [],
        past_paper_missing_qp_details: [],
      };
      continue;
    }

    const total = sts.length;
    const missingNotes: any[] = [];
    const missingPractice: any[] = [];
    const missingPracticeAns: any[] = [];
    const missingMcq: any[] = [];
    const missingMcqAns: any[] = [];
    let hasNotes = 0, hasPractice = 0, hasPracticeAns = 0, hasMcq = 0, hasMcqAns = 0;

    for (const st of sts) {
      const subInfo = { id: st.subtopic_id, name: st.subtopic_name, topic: st.topic_name };

      if (st.has_notes) { hasNotes++; } else { missingNotes.push(subInfo); }
      if (st.has_topic_qp) { hasPractice++; } else { missingPractice.push(subInfo); }
      if (st.has_topic_ms) { hasPracticeAns++; } else { missingPracticeAns.push(subInfo); }
      if (st.has_mcq_qp) { hasMcq++; } else { missingMcq.push(subInfo); }
      if (st.has_mcq_ms) { hasMcqAns++; } else { missingMcqAns.push(subInfo); }
    }

    // Past paper stats
    const examQp = statsBySubject[sid]?.past_paper_qp_count || 0;
    const examMs = statsBySubject[sid]?.past_paper_ms_count || 0;
    const msKeys = msKeysBySub[sid] || new Set();
    const qpKeys = qpKeysBySub[sid] || new Set();
    const qpPapers = qpPapersBySub[sid] || [];
    const msPapers = msPapersBySub[sid] || [];
    const missingMsDetails: { year: number; season: string; paper_number: string }[] = [];
    const missingQpDetails: { year: number; season: string; paper_number: string }[] = [];
    for (const p of qpPapers) {
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!msKeys.has(key)) missingMsDetails.push(p);
    }
    for (const p of msPapers) {
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!qpKeys.has(key)) missingQpDetails.push(p);
    }

    coverage[sid] = {
      subject_name: subjectDisplay[sid] || sid,
      total_subtopics: total,
      subtopics: sts.map(st => ({
        id: st.subtopic_id,
        name: st.subtopic_name,
        topic: st.topic_name,
      })),
      notes: { has: hasNotes, total, missing: missingNotes },
      practice: { has: hasPractice, total, missing: missingPractice },
      practice_answer: { has: hasPracticeAns, total, missing: missingPracticeAns },
      mcq: { has: hasMcq, total, missing: missingMcq },
      mcq_answer: { has: hasMcqAns, total, missing: missingMcqAns },
      past_paper_qp: examQp,
      past_paper_mcq_qp: 0,
      past_paper_ms: examMs,
      past_paper_missing_ms: missingMsDetails.length,
      past_paper_missing_ms_details: missingMsDetails,
      past_paper_missing_qp_details: missingQpDetails,
    };
  }

  return NextResponse.json({
    subjects: (subjects || []).map(s => ({
      id: s.id,
      name: subjectDisplay[s.id] || `${s.display_name} ${s.code || ""}`.trim(),
    })),
    coverage,
  });
}
