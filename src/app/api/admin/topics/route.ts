import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const supabase = createAdminClient();

    // Get topics with subject info
    const { data: topics, error } = await supabase
      .from("topics")
      .select("*, subjects!inner(id, display_name, name, slug)")
      .order("sort_order");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get note counts per topic
    const { data: noteCounts, error: noteErr } = await supabase
      .from("notes")
      .select("topic_id");

    // Get question counts per topic
    const { data: questionCounts, error: qErr } = await supabase
      .from("questions")
      .select("topic_id");

    // Build count maps
    const noteMap: Record<string, number> = {};
    (noteCounts || []).forEach((n: any) => {
      noteMap[n.topic_id] = (noteMap[n.topic_id] || 0) + 1;
    });

    const questionMap: Record<string, number> = {};
    (questionCounts || []).forEach((q: any) => {
      questionMap[q.topic_id] = (questionMap[q.topic_id] || 0) + 1;
    });

    // Merge counts into topics
    const enriched = (topics || []).map((t: any) => ({
      ...t,
      notes_count: noteMap[t.id] || 0,
      questions_count: questionMap[t.id] || 0,
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
