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

  const fields = ["subject_id", "name", "display_name", "slug", "description", "sort_order"];
  const updateData: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }

  const { data, error } = await supabase
    .from("topics")
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
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
