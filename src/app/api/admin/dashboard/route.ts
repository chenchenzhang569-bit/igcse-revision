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

function subjectToMockText(displayName: string, code: string): string {
  const d = displayName.toLowerCase();
  if (d.includes("additional")) return code || "0606";
  if (d.includes("mathematics")) return "maths";
  if (d.includes("computer")) return "computer-science";
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

  const mockPaperSubjectMap = await buildMockSubjectMap(admin, subjects || []);

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

  // --- QUESTIONS COUNTS + DISTRIBUTION (combined single-pass where possible) ---
  let totalQuestions = 0, totalMockQuestions = 0, missingAnswersCount = 0;
  let questionDistribution: { name: string; count: number }[] = [];
  let subjectsWithQuestions = 0;

  if (filterSubjectId) {
    // With subject filter — single scan for count + distribution (answer format + question_text pattern)
    const subjName = subjectDisplay[filterSubjectId] || filterSubjectId;
    const subj = filterSubjectId;
    let mcqC = 0, pracC = 0, missingC = 0;
    let offset = 0;
    while (true) {
      const { data: page } = await admin
        .from("questions")
        .select("answer_text, clean_answer_text, question_text")
        .eq("subject_id", subj)
        .range(offset, offset + 999);
      if (!page?.length) break;
      for (const q of page) {
        const ans = (q.clean_answer_text || q.answer_text || "").trim();
        const txt = q.question_text || "";
        const hasAbcd = /\b[A-D]\b[.):]|\([A-D]\)|\[[A-D]\]/.test(txt);
        if (hasAbcd || /^[A-D]$/i.test(ans)) mcqC++;
        else pracC++;
        if (!q.clean_answer_text) missingC++;
      }
      if (page.length < 1000) break;
      offset += 1000;
    }
    if (filterType === "all" || filterType === "mcq") totalQuestions = mcqC;
    if (filterType === "questions") totalQuestions = pracC;
    if (filterType === "all") missingAnswersCount = missingC;

    // Distribution + mock count
    subjectsWithQuestions = 1;
    let mockC = 0;
    const paperIds = Object.entries(mockPaperSubjectMap)
      .filter(([, sid]) => sid === filterSubjectId).map(([pid]) => pid);
    if (paperIds.length) {
      const { count: mC } = await admin.from("mock_exam_questions").select("*", { count: "exact", head: true }).in("paper_id", paperIds);
      mockC = mC || 0;
    }
    const wantMcq = filterType === "all" || filterType === "mcq";
    const wantPrac = filterType === "all" || filterType === "questions";
    questionDistribution = [
      ...(wantMcq ? [{ name: `${subjName} MCQ`, count: mcqC || 0 }] : []),
      ...(wantPrac ? [{ name: `${subjName} 练习`, count: pracC || 0 }] : []),
      ...((filterType === "all" || filterType === "mock_exam") ? [{ name: `${subjName} 模拟考`, count: mockC || 0 }] : []),
    ].filter(d => d.count > 0);
  } else {
    // No subject filter — single pass for all types
    let skipDist = false;

    const overviewSciCodes = new Set(["0625","0620","0610","4PH1","4CH1","4BI1"]);
    const overviewSciIds = (subjects||[]).filter(s => overviewSciCodes.has(s.code)).map(s => s.id);
    const overviewNonSciIds = (subjects||[]).filter(s => !overviewSciCodes.has(s.code) && s.id).map(s => s.id);

    const scanOverviewClassify = async (ids: string[], useText: boolean, mcqC: {v:number}, pracC: {v:number}, missingC: {v:number}, subjCounts: Record<string, number>) => {
      if (!ids.length) return;
      let offset = 0;
      const cols = useText ? "subject_id, answer_text, clean_answer_text, question_text" : "subject_id, answer_text, clean_answer_text";
      while (true) {
        let q = admin.from("questions").select(cols).in("subject_id", ids);
        const { data: page } = await q.range(offset, offset + 999);
        if (!page?.length) break;
        for (const q of page) {
          const ans = (q.clean_answer_text || q.answer_text || "").trim();
          let isMcq = /^[A-D]$/i.test(ans);
          if (!isMcq && useText) {
            const txt = q.question_text || "";
            isMcq = /\b[A-D]\b[.):]|\([A-D]\)|\[[A-D]\]/.test(txt);
          }
          if (isMcq) mcqC.v++; else pracC.v++;
          if (!q.clean_answer_text) missingC.v++;
          if (filterType === "mcq" ? isMcq : !isMcq) {
            subjCounts[q.subject_id] = (subjCounts[q.subject_id] || 0) + 1;
          }
        }
        if (page.length < 1000) break;
        offset += 1000;
      }
    };

    if (filterType === "all") {
      // Fast: head:true count for total, mock exam count
      const r1 = await admin.from("questions").select("*", { count: "exact", head: true });
      totalQuestions = r1.count || 0;
      const r2 = await admin.from("questions").select("id", { count: "exact", head: true }).is("clean_answer_text", null);
      missingAnswersCount = r2.count || 0;
    } else if (filterType === "mcq" || filterType === "questions") {
      // Two-pass: science subjects with question_text, others by answer format only
      let mcqC = {v:0}, pracC = {v:0}, missingC = {v:0};
      const subjCounts: Record<string, number> = {};
      await scanOverviewClassify(overviewNonSciIds, false, mcqC, pracC, missingC, subjCounts);
      await scanOverviewClassify(overviewSciIds, true, mcqC, pracC, missingC, subjCounts);
      totalQuestions = filterType === "mcq" ? mcqC.v : pracC.v;
      missingAnswersCount = missingC.v;
      for (const [sid, cnt] of Object.entries(subjCounts)) {
        questionDistribution.push({ name: subjectDisplay[sid] || sid, count: cnt });
        subjectsWithQuestions++;
      }
      skipDist = true;
    }

    // Distribution for "all" and/or mock exam questions
    if (!skipDist) {
      const subjectQCounts: Record<string, number> = {};

      // "all" mode: count all questions per subject (no classification needed, fast)
      if (filterType === "all") {
        let offset = 0;
        while (true) {
          const { data: page } = await admin
            .from("questions")
            .select("subject_id")
            .range(offset, offset + 999);
          if (!page?.length) break;
          for (const r of page) subjectQCounts[r.subject_id] = (subjectQCounts[r.subject_id] || 0) + 1;
          if (page.length < 1000) break;
          offset += 1000;
        }
      }

      // Mock exam questions (for "all" or "mock_exam" filter)
      if (filterType === "all" || filterType === "mock_exam") {
        let mOffset = 0;
        while (true) {
          const { data: page } = await admin.from("mock_exam_questions").select("paper_id").range(mOffset, mOffset + 999);
          if (!page?.length) break;
          for (const mq of page) {
            const sid = mockPaperSubjectMap[mq.paper_id];
            if (sid) subjectQCounts[sid] = (subjectQCounts[sid] || 0) + 1;
          }
          if (page.length < 1000) break;
          mOffset += 1000;
        }
      }

      questionDistribution = Object.entries(subjectQCounts)
        .map(([id, count]) => ({ name: subjectDisplay[id] || id, count }))
        .sort((a, b) => b.count - a.count);
      subjectsWithQuestions = Object.keys(subjectQCounts).filter(k => subjectDisplay[k]).length;
    }
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
  });
}
