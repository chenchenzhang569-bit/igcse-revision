import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET /api/user-answers/stats — get user's answer stats
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    if (!userId) {
      const cookieHeader = req.headers.get("cookie") || "";
      const accessToken = cookieHeader.match(/sb-[^;]+-access-token=([^;]+)/)?.[1];
      if (accessToken) {
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        userId = user?.id || null;
      }
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get total stats
    const { data: all, error } = await supabase
      .from("user_answers")
      .select("is_correct, subject_slug, created_at, question_id, subtopic_code, difficulty, question_text, user_answer, correct_answer")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const total = all?.length || 0;
    const correct = all?.filter(a => a.is_correct).length || 0;

    // Per-subject stats
    const subjectMap: Record<string, { total: number; correct: number; slug: string }> = {};
    for (const a of all || []) {
      const s = a.subject_slug || "unknown";
      if (!subjectMap[s]) subjectMap[s] = { total: 0, correct: 0, slug: s };
      subjectMap[s].total++;
      if (a.is_correct) subjectMap[s].correct++;
    }

    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    // Recent 10
    const recent = (all || []).slice(0, 10).map(a => ({
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

    return NextResponse.json({ total, correct, rate: total > 0 ? Math.round((correct / total) * 100) : 0, subjects, recent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
