import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use service_role for server-side to bypass RLS for JOIN queries
const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET /api/bookmarks — get user's bookmarks (with optional ?question_id= for single check)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    // Verify user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("question_id");

    if (questionId) {
      // Check single bookmark
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("question_id", questionId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ bookmarked: !!data });
    }

    // Get all bookmarks with full question hierarchy
    const { data: bookmarks, error } = await supabase
      .from("user_bookmarks")
      .select(`
        id,
        created_at,
        question:questions (
          id, question_text, difficulty, question_type,
          subtopic:subtopics (id, name),
          topic:topics (
            id, name,
            subject:subjects (
              id, name, slug, display_name, code,
              exam_board:exam_boards (id, name, slug)
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reshape: use actual DB hierarchy, not keyword guessing
    const enriched = (bookmarks || []).map((b: any) => {
      const q = b.question;
      if (!q) return null;

      // Build subjectSlug from actual JOIN data
      const subject = q.topic?.subject;
      const examBoard = subject?.exam_board;
      const subjectSlug = (examBoard && subject)
        ? `${examBoard.slug}-${subject.slug}-${subject.code}`
        : "";

      return {
        bookmark_id: b.id,
        created_at: b.created_at,
        question: {
          id: q.id,
          question_text: q.question_text,
          difficulty: q.difficulty,
          question_type: q.question_type,
          subtopic: q.subtopic,
          topic: q.topic,
          subjectSlug,
        },
      };
    }).filter(Boolean);

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/bookmarks — add a bookmark
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { question_id } = await req.json();
    if (!question_id) {
      return NextResponse.json({ error: "question_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_bookmarks")
      .insert({ user_id: user.id, question_id })
      .select("id")
      .single();

    if (error) {
      // Unique violation = already bookmarked
      if (error.code === "23505") {
        return NextResponse.json({ bookmarked: true, message: "Already saved" }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/bookmarks — remove a bookmark
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { question_id } = await req.json();
    if (!question_id) {
      return NextResponse.json({ error: "question_id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("question_id", question_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
