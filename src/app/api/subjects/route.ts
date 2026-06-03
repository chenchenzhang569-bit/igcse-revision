import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from("subjects")
    .select("id, name, display_name, slug, code, icon, price_cny, is_published, exam_boards!inner(name, slug)")
    .eq("is_published", true)
    .order("display_name");

  if (slug) query = query.eq("slug", slug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const flattened = (data || []).map((s: any) => ({
    ...s,
    board_name: s.exam_boards?.name,
    board_slug: s.exam_boards?.slug,
    exam_boards: undefined,
  }));

  return NextResponse.json(flattened);
}
