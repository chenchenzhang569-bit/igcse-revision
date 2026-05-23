import { NextRequest, NextResponse } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

// Decode JWT without API call (no service key needed)
function getUserIdFromCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(/sb-[^;]+-access-token=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  try {
    // JWT payload is the second base64 segment
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return decoded.sub || null; // "sub" is the user UUID
  } catch {
    return null;
  }
}

// GET /api/user-answers/stats
export async function GET(req: NextRequest) {
  try {
    // Extract user_id from cookie JWT — no service key needed
    const cookieHeader = req.headers.get("cookie") || "";
    const userId = getUserIdFromCookie(cookieHeader);

    if (!userId) {
      // Return zeros instead of error — new users should see the dashboard
      return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
    }

    // Query user_answers via REST API (anon key)
    const res = await fetch(
      `${API}/user_answers?select=is_correct,subject_slug,created_at,question_id,subtopic_code,difficulty,question_text,user_answer,correct_answer&user_id=eq.${userId}&order=created_at.desc&limit=500`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
    );
    const all = await res.json();

    if (!Array.isArray(all)) {
      return NextResponse.json({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
    }

    const total = all.length;
    const correct = all.filter((a: any) => a.is_correct).length;

    // Per-subject stats
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
