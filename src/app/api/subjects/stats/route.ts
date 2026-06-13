import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";

interface SubjectStats {
  past_papers: number;        // QP entries = 1 set
  notes: number;              // note records
  questions_mcq: number;      // mcq questions (DB)
  questions_structured: number; // structured questions (DB)
  mock_exams: number;         // mock exam sets
}

interface MockExamSet {
  subject: string;
  board: string | null;
}

// Map subject code/slug to mock_exam_sets.subject value
const MOCK_SUBJECT_MAP: Record<string, string> = {
  "0580": "maths",
  "0606": "0606",
  "0625": "physics",
  "0620": "chemistry",
  "0610": "biology",
  "0478": "computer-science",
  "0455": "economics",
};

// Subjects whose questions are in R2, not DB
const R2_SUBJECT_CODES = new Set(["4ma1", "4pm1"]);

export async function GET() {
  const supabase = createClient(API, KEY);

  // 1. Get all published subjects
  const { data: subjects, error: subErr } = await supabase
    .from("subjects")
    .select("id, slug, display_name, code")
    .eq("is_published", true);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  // 2. Past papers — count QP entries per subject
  const { data: pastPapers } = await supabase
    .from("past_papers")
    .select("subject_id, paper_type")
    .in("paper_type", ["QP", "Question Paper"]);

  const ppCounts: Record<string, number> = {};
  if (pastPapers) {
    for (const pp of pastPapers) {
      ppCounts[pp.subject_id] = (ppCounts[pp.subject_id] || 0) + 1;
    }
  }

  // 3. Notes — count per subject_id
  const { data: notes } = await supabase
    .from("notes")
    .select("subject_id");

  const notesCounts: Record<string, number> = {};
  if (notes) {
    for (const n of notes) {
      if (n.subject_id) {
        notesCounts[n.subject_id] = (notesCounts[n.subject_id] || 0) + 1;
      }
    }
  }

  // 4. Questions (DB) — count mcq vs structured per subject_id
  const { data: questions } = await supabase
    .from("questions")
    .select("subject_id, question_type");

  const qCounts: Record<string, { mcq: number; structured: number }> = {};
  if (questions) {
    for (const q of questions) {
      const qt = q.question_type;
      if (!qCounts[q.subject_id]) {
        qCounts[q.subject_id] = { mcq: 0, structured: 0 };
      }
      if (qt === "mcq" || qt === "multiple_choice") {
        qCounts[q.subject_id].mcq++;
      } else if (qt === "structured") {
        qCounts[q.subject_id].structured++;
      }
    }
  }

  // 5. Mock exams — count sets per subject key
  const { data: mockData } = await supabase
    .from("mock_exam_sets")
    .select("subject, board");

  const mockCounts: Record<string, number> = {};
  if (mockData) {
    for (const m of mockData) {
      mockCounts[m.subject] = (mockCounts[m.subject] || 0) + 1;
    }
  }

  // 6. Build result
  const result: Record<string, SubjectStats> = {};

  for (const sub of subjects) {
    const sid = sub.id;
    const code = (sub.code || "").toLowerCase();
    const slug = sub.slug;
    const board = slug.startsWith("edexcel") ? "Edexcel" : "CAIE";

    // Mock exams — try code map first, then display name fallback
    let mockCount = mockCounts[MOCK_SUBJECT_MAP[code]] || 0;
    if (mockCount === 0 && board === "Edexcel") {
      const dn = (sub.display_name || "").toLowerCase();
      if (dn.includes("biology")) mockCount = mockCounts["edexcel-biology"] || 0;
    }

    // For R2 subjects, DB questions are 0 — we count R2 JSON files
    const isR2 = R2_SUBJECT_CODES.has(code);

    result[sid] = {
      past_papers: ppCounts[sid] || 0,
      notes: notesCounts[sid] || 0,
      questions_mcq: isR2 ? 0 : (qCounts[sid]?.mcq || 0),
      questions_structured: isR2 ? 0 : (qCounts[sid]?.structured || 0),
      mock_exams: mockCount,
    };
  }

  return NextResponse.json(result);
}
