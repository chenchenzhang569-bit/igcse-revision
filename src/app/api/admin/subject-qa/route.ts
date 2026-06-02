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

  // Fetch subjects
  const { data: subjects } = await admin.from("subjects").select("id, display_name, code, exam_board_id");
  const { data: examBoards } = await admin.from("exam_boards").select("id, name");
  const boardName: Record<string, string> = {};
  if (examBoards) for (const b of examBoards) boardName[b.id] = b.name;

  const subjectDisplay: Record<string, string> = {};
  for (const s of subjects || []) {
    const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
    subjectDisplay[s.id] = b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim();
  }

  // Fetch all topics (subtopics have no subject_id column)
  let topicQ = admin.from("topics").select("id, display_name, subject_id");
  if (filterSubjectId) topicQ = topicQ.eq("subject_id", filterSubjectId);
  const { data: allTopics } = await topicQ;
  const topicSubjectMap: Record<string, string> = {};
  for (const t of allTopics || []) topicSubjectMap[t.id] = t.subject_id;
  const topicIds = (allTopics || []).map(t => t.id);

  // Get subtopics for those topics
  let subtopicQ = admin.from("subtopics").select("id, display_name, topic_id");
  if (topicIds.length) subtopicQ = subtopicQ.in("topic_id", topicIds);
  const { data: rawSubtopics } = await subtopicQ;
  const allSubtopics = (rawSubtopics || []).map(st => ({
    ...st,
    subject_id: topicSubjectMap[st.topic_id] || "",
  }));

  // Fetch all topics for display
  const { data: topics } = await admin.from("topics").select("id, display_name");
  const topicName: Record<string, string> = {};
  if (topics) for (const t of topics) topicName[t.id] = t.display_name;

  // Group subtopics by subject
  const subjSubtopics: Record<string, typeof allSubtopics> = {};
  for (const st of allSubtopics) {
    if (!subjSubtopics[st.subject_id]) subjSubtopics[st.subject_id] = [];
    subjSubtopics[st.subject_id].push(st);
  }

  // Fetch notes with file_url — no subject_id filter (notesBySub is checked per-subtopic in the loop below)
  let notesQ = admin.from("notes").select("id, subtopic_id, file_url").not("file_url", "is", null);
  const { data: notes } = await notesQ;
  const notesBySub: Record<string, number> = {};
  for (const n of notes || []) {
    if (n.subtopic_id) notesBySub[n.subtopic_id] = (notesBySub[n.subtopic_id] || 0) + 1;
  }

  // Past papers — fetch all for this subject
  let ppQ = admin.from("past_papers").select("id, subject_id, subtopic_id, paper_type, year, season, paper_number");
  if (filterSubjectId) ppQ = ppQ.eq("subject_id", filterSubjectId);
  const { data: pastPapers } = await ppQ;
  const allPps = pastPapers || [];

  // Group past papers by subject for exam paper counts
  const examQpBySub: Record<string, number> = {};
  const examMsBySub: Record<string, number> = {};
  const msKeysBySub: Record<string, Set<string>> = {};
  const qpKeysBySub: Record<string, Set<string>> = {};
  const qpPapersBySub: Record<string, { year: number; season: string; paper_number: string }[]> = {};
  const msPapersBySub: Record<string, { year: number; season: string; paper_number: string }[]> = {};
  // Group by subtopic for topic/MCQ PDFs
  const topicQpBySub: Record<string, Set<string>> = {};
  const topicMsBySub: Record<string, Set<string>> = {};
  const mcqQpBySub: Record<string, Set<string>> = {};
  const mcqMsBySub: Record<string, Set<string>> = {};

  for (const p of allPps) {
    const sid = p.subject_id;
    if (!sid) continue;
    const pt = p.paper_type || "";

    // Exam papers (total count)
    if (pt === "Question Paper" || pt === "QP") {
      examQpBySub[sid] = (examQpBySub[sid] || 0) + 1;
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!qpKeysBySub[sid]) qpKeysBySub[sid] = new Set();
      qpKeysBySub[sid].add(key);
      if (!qpPapersBySub[sid]) qpPapersBySub[sid] = [];
      qpPapersBySub[sid].push({ year: p.year, season: p.season, paper_number: p.paper_number });
    } else if (pt === "Mark Scheme" || pt === "MS") {
      examMsBySub[sid] = (examMsBySub[sid] || 0) + 1;
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!msKeysBySub[sid]) msKeysBySub[sid] = new Set();
      msKeysBySub[sid].add(key);
      if (!msPapersBySub[sid]) msPapersBySub[sid] = [];
      msPapersBySub[sid].push({ year: p.year, season: p.season, paper_number: p.paper_number });
    }

    // Topic & MCQ PDFs (per subtopic)
    if (!topicQpBySub[sid]) topicQpBySub[sid] = new Set();
    if (!topicMsBySub[sid]) topicMsBySub[sid] = new Set();
    if (!mcqQpBySub[sid]) mcqQpBySub[sid] = new Set();
    if (!mcqMsBySub[sid]) mcqMsBySub[sid] = new Set();

    if (p.subtopic_id) {
      if (pt === "Topic QP") topicQpBySub[sid].add(p.subtopic_id);
      else if (pt === "Topic MS") topicMsBySub[sid].add(p.subtopic_id);
      else if (pt === "MCQ QP") mcqQpBySub[sid].add(p.subtopic_id);
      else if (pt === "MCQ MS") mcqMsBySub[sid].add(p.subtopic_id);
    }
  }

  // Build response
  const coverage: Record<string, any> = {};

  for (const s of subjects || []) {
    const sid = s.id;
    const sts = subjSubtopics[sid] || [];
    const total = sts.length;
    if (total === 0 && !filterSubjectId) continue;

    const topicQpSet = topicQpBySub[sid] || new Set();
    const topicMsSet = topicMsBySub[sid] || new Set();
    const mcqQpSet = mcqQpBySub[sid] || new Set();
    const mcqMsSet = mcqMsBySub[sid] || new Set();

    let hasNotes = 0, hasPractice = 0, hasPracticeAns = 0, hasMcq = 0, hasMcqAns = 0;
    const missingNotes: any[] = [];
    const missingPractice: any[] = [];
    const missingPracticeAns: any[] = [];
    const missingMcq: any[] = [];
    const missingMcqAns: any[] = [];

    // Check each subtopic for PDF coverage
    for (const st of sts) {
      const stid = st.id;
      const subInfo = { id: stid, name: st.display_name, topic: topicName[st.topic_id] || "" };

      // Notes (from notes table)
      const hasNote = (notesBySub[stid] || 0) > 0;
      if (hasNote) hasNotes++;
      else missingNotes.push(subInfo);

      // Practice = has Topic QP PDF
      if (topicQpSet.has(stid)) hasPractice++;
      else missingPractice.push(subInfo);

      // Practice answers = has Topic MS PDF
      if (topicMsSet.has(stid)) hasPracticeAns++;
      else missingPracticeAns.push(subInfo);

      // MCQ = has MCQ QP PDF
      if (mcqQpSet.has(stid)) hasMcq++;
      else missingMcq.push(subInfo);

      // MCQ answers = has MCQ MS PDF
      if (mcqMsSet.has(stid)) hasMcqAns++;
      else missingMcqAns.push(subInfo);
    }

    // Past paper stats — find unmatched QP and MS
    const examQp = examQpBySub[sid] || 0;
    const examMs = examMsBySub[sid] || 0;
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
        id: st.id,
        name: st.display_name,
        topic: topicName[st.topic_id] || "",
      })),
      notes: { has: hasNotes, total, missing: missingNotes },
      practice: { has: hasPractice, total, missing: missingPractice },
      practice_answer: { has: hasPracticeAns, total, missing: missingPracticeAns },
      mcq: { has: hasMcq, total, missing: missingMcq },
      mcq_answer: { has: hasMcqAns, total, missing: missingMcqAns },
      past_paper_qp: examQp,
      past_paper_mcq_qp: 0, // deprecated
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
