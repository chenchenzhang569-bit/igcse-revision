import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*, topics!inner(name, slug, subjects!inner(display_name))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      topic_id: body.topic_id,
      title: body.title,
      content: body.content,
      is_free_preview: body.is_free_preview ?? false,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
