import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*, subjects!inner(display_name, slug, name)")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topics")
    .insert({
      subject_id: body.subject_id,
      name: body.name,
      display_name: body.display_name,
      slug: body.slug,
      description: body.description || null,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
