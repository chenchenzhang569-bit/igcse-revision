import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SubjectStats {
  past_papers: number;
  notes: number;
  questions_mcq: number;
  questions_structured: number;
  mock_exams: number;
}

const MOCK_SUBJECT_MAP: Record<string, string> = {
  "0580": "maths",
  "0606": "0606",
  "0625": "physics",
  "0620": "chemistry",
  "0610": "biology",
  "0478": "computer-science",
  "0455": "economics",
};

const R2_SUBJECT_CODES = new Set(["4ma1", "4pm1"]);

export async function GET() {
  const supabase = createClient(API, KEY);

  // Parallel queries for speed
  const [subRes, ppRes, notesRes, qsRes, mockRes] = await Promise.all([
    supabase.from("subjects").select("id, slug, display_name, code").eq("is_published", true),
    supabase.from("past_papers").select("subject_id").in("paper_type", ["QP", "Question Paper"]).limit(100000),
    supabase.from("notes").select("subject_id").limit(100000),
    supabase.from("questions").select("subject_id, question_type").limit(100000),
    supabase.from("mock_exam_sets").select("subject, board").limit(1000),
  ]);

  const subjects = subRes.data;
  if (!subjects) {
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }

  // Aggregate counts
  const ppCounts: Record<string, number> = {};
  if (ppRes.data) for (const r of ppRes.data) ppCounts[r.subject_id] = (ppCounts[r.subject_id] || 0) + 1;

  const notesCounts: Record<string, number> = {};
  if (notesRes.data) for (const r of notesRes.data) if (r.subject_id) notesCounts[r.subject_id] = (notesCounts[r.subject_id] || 0) + 1;

  const qCounts: Record<string, { mcq: number; structured: number }> = {};
  if (qsRes.data) {
    for (const q of qsRes.data) {
      const sid = q.subject_id;
      if (!qCounts[sid]) qCounts[sid] = { mcq: 0, structured: 0 };
      if (q.question_type === "mcq" || q.question_type === "multiple_choice") qCounts[sid].mcq++;
      else if (q.question_type === "structured") qCounts[sid].structured++;
    }
  }

  const mockCounts: Record<string, number> = {};
  if (mockRes.data) for (const m of mockRes.data) mockCounts[m.subject] = (mockCounts[m.subject] || 0) + 1;

  // Build result
  const result: Record<string, SubjectStats> = {};
  for (const sub of subjects) {
    const code = (sub.code || "").toLowerCase();
    const isEdexcel = sub.slug.startsWith("edexcel");
    const isR2 = R2_SUBJECT_CODES.has(code);

    let mockCount = mockCounts[MOCK_SUBJECT_MAP[code]] || 0;
    if (mockCount === 0 && isEdexcel) {
      const dn = (sub.display_name || "").toLowerCase();
      if (dn.includes("biology")) mockCount = mockCounts["edexcel-biology"] || 0;
    }

    result[sub.id] = {
      past_papers: ppCounts[sub.id] || 0,
      notes: notesCounts[sub.id] || 0,
      questions_mcq: isR2 ? 0 : (qCounts[sub.id]?.mcq || 0),
      questions_structured: isR2 ? 0 : (qCounts[sub.id]?.structured || 0),
      mock_exams: mockCount,
    };
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
