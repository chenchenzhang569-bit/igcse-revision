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

  // Fetch subtopics + join with topics to get topic name
  const { data: subtopics, error } = await admin
    .from("subtopics")
    .select(`
      id, display_name, pmt_code, name, sort_order, topic_id,
      topics!inner(id, display_name)
    `)
    .eq("topics.subject_id", subjectId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (subtopics || []).map((st: any) => ({
    id: st.id,
    display_name: st.display_name,
    pmt_code: st.pmt_code,
    name: st.name,
    topic_id: st.topic_id,
    topic_name: st.topics?.display_name || "",
  }));

  return NextResponse.json(result);
}
