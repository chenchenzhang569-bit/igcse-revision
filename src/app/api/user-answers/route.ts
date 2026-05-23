import { NextRequest, NextResponse } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Extract user ID from a JWT (client-side access_token)
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

// GET /api/user-answers/stats — return user's answer stats
export async function GET(req: NextRequest) {
  try {
    // Try Authorization header first, then cookie fallback
    const authHeader = req.headers.get("authorization") || "";
    let jwt = "";
    if (authHeader.startsWith("Bearer ")) {
      jwt = authHeader.slice(7);
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/sb-[^;]+-auth-token=([^;]+)/);
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          const parsed = JSON.parse(decoded);
          jwt = (Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token) || "";
        } catch {}
      }
    }

    const userId = jwt ? getUserIdFromJwt(jwt) : null;
    if (!userId) {
      return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
    }

    const authHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` };

    const res = await fetch(
      `${API}/user_answers?select=is_correct,subject_slug,created_at,question_id,subtopic_code,difficulty,question_text,user_answer,correct_answer&user_id=eq.${userId}&order=created_at.desc&limit=500`,
      { headers: authHeaders }
    );
    const all = await res.json();

    if (!Array.isArray(all)) {
      return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
    }

    const total = all.length;
    const correct = all.filter((a: any) => a.is_correct).length;

    const subjectMap: Record<string, { total: number; correct: number; slug: string }> = {};
    for (const a of all) {
      const s = a.subject_slug || "unknown";
      if (!subjectMap[s]) subjectMap[s] = { total: 0, correct: 0, slug: s };
      subjectMap[s].total++;
      if (a.is_correct) subjectMap[s].correct++;
    }

    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
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
    });
  } catch (e: any) {
    return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
  }
}

// POST /api/user-answers — batch save answers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answers, subject_slug, topic_slug, subtopic_code } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "No answers provided" }, { status: 400 });
    }

    // 1. Try Authorization: Bearer <token> (primary — browser can read supabase session)
    const authHeader = req.headers.get("authorization") || "";
    let jwt = "";
    if (authHeader.startsWith("Bearer ")) {
      jwt = authHeader.slice(7);
    }

    // 2. Fallback: extract from Supabase cookie (may not reach Vercel serverless)
    if (!jwt) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/sb-[^;]+-auth-token=([^;]+)/);
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          const parsed = JSON.parse(decoded);
          jwt = (Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token) || "";
        } catch {}
      }
    }

    const userId = jwt ? getUserIdFromJwt(jwt) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized — no valid session found" }, { status: 401 });
    }

    // Insert via REST API with user's JWT (RLS: auth.uid() = user_id)
    const authHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", Prefer: "return=minimal" };

    let count = 0;
    for (const a of answers) {
      const row = {
        user_id: userId,
        question_id: a.question_id,
        user_answer: a.user_answer || "",
        correct_answer: a.correct_answer || "",
        is_correct: a.is_correct || false,
        subject_slug: subject_slug || "",
        topic_slug: topic_slug || "",
        subtopic_code: subtopic_code || "",
        question_text: (a.question_text || "").slice(0, 500),
        difficulty: a.difficulty || "",
      };

      const res = await fetch(`${API}/user_answers`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(row),
      });

      if (res.ok) count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
