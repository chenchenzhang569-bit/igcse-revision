import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/questions - list all questions with topic/subject info
export async function GET(req: NextRequest) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topic_id");
    const subjectId = searchParams.get("subject_id");

    let query = supabase
      .from("questions")
      .select("*, topics!inner(id, display_name, slug, subjects!inner(id, display_name))")
      .order("sort_order");

    if (topicId) query = query.eq("topic_id", topicId);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/questions - create a question
export async function POST(req: NextRequest) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const body = await req.json();
    const supabase = createAdminClient();

    // Get the subject_id from the topic
    const { data: topic } = await supabase
      .from("topics")
      .select("subject_id")
      .eq("id", body.topic_id)
      .single();

    const { data, error } = await supabase
      .from("questions")
      .insert({
        topic_id: body.topic_id,
        subject_id: topic?.subject_id || null,
        question_text: body.question_text,
        question_type: body.question_type || "structured",
        options: body.options || null,
        correct_answer: body.correct_answer || null,
        answer_text: body.answer_text || "",
        explanation: body.explanation || null,
        difficulty: body.difficulty || "medium",
        marks: body.marks || null,
        is_free_preview: body.is_free_preview ?? false,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
