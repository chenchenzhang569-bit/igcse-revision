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
    .from("user_roles")
    .select("role")
    .eq("user_id", payload.sub)
    .maybeSingle();
  return data?.role === "admin" ? admin : null;
}

// GET /api/admin/coverage
// Returns per-subject coverage data broken down by paper_type
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filterSubjectId = searchParams.get("subject_id") || "";

  // --- Subjects ---
  const { data: subjects } = await admin.from("subjects").select("id, display_name, code, exam_board_id");
  const { data: examBoards } = await admin.from("exam_boards").select("id, name");
  const boardName: Record<string, string> = {};
  if (examBoards) for (const b of examBoards) boardName[b.id] = b.name;

  const subjList = (subjects || []).map((s: any) => {
    const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
    return {
      id: s.id,
      name: b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim(),
    };
  });

  // --- Per-subject coverage ---
  const coverage: Record<string, any> = {};

  const targetSubjects = filterSubjectId
    ? (subjects || []).filter((s: any) => s.id === filterSubjectId)
    : (subjects || []);

  for (const subj of targetSubjects) {
    const sid = subj.id;

    // Subtopic count
    const { count: subtopicCount } = await admin
      .from("subtopics")
      .select("*", { count: "exact", head: true })
      .eq("subject_id", sid);

    // Notes: count distinct subtopics that have notes
    const { data: notesSubtopics } = await admin
      .from("notes")
      .select("subtopic_id")
      .eq("subject_id", sid)
      .not("subtopic_id", "is", null);
    const notesSubtopicSet = new Set((notesSubtopics || []).map((n: any) => n.subtopic_id));

    // Past papers by paper_type
    const { data: allPapers } = await admin
      .from("past_papers")
      .select("paper_type, subtopic_id")
      .eq("subject_id", sid);

    const topicQpSubtopics = new Set<string>();
    const topicMsSubtopics = new Set<string>();
    const mcqQpSubtopics = new Set<string>();
    const mcqMsSubtopics = new Set<string>();
    let qpCount = 0;
    let msCount = 0;

    if (allPapers) {
      for (const p of allPapers) {
        switch (p.paper_type) {
          case "Topic QP":
            if (p.subtopic_id) topicQpSubtopics.add(p.subtopic_id);
            break;
          case "Topic MS":
            if (p.subtopic_id) topicMsSubtopics.add(p.subtopic_id);
            break;
          case "MCQ QP":
            if (p.subtopic_id) mcqQpSubtopics.add(p.subtopic_id);
            break;
          case "MCQ MS":
            if (p.subtopic_id) mcqMsSubtopics.add(p.subtopic_id);
            break;
          case "Question Paper":
          case "QP":
            qpCount++;
            break;
          case "Mark Scheme":
          case "MS":
            msCount++;
            break;
        }
      }
    }

    coverage[sid] = {
      subtopics: subtopicCount || 0,
      notes: notesSubtopicSet.size,
      practice: topicQpSubtopics.size,       // ✏️ 练习 (Topic QP)
      practiceAnswers: topicMsSubtopics.size, // ✅ 练习答案 (Topic MS)
      mcq: mcqQpSubtopics.size,              // ❓ MCQ (MCQ QP)
      mcqAnswers: mcqMsSubtopics.size,       // 🔑 MCQ答案 (MCQ MS)
      examQp: qpCount,                       // 📄 真题 QP
      examMs: msCount,                       // 📋 真题 MS
      missingMs: qpCount - msCount,          // ❌ 缺MS
    };
  }

  return NextResponse.json({
    subjects: subjList,
    coverage,
  });
}
