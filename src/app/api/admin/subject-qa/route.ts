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

function subjectToMockText(displayName: string, code: string): string {
  const d = displayName.toLowerCase();
  if (d.includes("mathematics")) return "maths";
  if (d.includes("computer")) return "computer-science";
  if (d.includes("additional")) return code || "0606";
  if (d.includes("biology")) return "biology";
  if (d.includes("chemistry")) return "chemistry";
  if (d.includes("physics")) return "physics";
  if (d.includes("economics")) return "economics";
  return d;
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

  // Fetch all subtopics via topics (subtopics has no subject_id column)
  let topicQ = admin.from("topics").select("id, display_name, subject_id");
  if (filterSubjectId) topicQ = topicQ.eq("subject_id", filterSubjectId);
  const { data: allTopics } = await topicQ;
  const topicNames: Record<string, string> = {};
  const topicSubjectMap: Record<string, string> = {};
  for (const t of allTopics || []) {
    topicNames[t.id] = t.display_name;
    topicSubjectMap[t.id] = t.subject_id;
  }
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

  // Fetch questions for all relevant subtopics
  const subtopicIds = allSubtopics.map(s => s.id);
  let questions: any[] = [];
  if (subtopicIds.length > 0) {
    const { data: q } = await admin.from("questions")
      .select("id, subtopic_id, question_type, clean_answer_text, options")
      .in("subtopic_id", subtopicIds);
    questions = q || [];
  }

  // Group questions by subtopic
  const qBySub: Record<string, { mcq: number; mcqWithAns: number; practice: number; practiceWithAns: number }> = {};
  for (const qq of questions) {
    const sid = qq.subtopic_id;
    if (!sid) continue;
    if (!qBySub[sid]) qBySub[sid] = { mcq: 0, mcqWithAns: 0, practice: 0, practiceWithAns: 0 };
    if (qq.question_type === "mcq") {
      qBySub[sid].mcq++;
      if (qq.options) qBySub[sid].mcqWithAns++;
    } else {
      qBySub[sid].practice++;
      if (qq.clean_answer_text) qBySub[sid].practiceWithAns++;
    }
  }

  // Fetch notes with file_url
  let notesQ = admin.from("notes").select("id, subtopic_id, file_url").not("file_url", "is", null);
  if (filterSubjectId) notesQ = notesQ.eq("subject_id", filterSubjectId);
  const { data: notes } = await notesQ;
  const notesBySub: Record<string, number> = {};
  for (const n of notes || []) {
    if (n.subtopic_id) notesBySub[n.subtopic_id] = (notesBySub[n.subtopic_id] || 0) + 1;
  }

  // Build mock subject map for past papers
  const { data: sets } = await admin.from("mock_exam_sets").select("id, subject");
  const textToSubj: Record<string, string> = {};
  for (const sub of subjects || []) {
    const key = subjectToMockText(sub.display_name, sub.code || "");
    if (!(key in textToSubj)) textToSubj[key] = sub.id;
  }

  // Past papers
  let ppQ = admin.from("past_papers").select("id, subject_id, paper_type, year, season, paper_number");
  if (filterSubjectId) ppQ = ppQ.eq("subject_id", filterSubjectId);
  const { data: pastPapers } = await ppQ;
  const allPps = pastPapers || [];

  // Group past papers by subject
  const ppBySub: Record<string, { qp: number; mcqQp: number; ms: number }> = {};
  const msKeysBySub: Record<string, Set<string>> = {};
  for (const p of allPps) {
    const sid = p.subject_id;
    if (!sid) continue;
    if (!ppBySub[sid]) ppBySub[sid] = { qp: 0, mcqQp: 0, ms: 0 };
    if (!msKeysBySub[sid]) msKeysBySub[sid] = new Set();
    const key = `${p.year}|${p.season}|${p.paper_number}`;
    const pt = p.paper_type || "";
    if (pt === "Question Paper" || pt === "QP" || pt === "Topic QP") {
      ppBySub[sid].qp++;
    } else if (pt === "MCQ QP") {
      ppBySub[sid].mcqQp++;
    } else if (pt === "Mark Scheme" || pt === "MS") {
      ppBySub[sid].ms++;
      msKeysBySub[sid].add(key);
    }
  }

  // Build response
  const coverage: Record<string, any> = {};

  for (const s of subjects || []) {
    const sid = s.id;
    const sts = subjSubtopics[sid] || [];
    const total = sts.length;
    if (total === 0 && !filterSubjectId) continue; // Skip subjects with no subtopics when no filter

    let hasNotes = 0, hasPractice = 0, hasPracticeAns = 0, hasMcq = 0, hasMcqAns = 0;
    const missingNotes: any[] = [];
    const missingPractice: any[] = [];
    const missingPracticeAns: any[] = [];
    const missingMcq: any[] = [];
    const missingMcqAns: any[] = [];

    for (const st of sts) {
      const stid = st.id;
      const subInfo = { id: stid, name: st.display_name, topic: topicName[st.topic_id] || "" };
      const qData = qBySub[stid] || { mcq: 0, mcqWithAns: 0, practice: 0, practiceWithAns: 0 };
      const hasNote = (notesBySub[stid] || 0) > 0;

      if (hasNote) hasNotes++;
      else missingNotes.push(subInfo);

      if (qData.practice > 0) hasPractice++;
      else missingPractice.push(subInfo);

      if (qData.practiceWithAns > 0) hasPracticeAns++;
      else if (qData.practice > 0) missingPracticeAns.push(subInfo); // has practice but no answer

      if (qData.mcq > 0) hasMcq++;
      else missingMcq.push(subInfo);

      if (qData.mcqWithAns > 0) hasMcqAns++;
      else if (qData.mcq > 0) missingMcqAns.push(subInfo); // has MCQ but no answer
    }

    // Past paper stats
    const ppStats = ppBySub[sid] || { qp: 0, mcqQp: 0, ms: 0 };
    const msKeys = msKeysBySub[sid] || new Set();
    let missingMs = 0;
    // Check each QP row against MS key set
    for (const p of allPps) {
      if (p.subject_id !== sid) continue;
      const pt = p.paper_type || "";
      if (pt !== "Question Paper" && pt !== "QP" && pt !== "Topic QP") continue;
      const key = `${p.year}|${p.season}|${p.paper_number}`;
      if (!msKeys.has(key)) missingMs++;
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
      past_paper_qp: ppStats.qp,
      past_paper_mcq_qp: ppStats.mcqQp,
      past_paper_ms: ppStats.ms,
      past_paper_missing_ms: missingMs,
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
