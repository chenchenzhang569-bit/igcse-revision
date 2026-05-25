import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

// GET /api/topics?subject_id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subject_id");

  if (!subjectId) {
    return NextResponse.json({ error: "Missing subject_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("topics")
    .select("id, display_name, slug, sort_order")
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
