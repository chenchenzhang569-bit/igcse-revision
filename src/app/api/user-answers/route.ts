import { NextRequest, NextResponse } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

function getJwtFromCookie(cookieHeader: string): string | null {
  // Supabase stores auth token in: sb-{ref}-auth-token = {"access_token":"eyJ...","refresh_token":"..."}
  const match = cookieHeader.match(/sb-[^;]+-auth-token=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded);
    return parsed.access_token || null;
  } catch {
    return null;
  }
}

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

// POST /api/user-answers — batch save answers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answers, subject_slug, topic_slug, subtopic_code } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "No answers provided" }, { status: 400 });
    }

    // Get user from cookie JWT
    const cookieHeader = req.headers.get("cookie") || "";
    const jwt = getJwtFromCookie(cookieHeader);
    const userId = jwt ? getUserIdFromJwt(jwt) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
