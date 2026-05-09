import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// PUT /api/admin/questions/[id] - update a question
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    const fields = [
      "topic_id", "subject_id", "question_text", "question_type",
      "options", "correct_answer", "answer_text", "explanation",
      "difficulty", "marks", "is_free_preview", "sort_order"
    ];
    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }
    updateData.updated_at = new Date().toISOString();

    // If topic_id changed, update subject_id
    if (body.topic_id) {
      const { data: topic } = await supabase
        .from("topics")
        .select("subject_id")
        .eq("id", body.topic_id)
        .single();
      if (topic) updateData.subject_id = (topic as any).subject_id;
    }

    const { data, error } = await supabase
      .from("questions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/questions/[id] - delete a question
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
