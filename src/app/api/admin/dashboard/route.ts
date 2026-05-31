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

// GET /api/admin/dashboard
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "all"; // today | 7d | 30d | all
  const filterSubjectId = searchParams.get("subject_id") || "";  // filter by subject
  const filterType = searchParams.get("type") || "all";           // all | questions | mock_exam | mcq

  const today = getTodayRange();
  const week = getWeekRange();
  const d30 = get30dRange();

  // --- TRAFFIC ---
  // DAU: unique logins today
  const { data: dauData } = await admin
    .from("login_events")
    .select("user_id")
    .gte("logged_at", today.start).lte("logged_at", today.end);
  const dau = new Set((dauData || []).map((d: any) => d.user_id)).size;

  // MAU: unique logins in 30d
  const { data: mauData } = await admin
    .from("login_events")
    .select("user_id")
    .gte("logged_at", d30.start).lte("logged_at", d30.end);
  const mau = new Set((mauData || []).map((d: any) => d.user_id)).size;

  // Signups
  const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 100000 });
  const totalUsers = allUsers?.users?.length || 0;
  let weekSignups = 0;
  let todaySignups = 0;
  const weekStart = new Date(week.start);
  const todayStart = new Date(today.start);
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      const ca = new Date(u.created_at);
      if (ca >= weekStart) weekSignups++;
      if (ca >= todayStart) todaySignups++;
    }
  }

  // --- USERS ---
  const { data: purchases } = await admin
    .from("purchases")
    .select("user_id, amount_cny, status, created_at");

  const paidUsers = new Set<string>();
  const trialUsers = new Set<string>();
  let totalRevenue = 0;
  let weekRevenue = 0;
  const weekDate = new Date(week.start);
  const paidPurchaseCounts: Record<string, number> = {};

  if (purchases) {
    for (const p of purchases) {
      if (p.status === "paid") {
        paidUsers.add(p.user_id);
        totalRevenue += p.amount_cny || 0;
        paidPurchaseCounts[p.user_id] = (paidPurchaseCounts[p.user_id] || 0) + 1;
        if (p.created_at && new Date(p.created_at) >= weekDate) {
          weekRevenue += p.amount_cny || 0;
        }
      }
      if (p.status === "trial") {
        trialUsers.add(p.user_id);
      }
    }
  }

  // Active trials (not expired)
  let activeTrials = 0;
  if (purchases) {
    const now = new Date();
    for (const p of purchases) {
      if (p.status === "trial" && p.expires_at && new Date(p.expires_at) > now) {
        activeTrials++;
      }
    }
  }

  // --- INVITES ---
  const { data: invitedProfiles } = await admin
    .from("profiles")
    .select("id, invited_by")
    .not("invited_by", "is", null);

  const totalInvites = invitedProfiles?.length || 0;
  let paidInvites = 0;
  if (invitedProfiles && invitedProfiles.length > 0) {
    const invitedIds = invitedProfiles.map((p: any) => p.id);
    const { data: invPurchases } = await admin
      .from("purchases")
      .select("user_id")
      .in("user_id", invitedIds)
      .eq("status", "paid");
    paidInvites = new Set((invPurchases || []).map((p: any) => p.user_id)).size;
  }

  // --- TRAFFIC SOURCES ---
  const { data: profiles } = await admin
    .from("profiles")
    .select("source");

  const sourceCounts: Record<string, number> = { xiaohongshu: 0, wechat: 0, zhihu: 0, direct: 0 };
  if (profiles) {
    for (const p of profiles) {
      if (p.source && sourceCounts[p.source] !== undefined) {
        sourceCounts[p.source]++;
      } else {
        sourceCounts.direct++;
      }
    }
  }

  // --- DB QUALITY ---
  const buildQFilter = () => {
    let q = admin.from("questions");
    if (filterSubjectId) q = q.eq("subject_id", filterSubjectId) as any;
    if (filterType === "mcq") q = q.eq("question_type", "mcq") as any;
    return q;
  };

  const includeQuestions = filterType === "all" || filterType === "questions" || filterType === "mcq";
  const includeMockExam = filterType === "all" || filterType === "mock_exam";

  let totalQuestions = 0;
  let totalMockExamQuestions = 0;
  let missingAnswersCount = 0;

  if (includeQuestions) {
    const { count: qCount } = await buildQFilter().select("*", { count: "exact", head: true });
    totalQuestions = qCount || 0;

    const { count: missingCount } = await buildQFilter()
      .select("id", { count: "exact", head: true })
      .neq("question_type", "mcq")
      .is("clean_answer_text", null);
    missingAnswersCount = missingCount || 0;
  }

  if (includeMockExam) {
    let mockQ = admin.from("mock_exam_questions");
    if (filterSubjectId) {
      // mock_exam_questions has no subject_id — resolve via sets table
      const { data: matchedSubject } = await admin.from("subjects").select("display_name, code").eq("id", filterSubjectId).maybeSingle();
      if (matchedSubject) {
        // Map subject to mock_exam_sets.subject text
        const code = matchedSubject.code || "";
        const display = matchedSubject.display_name?.toLowerCase() || "";
        let setSubject = display;
        if (display.includes("mathematics")) setSubject = "maths";
        else if (display.includes("computer")) setSubject = "computer-science";
        else if (display.includes("additional")) setSubject = code; // "0606"
        // Get set_ids
        const { data: matchedSets } = await admin.from("mock_exam_sets").select("id").eq("subject", setSubject);
        if (matchedSets?.length) {
          const setIds = matchedSets.map((s: any) => s.id);
          // Get paper_ids
          const { data: matchedPapers } = await admin.from("mock_exam_papers").select("id").in("set_id", setIds);
          if (matchedPapers?.length) {
            const paperIds = matchedPapers.map((p: any) => p.id);
            mockQ = mockQ.in("paper_id", paperIds);
          } else {
            totalMockExamQuestions = 0;
          }
        } else {
          totalMockExamQuestions = 0;
        }
      }
    }
    if (totalMockExamQuestions === 0) {
      const { count: mCount } = await mockQ.select("*", { count: "exact", head: true });
      totalMockExamQuestions = mCount || 0;
    }
  }

  const { count: mockPapers } = await admin
    .from("mock_exam_papers")
    .select("*", { count: "exact", head: true });

  const { count: notesCount } = await admin
    .from("notes")
    .select("*", { count: "exact", head: true });

  // Questions per subject — paginate to get all rows (with filters)
  const subjectQCounts: Record<string, number> = {};

  if (includeQuestions) {
    const allQBySubject: any[] = [];
    let offset = 0;
    while (true) {
      const { data: page } = await buildQFilter()
        .select("subject_id")
        .range(offset, offset + 999);
      if (!page || page.length === 0) break;
      allQBySubject.push(...page);
      if (page.length < 1000) break;
      offset += 1000;
    }
    for (const q of allQBySubject) {
      subjectQCounts[q.subject_id] = (subjectQCounts[q.subject_id] || 0) + 1;
    }
  }

  // Mock exam questions per subject — resolve via paper→set→subject chain
  if (includeMockExam) {
    // Build mock exam question subject distribution
    // First, get all paper→set mappings
    const { data: allPapers } = await admin.from("mock_exam_papers").select("id, set_id");
    const paperToSet: Record<string, string> = {};
    const setIds = new Set<string>();
    if (allPapers) {
      for (const p of allPapers) { paperToSet[p.id] = p.set_id; setIds.add(p.set_id); }
    }

    // Get set→subject mappings (subject is a text field like "biology", "chemistry")
    const { data: allSets } = await admin.from("mock_exam_sets").select("id, subject");
    const setToSubjectText: Record<string, string> = {};
    if (allSets) {
      for (const s of allSets) { setToSubjectText[s.id] = s.subject; }
    }

    // Map set subject text to subject_id
    const subjectTextToId: Record<string, string> = {};
    if (subjects) {
      for (const sub of subjects) {
        const display = sub.display_name?.toLowerCase() || "";
        let key = display;
        if (display.includes("mathematics")) key = "maths";
        else if (display.includes("computer")) key = "computer-science";
        else if (display.includes("additional")) key = sub.code || "";
        else if (display.includes("biology")) key = "biology";
        else if (display.includes("chemistry")) key = "chemistry";
        else if (display.includes("physics")) key = "physics";
        else if (display.includes("economics")) key = "economics";
        subjectTextToId[key] = sub.id;
      }
    }

    // Now paginate mock_exam_questions
    let mOffset = 0;
    while (true) {
      let q = admin.from("mock_exam_questions").select("paper_id");
      if (filterSubjectId) {
        // Already filtered by paper_id in the count query above — reuse same filter
        // Build paper IDs from matched sets
        const { data: matchedSubject } = await admin.from("subjects").select("display_name, code").eq("id", filterSubjectId).maybeSingle();
        if (matchedSubject) {
          const code = matchedSubject.code || "";
          const display = matchedSubject.display_name?.toLowerCase() || "";
          let setSubject = display;
          if (display.includes("mathematics")) setSubject = "maths";
          else if (display.includes("computer")) setSubject = "computer-science";
          else if (display.includes("additional")) setSubject = code;
          const { data: msets } = await admin.from("mock_exam_sets").select("id").eq("subject", setSubject);
          if (msets?.length) {
            const sids = msets.map((s: any) => s.id);
            const { data: mpapers } = await admin.from("mock_exam_papers").select("id").in("set_id", sids);
            if (mpapers?.length) q = q.in("paper_id", mpapers.map((p: any) => p.id));
          }
        }
      }
      const { data: page } = await q.range(mOffset, mOffset + 999);
      if (!page || page.length === 0) break;
      for (const mq of page) {
        const sid = paperToSet[mq.paper_id];
        const subjText = sid ? setToSubjectText[sid] : null;
        const subjId = subjText ? subjectTextToId[subjText] : null;
        if (subjId) subjectQCounts[subjId] = (subjectQCounts[subjId] || 0) + 1;
      }
      if (page.length < 1000) break;
      mOffset += 1000;
    }
  }

  // Get subject names
  const { data: subjects } = await admin
    .from("subjects")
    .select("id, display_name, code");

  const subjectMap: Record<string, string> = {};
  if (subjects) {
    for (const s of subjects) {
      subjectMap[s.id] = `${s.display_name} ${s.code || ""}`.trim();
    }
  }

  const questionDistribution = Object.entries(subjectQCounts)
    .map(([id, count]) => ({ name: subjectMap[id] || id, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    traffic: {
      dau,
      mau: mau || 0,
      today_signups: todaySignups,
      week_signups: weekSignups,
    },
    users: {
      total: totalUsers,
      paid: paidUsers.size,
      trial_active: activeTrials,
      week_new_paid: Object.values(paidPurchaseCounts).filter((c: number) => c >= 1).length,
    },
    revenue: {
      total: totalRevenue,
      week: weekRevenue,
    },
    invites: {
      total: totalInvites,
      paid: paidInvites,
      conversion: totalInvites > 0 ? Math.round((paidInvites / totalInvites) * 100) : 0,
    },
    sources: sourceCounts,
    db_quality: {
      total_questions: totalQuestions + totalMockExamQuestions,
      missing_answers: missingAnswersCount,
      mock_papers: mockPapers || 0,
      notes: notesCount || 0,
      subjects_with_questions: Object.keys(subjectQCounts).filter(k => subjectMap[k]).length,
    },
    question_distribution: questionDistribution,
    available_subjects: (subjects || []).map((s: any) => ({
      id: s.id,
      name: `${s.display_name} ${s.code || ""}`.trim(),
    })),
  });
}
