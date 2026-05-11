import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    // Get all subjects
    const { data: subjects } = await admin.from("subjects").select("id, code, slug, name");
    
    // Get past_papers count per subject
    const { data: papers, error } = await admin
      .from("past_papers")
      .select("subject_id, year, season")
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count per subject
    const counts: Record<string, number> = {};
    for (const p of papers || []) {
      counts[p.subject_id] = (counts[p.subject_id] || 0) + 1;
    }

    // Get total count
    const { count } = await admin
      .from("past_papers")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      subjects: subjects?.map(s => ({ id: s.id, code: s.code, slug: s.slug, name: s.name })),
      samplePapers: papers?.slice(0, 10),
      totalPapers: count,
      countsBySubject: counts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
