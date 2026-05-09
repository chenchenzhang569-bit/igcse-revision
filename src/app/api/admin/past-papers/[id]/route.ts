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

  // 先查出文件 URL 来删除 storage 文件
  const { data: paper } = await supabase.from("past_papers").select("file_url").eq("id", id).single();
  if (paper?.file_url) {
    const url = new URL(paper.file_url);
    const pathParts = url.pathname.split("/storage/v1/object/public/past-papers/");
    if (pathParts.length === 2) {
      await supabase.storage.from("past-papers").remove([pathParts[1]]);
    }
  }

  const { error } = await supabase.from("past_papers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
