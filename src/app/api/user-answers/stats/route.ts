import { NextRequest, NextResponse } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

// Extract JWT from Authorization header or cookie
function getJwt(req: NextRequest): string | null {
  // 1. Try Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);

  // 2. Fallback: extract from Supabase cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/sb-[^;]+-auth-token=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded);
    return (Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token) || null;
  } catch { return null; }
}

// Decode JWT payload to get user_id
function getUserIdFromJwt(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return decoded.sub || null;
  } catch {
    return null;
  }
}

// GET /api/user-answers/stats
export async function GET(req: NextRequest) {
  try {
    const jwt = getJwt(req);
    const userId = jwt ? getUserIdFromJwt(jwt) : null;

    if (!userId) {
      return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [], subtopicProgress: [] });
    }

    const authHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` };
    const publicHeaders = { apikey: ANON_KEY };

    // 0. Get user's purchased subjects (with fallback)
    let hasAllPlan = false;
    let purchasedSlugs: string[] = [];
    try {
      const resPurchases = await fetch(
        `${API}/purchases?select=subject_id,status&user_id=eq.${userId}&status=in.(paid,trial)`,
        { headers: authHeaders }
      );
      const purchases = await resPurchases.json();
      hasAllPlan = Array.isArray(purchases) && purchases.some((p: any) => p.subject_id === null);
      const purchasedSubjectIds: string[] = Array.isArray(purchases)
        ? purchases.filter((p: any) => p.subject_id).map((p: any) => p.subject_id)
        : [];

      // Get subjects slug → id mapping
      const resAllSubjects = await fetch(
        `${API}/subjects?select=id,slug,display_name`,
        { headers: publicHeaders }
      );
      const allSubjectsRaw = await resAllSubjects.json();
      const subjectIdToSlug: Record<string, string> = {};
      const allSubjectSlugs: string[] = [];
      if (Array.isArray(allSubjectsRaw)) {
        for (const s of allSubjectsRaw) {
          subjectIdToSlug[s.id] = s.slug;
          allSubjectSlugs.push(s.slug);
        }
      }

      if (hasAllPlan) {
        purchasedSlugs = allSubjectSlugs;
      } else if (purchasedSubjectIds.length > 0) {
        purchasedSlugs = purchasedSubjectIds.map(id => subjectIdToSlug[id]).filter(Boolean);
      }
    } catch (e) {
      console.error("Purchase filter failed, falling back to all subjects:", e);
      // Fallback: show all subjects (old behavior)
      purchasedSlugs = []; // empty means no filter
    }

    const purchasedSet = new Set(purchasedSlugs);
    const filterByPurchases = purchasedSlugs.length > 0;

    // 1. Get user answers
    const res1 = await fetch(
      `${API}/user_answers?select=is_correct,subject_slug,created_at,question_id,subtopic_code,difficulty,question_text,user_answer,correct_answer&user_id=eq.${userId}&order=created_at.desc&limit=500`,
      { headers: authHeaders }
    );
    const all = await res1.json();

    if (!Array.isArray(all)) {
      return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [], subtopicProgress: [] });
    }

    // 2. Get topics → subject mapping (topic.id → subject.slug)
    // Supabase lets us expand: topics(*, subjects(slug))
    const resTopics = await fetch(
      `${API}/topics?select=id,subjects(slug)`,
      { headers: publicHeaders }
    );
    const allTopics = await resTopics.json();
    const topicSubjectMap: Record<string, string> = {};
    if (Array.isArray(allTopics)) {
      for (const t of allTopics) {
        const subSlug = (t.subjects as any)?.slug || "";
        if (subSlug && t.id) topicSubjectMap[t.id] = subSlug;
      }
    }

    // 3. Get all subtopics → count total per subject
    const resSubs = await fetch(
      `${API}/subtopics?select=topic_id`,
      { headers: publicHeaders }
    );
    const allSubs = await resSubs.json();
    const subTotalBySubject: Record<string, number> = {};
    if (Array.isArray(allSubs)) {
      for (const s of allSubs) {
        const subjectSlug = topicSubjectMap[s.topic_id] || "";
        if (subjectSlug) {
          subTotalBySubject[subjectSlug] = (subTotalBySubject[subjectSlug] || 0) + 1;
        }
      }
    }

    // 4. User's unique subtopics practiced per subject
    const practicedBySubject: Record<string, Set<string>> = {};
    for (const a of all) {
      const slug = a.subject_slug || "";
      const code = a.subtopic_code || "";
      if (slug && code) {
        if (!practicedBySubject[slug]) practicedBySubject[slug] = new Set();
        practicedBySubject[slug].add(code);
      }
    }

    // 5. Per-subject stats (total/correct) — only purchased
    const subjectMap: Record<string, { total: number; correct: number; slug: string; used: number; subtopics: number }> = {};
    for (const a of all) {
      const s = a.subject_slug || "unknown";
      if (filterByPurchases && !purchasedSet.has(s)) continue; // skip non-purchased
      if (!subjectMap[s]) {
        subjectMap[s] = {
          total: 0, correct: 0, slug: s,
          used: practicedBySubject[s]?.size || 0,
          subtopics: subTotalBySubject[s] || 0,
        };
      }
      subjectMap[s].total++;
      if (a.is_correct) subjectMap[s].correct++;
    }

    // For specific purchases: add purchased but unpracticed subjects
    // For all-plan: only show practiced subjects
    if (!hasAllPlan) {
      for (const slug of purchasedSlugs) {
        if (!subjectMap[slug]) {
          subjectMap[slug] = { total: 0, correct: 0, slug, used: 0, subtopics: subTotalBySubject[slug] || 0 };
        }
      }
    }

    const total = all.length;
    const correct = all.filter((a: any) => a.is_correct).length;

    let subjects = Object.values(subjectMap).map(s => ({
      slug: s.slug,
      total: s.total,
      correct: s.correct,
      rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      used: s.used,
      subtopics: s.subtopics,
    }));

    // Default: if all-plan and no practice yet, show first purchased subject
    if (subjects.length === 0 && hasAllPlan && purchasedSlugs.length > 0) {
      const firstSlug = purchasedSlugs[0];
      subjects = [{
        slug: firstSlug,
        total: 0, correct: 0, rate: 0,
        used: 0,
        subtopics: subTotalBySubject[firstSlug] || 0,
      }];
    }

    // Subtopic progress: practiced / total
    const subtopicProgress = Object.entries(subTotalBySubject).map(([slug, total]) => ({
      slug,
      practiced: practicedBySubject[slug]?.size || 0,
      total,
    }));

    const recent = all.slice(0, 10).map((a: any) => ({
      question_id: a.question_id,
      question_text: (a.question_text || "").slice(0, 100),
      is_correct: a.is_correct,
      user_answer: a.user_answer,
      correct_answer: a.correct_answer,
      subject_slug: a.subject_slug,
      subtopic_code: a.subtopic_code,
      difficulty: a.difficulty,
      created_at: a.created_at,
    }));

    return NextResponse.json({
      total,
      correct,
      rate: total > 0 ? Math.round((correct / total) * 100) : 0,
      subjects,
      recent,
      subtopicProgress,
    });
  } catch (e: any) {
    return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [], subtopicProgress: [] });
  }
}
