import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  const fields = ["topic_id", "title", "content", "is_free_preview", "sort_order"];
  const updateData: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("notes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
