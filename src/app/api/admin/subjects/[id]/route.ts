import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// PUT /api/admin/subjects/[id] - update a subject
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  const fields = [
    "exam_board_id", "name", "display_name", "code", "slug",
    "icon", "price_cny", "is_published", "sort_order"
  ];
  for (const f of fields) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }

  const { data, error } = await supabase
    .from("subjects")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/subjects/[id] - delete a subject
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
