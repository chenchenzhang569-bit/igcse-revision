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

async function buildMockSubjectMap(admin: any, subjects: any[]) {
  const map: Record<string, string> = {};
  const { data: sets } = await admin.from("mock_exam_sets").select("id, subject");
  if (!sets?.length) return map;
  const textToSubj: Record<string, string> = {};
  for (const sub of subjects) {
    const key = subjectToMockText(sub.display_name, sub.code || "");
    if (!(key in textToSubj)) textToSubj[key] = sub.id;
  }
  const setToSubj: Record<string, string> = {};
  for (const s of sets) {
    const sid = textToSubj[s.subject];
    if (sid) setToSubj[s.id] = sid;
  }
  const { data: papers } = await admin.from("mock_exam_papers").select("id, set_id");
  if (papers) {
    for (const p of papers) {
      const sid = setToSubj[p.set_id];
      if (sid) map[p.id] = sid;
    }
  }
  return map;
}

export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filterSubjectId = searchParams.get("subject_id") || "";
  const filterType = searchParams.get("type") || "all";

  const { data: subjects } = await admin.from("subjects").select("id, display_name, code, exam_board_id");
  const { data: examBoards } = await admin.from("exam_boards").select("id, name");
  const boardName: Record<string, string> = {};
  if (examBoards) for (const b of examBoards) boardName[b.id] = b.name;

  const subjectDisplay: Record<string, string> = {};
  if (subjects) {
    for (const s of subjects) {
      const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
      subjectDisplay[s.id] = b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim();
    }
  }

  const mockPaperSubjectMap = await buildMockSubjectMap(admin, subjects || []);

  // Fetch data
  const allPps = await (async () => {
    let q = admin.from("past_papers").select("id, subject_id, paper_type, year, season, paper_number");
    if (filterSubjectId) q = q.eq("subject_id", filterSubjectId);
    const { data } = await q;
    return data || [];
  })();

  const allNotes = await (async () => {
    let q = admin.from("notes").select("id, subject_id, file_url");
    if (filterSubjectId) q = q.eq("subject_id", filterSubjectId);
    const { data } = await q;
    return data || [];
  })();

  const allMockPapers = await (async () => {
    let q = admin.from("mock_exam_papers").select("id, set_id, paper_type");
    // Filter mock by subject if subject is selected
    if (filterSubjectId) {
      const pids = Object.entries(mockPaperSubjectMap)
        .filter(([, sid]) => sid === filterSubjectId)
        .map(([pid]) => pid);
      if (pids.length) q = q.in("id", pids);
    }
    const { data } = await q;
    return data || [];
  })();

  // Helper: get matching MS count
  function countMissingMs(papers: any[]): number {
    const qpKeys = new Set<string>();
    const msKeys = new Set<string>();
    for (const p of papers) {
      const pt = p.paper_type || "";
      const key = `${p.subject_id}|${p.year}|${p.season}|${p.paper_number}`;
      if (pt === "Question Paper" || pt === "QP" || pt === "Topic QP") qpKeys.add(key);
      if (pt === "Mark Scheme" || pt === "MS") msKeys.add(key);
    }
    let missing = 0;
    for (const k of qpKeys) {
      if (!msKeys.has(k)) missing++;
    }
    return missing;
  }

  // Count by type
  const qp = allPps.filter(p => ["Question Paper", "QP", "Topic QP"].includes(p.paper_type));
  const mcqQp = allPps.filter(p => p.paper_type === "MCQ QP");
  const ms = allPps.filter(p => ["Mark Scheme", "MS"].includes(p.paper_type));
  const notesWithFile = allNotes.filter(n => n.file_url);
  const mockPapers = allMockPapers;

  // Build distribution
  let pdfDistribution: { name: string; count: number }[] = [];
  let missingMsCount = 0;

  if (filterType === "all" || filterType === "missing_ms") {
    missingMsCount = countMissingMs(allPps);
  }

  if (filterSubjectId) {
    // Subject selected: show type breakdown
    pdfDistribution = [
      { name: "题目卷", count: qp.length },
      { name: "MCQ卷", count: mcqQp.length },
      { name: "评分方案", count: ms.length },
      { name: "笔记", count: notesWithFile.length },
      { name: "模拟考", count: mockPapers.length },
    ].filter(d => d.count > 0);
  } else {
    // No subject: show distribution by subject or type
    if (filterType === "all" || filterType === "missing_ms") {
      // Build by subject
      const subjCounts: Record<string, number> = {};
      for (const p of allPps) {
        subjCounts[p.subject_id] = (subjCounts[p.subject_id] || 0) + 1;
      }
      for (const n of notesWithFile) {
        if (n.subject_id) subjCounts[n.subject_id] = (subjCounts[n.subject_id] || 0) + 1;
      }
      for (const m of mockPapers) {
        const sid = mockPaperSubjectMap[m.set_id];
        if (sid) subjCounts[sid] = (subjCounts[sid] || 0) + 1;
      }
      pdfDistribution = Object.entries(subjCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
    } else if (filterType === "qp") {
      const subjCounts: Record<string, number> = {};
      for (const p of qp) subjCounts[p.subject_id] = (subjCounts[p.subject_id] || 0) + 1;
      pdfDistribution = Object.entries(subjCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
    } else if (filterType === "mcq") {
      const subjCounts: Record<string, number> = {};
      for (const p of mcqQp) subjCounts[p.subject_id] = (subjCounts[p.subject_id] || 0) + 1;
      pdfDistribution = Object.entries(subjCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
    } else if (filterType === "ms") {
      const subjCounts: Record<string, number> = {};
      for (const p of ms) subjCounts[p.subject_id] = (subjCounts[p.subject_id] || 0) + 1;
      pdfDistribution = Object.entries(subjCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
    } else if (filterType === "notes") {
      const subjCounts: Record<string, number> = {};
      for (const n of notesWithFile) if (n.subject_id) subjCounts[n.subject_id] = (subjCounts[n.subject_id] || 0) + 1;
      pdfDistribution = Object.entries(subjCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
    } else if (filterType === "mock_exam") {
      const subjCounts: Record<string, number> = {};
      for (const m of mockPapers) {
        const sid = mockPaperSubjectMap[m.set_id];
        if (sid) subjCounts[sid] = (subjCounts[sid] || 0) + 1;
      }
      pdfDistribution = Object.entries(subjCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
    }
  }

  const totalPdfs = qp.length + mcqQp.length + ms.length + notesWithFile.length + mockPapers.length;

  return NextResponse.json({
    total_pdfs: totalPdfs,
    pdf_distribution: pdfDistribution,
    breakdown: {
      qp: qp.length,
      mcq_qp: mcqQp.length,
      ms: ms.length,
      notes: notesWithFile.length,
      mock: mockPapers.length,
    },
    missing_ms: missingMsCount,
    available_subjects: (subjects || []).map((s: any) => {
      const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
      return { id: s.id, name: b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim() };
    }),
  });
}
