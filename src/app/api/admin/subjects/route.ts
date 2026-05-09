import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/subjects - list all subjects
export async function GET() {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*, exam_boards(name, slug)")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/subjects - create a new subject
export async function POST(req: NextRequest) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const body = await req.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("subjects")
      .insert({
        exam_board_id: body.exam_board_id,
        name: body.name,
        display_name: body.display_name,
        code: body.code || null,
        slug: body.slug,
        icon: body.icon || null,
        price_cny: body.price_cny || 29900,
        is_published: body.is_published ?? false,
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
