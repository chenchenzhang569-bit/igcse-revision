import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

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

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: new Date().toISOString() };
}
function getWeekRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { start: start.toISOString(), end: end.toISOString() };
}
function get30dRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Map subject display_name/code → mock_exam_sets.subject text
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

// Build mock exam subject mapping from DB: paper_id → subject_id
async function buildMockSubjectMap(admin: any, subjects: any[], subjectMap: Record<string, string>) {
  const map: Record<string, string> = {};
  const { data: sets } = await admin.from("mock_exam_sets").select("id, subject");
  if (!sets?.length) return map;
  // Map set subject text → subject_id (first match wins: CAIE before Edexcel)
  const textToSubj: Record<string, string> = {};
  for (const sub of subjects) {
    const key = subjectToMockText(sub.display_name, sub.code || "");
    if (!(key in textToSubj)) textToSubj[key] = sub.id;
  }
  // Map each set to its subject_id
  const setToSubj: Record<string, string> = {};
  for (const s of sets) {
    const sid = textToSubj[s.subject];
    if (sid) setToSubj[s.id] = sid;
  }
  // Map paper_id → subject_id
  const { data: papers } = await admin.from("mock_exam_papers").select("id, set_id");
  if (papers) {
    for (const p of papers) {
      const sid = setToSubj[p.set_id];
      if (sid) map[p.id] = sid;
    }
  }
  return map;
}

// GET /api/admin/dashboard
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filterSubjectId = searchParams.get("subject_id") || "";
  const filterType = searchParams.get("type") || "all";

  const today = getTodayRange();
  const week = getWeekRange();
  const d30 = get30dRange();

  // --- Shared data: subjects + boards + mock mapping ---
  const { data: subjects } = await admin.from("subjects")
    .select("id, display_name, code, exam_board_id");

  const { data: examBoards } = await admin.from("exam_boards").select("id, name");
  const boardName: Record<string, string> = {};
  if (examBoards) for (const b of examBoards) boardName[b.id] = b.name;

  const subjectDisplay: Record<string, string> = {};
  if (subjects) {
    for (const s of subjects) {
      const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
      subjectDisplay[s.id] = b ? `${b} ${s.display_name} ${s.code || ""}`.trim()
        : `${s.display_name} ${s.code || ""}`.trim();
    }
  }

  const mockPaperSubjectMap = await buildMockSubjectMap(admin, subjects || [], subjectDisplay);

  // --- TRAFFIC ---
  const { data: dauData } = await admin.from("login_events")
    .select("user_id").gte("logged_at", today.start).lte("logged_at", today.end);
  const dau = new Set((dauData || []).map((d: any) => d.user_id)).size;

  const { data: mauData } = await admin.from("login_events")
    .select("user_id").gte("logged_at", d30.start).lte("logged_at", d30.end);
  const mau = new Set((mauData || []).map((d: any) => d.user_id)).size;

  const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 100000 });
  const totalUsers = allUsers?.users?.length || 0;
  let weekSignups = 0, todaySignups = 0;
  const weekStart = new Date(week.start), todayStart = new Date(today.start);
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      const ca = new Date(u.created_at);
      if (ca >= weekStart) weekSignups++;
      if (ca >= todayStart) todaySignups++;
    }
  }

  // --- USERS / REVENUE ---
  const { data: purchases } = await admin.from("purchases")
    .select("user_id, amount_cny, status, created_at");
  const paidUsers = new Set<string>();
  let totalRevenue = 0, weekRevenue = 0;
  const paidCounts: Record<string, number> = {};
  let activeTrials = 0;
  if (purchases) {
    const now = new Date();
    for (const p of purchases) {
      if (p.status === "paid") {
        paidUsers.add(p.user_id);
        totalRevenue += p.amount_cny || 0;
        paidCounts[p.user_id] = (paidCounts[p.user_id] || 0) + 1;
        if (p.created_at && new Date(p.created_at) >= weekStart) weekRevenue += p.amount_cny || 0;
      }
      if (p.status === "trial" && p.expires_at && new Date(p.expires_at) > now) activeTrials++;
    }
  }

  // --- INVITES ---
  const { data: invitedProfiles } = await admin.from("profiles")
    .select("id, invited_by").not("invited_by", "is", null);
  const totalInvites = invitedProfiles?.length || 0;
  let paidInvites = 0;
  if (invitedProfiles?.length) {
    const { data: invPurch } = await admin.from("purchases")
      .select("user_id").in("user_id", invitedProfiles.map((p: any) => p.id)).eq("status", "paid");
    paidInvites = new Set((invPurch || []).map((p: any) => p.user_id)).size;
  }

  // --- TRAFFIC SOURCES ---
  const sourceCounts: Record<string, number> = { xiaohongshu: 0, wechat: 0, zhihu: 0, direct: 0 };
  const { data: profiles } = await admin.from("profiles").select("source");
  if (profiles) {
    for (const p of profiles) {
      if (p.source && sourceCounts[p.source] !== undefined) sourceCounts[p.source]++;
      else sourceCounts.direct++;
    }
  }

  // --- QUESTIONS COUNTS ---
  const includeQ = filterType === "all" || filterType === "questions" || filterType === "mcq";
  const includeMock = filterType === "all" || filterType === "mock_exam";

  const buildQFilter = (excludeMcq: boolean = false) => {
    let q = admin.from("questions");
    if (filterSubjectId) q = q.eq("subject_id", filterSubjectId);
    if (filterType === "mcq") q = q.eq("question_type", "mcq");
    if (excludeMcq) q = q.neq("question_type", "mcq");
    return q;
  };

  let totalQuestions = 0, totalMockQuestions = 0, missingAnswersCount = 0;

  if (includeQ) {
    const { count: qCount } = await buildQFilter(filterType === "questions").select("*", { count: "exact", head: true });
    totalQuestions = qCount || 0;
    const { count: mCount } = await buildQFilter(filterType === "questions")
      .select("id", { count: "exact", head: true })
      .is("clean_answer_text", null);
    missingAnswersCount = mCount || 0;
  }

  // Mock exam count: filter by paper_id if subject selected
  if (includeMock) {
    let mockQ = admin.from("mock_exam_questions");
    if (filterSubjectId) {
      // Find paper_ids for this subject
      const paperIds = Object.entries(mockPaperSubjectMap)
        .filter(([, sid]) => sid === filterSubjectId)
        .map(([pid]) => pid);
      if (paperIds.length) mockQ = mockQ.in("paper_id", paperIds);
      else totalMockQuestions = 0;
    }
    if (!totalMockQuestions) {
      const { count: mc } = await mockQ.select("*", { count: "exact", head: true });
      totalMockQuestions = mc || 0;
    }
  }

  // --- PER-SUBJECT DISTRIBUTION ---
  const subjectQCounts: Record<string, number> = {};

  if (includeQ) {
    let offset = 0;
    while (true) {
      const { data: page } = await buildQFilter(filterType === "questions")
        .select("subject_id").range(offset, offset + 999);
      if (!page?.length) break;
      for (const q of page) subjectQCounts[q.subject_id] = (subjectQCounts[q.subject_id] || 0) + 1;
      if (page.length < 1000) break;
      offset += 1000;
    }
  }

  if (includeMock) {
    let mOffset = 0;
    while (true) {
      let q = admin.from("mock_exam_questions").select("paper_id");
      if (filterSubjectId) {
        const pids = Object.entries(mockPaperSubjectMap)
          .filter(([, sid]) => sid === filterSubjectId).map(([pid]) => pid);
        if (pids.length) q = q.in("paper_id", pids);
      }
      const { data: page } = await q.range(mOffset, mOffset + 999);
      if (!page?.length) break;
      for (const mq of page) {
        const sid = mockPaperSubjectMap[mq.paper_id];
        if (sid) subjectQCounts[sid] = (subjectQCounts[sid] || 0) + 1;
      }
      if (page.length < 1000) break;
      mOffset += 1000;
    }
  }

  // --- RESPONSE ---
  const questionDistribution = Object.entries(subjectQCounts)
    .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    traffic: { dau, mau: mau || 0, today_signups: todaySignups, week_signups: weekSignups },
    users: { total: totalUsers, paid: paidUsers.size, trial_active: activeTrials,
      week_new_paid: Object.values(paidCounts).filter(c => c >= 1).length },
    revenue: { total: totalRevenue, week: weekRevenue },
    invites: { total: totalInvites, paid: paidInvites, conversion: totalInvites > 0 ? Math.round((paidInvites / totalInvites) * 100) : 0 },
    sources: sourceCounts,
    db_quality: {
      total_questions: totalQuestions + totalMockQuestions,
      missing_answers: missingAnswersCount,
      mock_papers: (await admin.from("mock_exam_papers").select("*", { count: "exact", head: true })).count || 0,
      notes: (await admin.from("notes").select("*", { count: "exact", head: true })).count || 0,
      subjects_with_questions: Object.keys(subjectQCounts).filter(k => subjectDisplay[k]).length,
    },
    question_distribution: questionDistribution,
    available_subjects: (subjects || []).map((s: any) => {
      const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
      return { id: s.id, name: b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim() };
    }),
  });
}
