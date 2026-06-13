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

  // --- Shared data ---
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

  // --- QUESTIONS COUNTS + DISTRIBUTION (from subject_stats pre-computed table) ---
  let totalQuestions = 0, totalMockQuestions = 0, missingAnswersCount = 0;
  let questionDistribution: { name: string; count: number }[] = [];
  let subjectsWithQuestions = 0;

  let statsQuery = admin.from("subject_stats").select("*");
  if (filterSubjectId) statsQuery = statsQuery.eq("subject_id", filterSubjectId);
  const { data: statsRows } = await statsQuery;

  if (statsRows) {
    for (const row of statsRows) {
      const sid = row.subject_id;
      const subjName = subjectDisplay[sid] || sid;
      let count = 0;

      if (filterType === "all") {
        count = (row.questions || 0) + (row.r2_questions || 0)
              + (row.mock_exams || 0) + (row.r2_mock_exams || 0);
        totalQuestions += (row.questions || 0) + (row.r2_questions || 0);
        totalMockQuestions += (row.mock_exams || 0) + (row.r2_mock_exams || 0);
      } else if (filterType === "mcq") {
        count = (row.questions_mcq || 0) + (row.r2_questions_mcq || 0);
        totalQuestions += count;
      } else if (filterType === "questions") {
        count = (row.questions_structured || 0) + (row.r2_questions_structured || 0);
        totalQuestions += count;
      } else if (filterType === "mock_exam") {
        count = (row.mock_exams || 0) + (row.r2_mock_exams || 0);
        totalMockQuestions += count;
      }

      if (count > 0) {
        questionDistribution.push({ name: subjName, count });
      }
    }

    subjectsWithQuestions = questionDistribution.length;

    // Sort descending
    questionDistribution.sort((a, b) => b.count - a.count);
  }

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
      subjects_with_questions: subjectsWithQuestions,
    },
    question_distribution: questionDistribution,
    available_subjects: (subjects || []).map((s: any) => {
      const b = s.exam_board_id ? boardName[s.exam_board_id] : null;
      return { id: s.id, name: b ? `${b} ${s.display_name} ${s.code || ""}`.trim() : `${s.display_name} ${s.code || ""}`.trim() };
    }),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
