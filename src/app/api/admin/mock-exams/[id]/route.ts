import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: exam } = await supabase.from("mock_exams").select("file_url, answer_url").eq("id", id).single();
  if (exam) {
    for (const url of [exam.file_url, exam.answer_url]) {
      if (!url) continue;
      const path = url.split("/mock-exams/")[1];
      if (path) await supabase.storage.from("mock-exams").remove([path]);
    }
  }

  const { error } = await supabase.from("mock_exams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
