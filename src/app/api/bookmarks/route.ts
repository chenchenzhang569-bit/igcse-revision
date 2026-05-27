import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    "https://aondldqwwvttwpervrfq.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

// GET /api/bookmarks — get user's bookmarks (with optional ?question_id= or ?mock_exam_question_id=)
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
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
    const mockExamQId = searchParams.get("mock_exam_question_id");

    // Single-check mode
    if (questionId) {
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("question_id", questionId)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ bookmarked: !!data });
    }

    if (mockExamQId) {
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("mock_exam_question_id", mockExamQId)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ bookmarked: !!data });
    }

    // === Full list mode ===
    // STEP 1: Get all bookmarks
    const { data: rows, error: bmErr } = await supabase
      .from("user_bookmarks")
      .select("id, created_at, question_id, mock_exam_question_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bmErr) return NextResponse.json({ error: bmErr.message }, { status: 500 });
    if (!rows || rows.length === 0) return NextResponse.json([]);

    // Split into question-type and mock_exam-type
    const qRows = rows.filter(r => r.question_id);
    const meRows = rows.filter(r => r.mock_exam_question_id);

    // === QUESTION TYPE: existing 7-step chain ===
    const enriched: any[] = [];

    if (qRows.length > 0) {
      const questionIds = [...new Set(qRows.map(r => r.question_id))];
      const { data: questions } = await supabase
        .from("questions")
        .select("id, question_text, difficulty, question_type, topic_id, subtopic_id")
        .in("id", questionIds);
      const qMap: Record<string, any> = {};
      for (const q of questions || []) qMap[q.id] = q;

      const topicIds = [...new Set((questions || []).map(q => q.topic_id).filter(Boolean))];
      const { data: topics } = await supabase
        .from("topics")
        .select("id, name, slug, subject_id")
        .in("id", topicIds);
      const tMap: Record<string, any> = {};
      for (const t of topics || []) tMap[t.id] = t;

      const subtopicIds = [...new Set((questions || []).map(q => q.subtopic_id).filter(Boolean))];
      const { data: subtopics } = await supabase
        .from("subtopics")
        .select("id, name")
        .in("id", subtopicIds);
      const stMap: Record<string, any> = {};
      for (const s of subtopics || []) stMap[s.id] = s;

      const subjectIds = [...new Set((topics || []).map(t => t.subject_id).filter(Boolean))];
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, slug, code, exam_board_id")
        .in("id", subjectIds);
      const subjMap: Record<string, any> = {};
      for (const s of subjects || []) subjMap[s.id] = s;

      const boardIds = [...new Set((subjects || []).map(s => s.exam_board_id).filter(Boolean))];
      const { data: boards } = await supabase
        .from("exam_boards")
        .select("id, slug")
        .in("id", boardIds);
      const boardMap: Record<string, any> = {};
      for (const b of boards || []) boardMap[b.id] = b;

      for (const row of qRows) {
        const q = qMap[row.question_id];
        if (!q) continue;
        const topic = tMap[q.topic_id] || null;
        const subtopic = stMap[q.subtopic_id] || null;
        const subject = topic ? subjMap[topic.subject_id] : null;
        const board = subject ? boardMap[subject.exam_board_id] : null;
        const subjectSlug = subject ? subject.slug : "";

        enriched.push({
          bookmark_id: row.id,
          created_at: row.created_at,
          source: "question" as const,
          question: {
            id: q.id,
            question_text: q.question_text,
            difficulty: q.difficulty,
            question_type: q.question_type,
            subtopic: subtopic ? { id: subtopic.id, name: subtopic.name } : null,
            topic: topic ? { id: topic.id, name: topic.name, slug: topic.slug } : null,
            subjectSlug,
          },
        });
      }
    }

    // === MOCK EXAM TYPE ===
    if (meRows.length > 0) {
      const meQIds = [...new Set(meRows.map(r => r.mock_exam_question_id))];

      // Fetch mock_exam_questions
      const { data: meQuestions } = await supabase
        .from("mock_exam_questions")
        .select("id, stem, difficulty, correct_answer, paper_id")
        .in("id", meQIds);
      const meQMap: Record<string, any> = {};
      for (const q of meQuestions || []) meQMap[q.id] = q;

      // Fetch papers
      const paperIds = [...new Set((meQuestions || []).map(q => q.paper_id).filter(Boolean))];
      const { data: papers } = await supabase
        .from("mock_exam_papers")
        .select("id, paper_type, paper_number, set_id, slug")
        .in("id", paperIds);
      const paperMap: Record<string, any> = {};
      for (const p of papers || []) paperMap[p.id] = p;

      // Fetch sets
      const setIds = [...new Set((papers || []).map(p => p.set_id).filter(Boolean))];
      const { data: sets } = await supabase
        .from("mock_exam_sets")
        .select("id, subject, board, slug")
        .in("id", setIds);
      const setMap: Record<string, any> = {};
      for (const s of sets || []) setMap[s.id] = s;

      // Build subject lookup from mock_exam_sets → subjects table
      const subjectMatches: Record<string, string> = {}; // key: "board|subject" → subjects.slug
      for (const s of sets || []) {
        const key = `${s.board.toLowerCase()}|${s.subject.toLowerCase()}`;
        if (!subjectMatches[key]) {
          const { data: matched } = await supabase
            .from("subjects")
            .select("slug")
            .ilike("slug", `%${s.board.toLowerCase()}-${s.subject.toLowerCase()}%`)
            .limit(1);
          if (matched && matched.length > 0) {
            subjectMatches[key] = matched[0].slug;
          }
        }
      }

      for (const row of meRows) {
        const q = meQMap[row.mock_exam_question_id];
        if (!q) continue;
        const paper = paperMap[q.paper_id] || null;
        const set = paper ? setMap[paper.set_id] : null;

        // Find subject slug
        let subjectSlug = "";
        if (set) {
          const key = `${set.board.toLowerCase()}|${set.subject.toLowerCase()}`;
          subjectSlug = subjectMatches[key] || "";
        }

        const paperLabel = paper
          ? `${paper.paper_type} ${paper.paper_number || ""}`.trim()
          : "Unknown Paper";

        enriched.push({
          bookmark_id: row.id,
          created_at: row.created_at,
          source: "mock_exam" as const,
          question: {
            id: q.id,
            question_text: q.stem || q.id,
            difficulty: q.difficulty || "medium",
            question_type: "mcq",
            paper: paper ? {
              id: paper.id,
              type: paper.paper_type,
              number: paper.paper_number,
              slug: paper.slug,
              label: paperLabel,
            } : null,
            set: set ? {
              id: set.id,
              subject: set.subject,
              board: set.board,
              slug: set.slug,
            } : null,
            subjectSlug,
            subtopic: null,
            topic: null,
          },
        });
      }
    }

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/bookmarks — add a bookmark
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
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

    const body = await req.json();
    const questionId = body.question_id;
    const mockExamQId = body.mock_exam_question_id;

    if (!questionId && !mockExamQId) {
      return NextResponse.json({ error: "question_id or mock_exam_question_id required" }, { status: 400 });
    }

    const insertData: Record<string, any> = { user_id: user.id };
    if (questionId) insertData.question_id = questionId;
    if (mockExamQId) insertData.mock_exam_question_id = mockExamQId;

    const { data, error } = await supabase
      .from("user_bookmarks")
      .insert(insertData)
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
  const supabase = getSupabase();
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

    const body = await req.json();
    const questionId = body.question_id;
    const mockExamQId = body.mock_exam_question_id;

    if (!questionId && !mockExamQId) {
      return NextResponse.json({ error: "question_id or mock_exam_question_id required" }, { status: 400 });
    }

    let query = supabase.from("user_bookmarks").delete().eq("user_id", user.id);
    if (questionId) query = query.eq("question_id", questionId);
    if (mockExamQId) query = query.eq("mock_exam_question_id", mockExamQId);

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
