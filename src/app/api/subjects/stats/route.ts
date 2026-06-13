import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function countBySubject<T extends Record<string, any>>(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  selectCols: string,
  filter: Record<string, any> | null,
  keyFn: (row: T) => string | null,
  countFn?: (row: T) => number,
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  let offset = 0;
  while (true) {
    let query = admin.from(table).select(selectCols).range(offset, offset + 999);
    if (filter) {
      for (const [col, val] of Object.entries(filter)) {
        if (Array.isArray(val)) query = query.in(col, val);
        else query = query.eq(col, val);
      }
    }
    const { data: page } = await query;
    if (!page?.length) break;
    for (const row of page) {
      const key = keyFn(row);
      if (key) result[key] = (result[key] || 0) + (countFn ? countFn(row) : 1);
    }
    if (page.length < 1000) break;
    offset += 1000;
  }
  return result;
}

export async function GET() {
  const admin = createAdminClient();

  // 1. Subjects
  const { data: subjects } = await admin
    .from("subjects")
    .select("id, slug, display_name, code")
    .eq("is_published", true);

  if (!subjects) {
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }

  // 2-5. Parallel paginated counts (like admin dashboard pattern)
  const [ppCounts, notesCounts, qCounts, mockCounts] = await Promise.all([
    countBySubject<any>(admin, "past_papers", "subject_id", { paper_type: ["QP", "Question Paper"] }, (r) => r.subject_id),
    countBySubject<any>(admin, "notes", "subject_id", null, (r) => r.subject_id),
    (async () => {
      const result: Record<string, { mcq: number; structured: number }> = {};
      let offset = 0;
      while (true) {
        const { data: page } = await admin
          .from("questions")
          .select("subject_id, question_type")
          .range(offset, offset + 999);
        if (!page?.length) break;
        for (const q of page) {
          const sid = q.subject_id;
          if (!result[sid]) result[sid] = { mcq: 0, structured: 0 };
          if (q.question_type === "mcq" || q.question_type === "multiple_choice") result[sid].mcq++;
          else if (q.question_type === "structured") result[sid].structured++;
        }
        if (page.length < 1000) break;
        offset += 1000;
      }
      return result;
    })(),
    countBySubject<any>(admin, "mock_exam_sets", "subject", null, (r) => r.subject),
  ]);

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
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
