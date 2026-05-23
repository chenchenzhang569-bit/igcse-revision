import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("question_id");

    if (questionId) {
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

    // === STEP 1: Get all bookmarks (just IDs) ===
    const { data: rows, error: bmErr } = await supabase
      .from("user_bookmarks")
      .select("id, created_at, question_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bmErr) {
      return NextResponse.json({ error: bmErr.message }, { status: 500 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json([]);
    }

    // === STEP 2: Get all questions (plain fields, no JOIN) ===
    const questionIds = [...new Set(rows.map(r => r.question_id))];
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, difficulty, question_type, topic_id, subtopic_id")
      .in("id", questionIds);

    const qMap: Record<string, any> = {};
    for (const q of questions || []) qMap[q.id] = q;

    // === STEP 3: Get all topics (plain fields) ===
    const topicIds = [...new Set((questions || []).map(q => q.topic_id).filter(Boolean))];
    const { data: topics } = await supabase
      .from("topics")
      .select("id, name, subject_id")
      .in("id", topicIds);

    const tMap: Record<string, any> = {};
    for (const t of topics || []) tMap[t.id] = t;

    // === STEP 4: Get all subtopics (plain fields) ===
    const subtopicIds = [...new Set((questions || []).map(q => q.subtopic_id).filter(Boolean))];
    const { data: subtopics } = await supabase
      .from("subtopics")
      .select("id, name")
      .in("id", subtopicIds);

    const stMap: Record<string, any> = {};
    for (const s of subtopics || []) stMap[s.id] = s;

    // === STEP 5: Get all subjects (plain fields) ===
    const subjectIds = [...new Set((topics || []).map(t => t.subject_id).filter(Boolean))];
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, slug, code, exam_board_id")
      .in("id", subjectIds);

    const subjMap: Record<string, any> = {};
    for (const s of subjects || []) subjMap[s.id] = s;

    // === STEP 6: Get all exam boards ===
    const boardIds = [...new Set((subjects || []).map(s => s.exam_board_id).filter(Boolean))];
    const { data: boards } = await supabase
      .from("exam_boards")
      .select("id, slug")
      .in("id", boardIds);

    const boardMap: Record<string, any> = {};
    for (const b of boards || []) boardMap[b.id] = b;

    // === STEP 7: Build enriched response ===
    const enriched: any[] = [];
    for (const row of rows) {
      const q = qMap[row.question_id];
      if (!q) continue;

      const topic = tMap[q.topic_id] || null;
      const subtopic = stMap[q.subtopic_id] || null;
      const subject = topic ? subjMap[topic.subject_id] : null;
      const board = subject ? boardMap[subject.exam_board_id] : null;

      // subject.slug is already the full composite slug (e.g. "caie-physics-0625")
      const subjectSlug = subject ? subject.slug : "";

      enriched.push({
        bookmark_id: row.id,
        created_at: row.created_at,
        question: {
          id: q.id,
          question_text: q.question_text,
          difficulty: q.difficulty,
          question_type: q.question_type,
          subtopic: subtopic ? { id: subtopic.id, name: subtopic.name } : null,
          topic: topic ? { id: topic.id, name: topic.name } : null,
          subjectSlug,
        },
      });
    }

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
