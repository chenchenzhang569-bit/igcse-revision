import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// POST /api/user-answers — batch save answers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answers, subject_slug, topic_slug, subtopic_code } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "No answers provided" }, { status: 400 });
    }

    // Get user from auth cookie via supabase
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      // Try cookie-based auth fallback
      const cookieHeader = req.headers.get("cookie") || "";
      const accessToken = cookieHeader.match(/sb-[^;]+-access-token=([^;]+)/)?.[1];
      if (accessToken) {
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = answers.map((a: any) => ({
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
    }));

    const { error } = await supabase.from("user_answers").insert(rows);
    if (error) throw error;

    return NextResponse.json({ success: true, count: rows.length });
  } catch (e: any) {
    console.error("user-answers POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
