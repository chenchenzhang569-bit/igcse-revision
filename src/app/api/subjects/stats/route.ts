import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID || "7524670a3d7d50fd979765dedb5b378d"}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || "baf9fd99dfe0501ceb0f8da65bccfbfc",
    secretAccessKey: process.env.R2_SECRET_KEY || "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80",
  },
});

export const dynamic = "force-dynamic";

interface SubjectStats {
  past_papers: number;
  notes: number;
  questions: number;        // combined mcq + structured (DB) + R2 files
  mock_exams: number;
}

const MOCK_SUBJECT_MAP: Record<string, string> = {
  "0580": "maths", "0606": "0606", "0625": "physics",
  "0620": "chemistry", "0610": "biology", "0478": "computer-science",
  "0455": "economics",
};

// Subjects whose questions are in R2 JSON files (not DB questions table)
const R2_PATHS: Record<string, string[]> = {
  "edexcel-mathematics-4ma1": ["igcse/maths/edexcel/sme-questions/foundation/"],
  "edexcel-mathematics-higher-4ma1": ["igcse/maths/edexcel/sme-questions/higher/"],
  "edexcel-further-maths-4pm1": ["igcse/maths/edexcel/sme-questions/"],
  "edexcel-economics-4ec1": ["igcse/economics/edexcel/sme-questions/"],
  "edexcel-geography-4ge1": ["igcse/geography/edexcel/sme-questions/"],
};

async function countR2Files(slug: string): Promise<number> {
  const paths = R2_PATHS[slug];
  if (!paths) return 0;
  let total = 0;
  for (const prefix of paths) {
    try {
      const cmd = new ListObjectsV2Command({ Bucket: "past-papers", Prefix: prefix });
      const resp = await R2.send(cmd);
      total += (resp.Contents || []).filter(o => o.Key?.endsWith(".json")).length;
    } catch { /* skip */ }
  }
  return total;
}

// Paginated fetch to avoid Supabase 1000-row limit
async function fetchAll<T>(
  supabase: any,
  table: string,
  cols: string,
  filter?: { col: string; vals: any[] },
  extra?: (q: any) => any,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const colStr = Array.isArray(cols) ? cols.join(",") : cols;
    let q = supabase.from(table).select(colStr).range(offset, offset + 999);
    if (filter) q = q.in(filter.col, filter.vals);
    if (extra) q = extra(q);
    const { data: page } = await q;
    if (!page?.length) break;
    all.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return all;
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1. Subjects
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, slug, display_name, code")
    .eq("is_published", true);

  if (!subjects) return NextResponse.json({ error: "No subjects" }, { status: 500 });

  // 2-5. Parallel
  const [ppRows, notesRows, qRows, mockSets] = await Promise.all([
    fetchAll<any>(supabase, "past_papers", "subject_id", { col: "paper_type", vals: ["QP", "Question Paper"] }),
    fetchAll<any>(supabase, "notes", ["subject_id"]),
    fetchAll<any>(supabase, "questions", ["subject_id"]),
    fetchAll<any>(supabase, "mock_exam_sets", ["subject"]),
  ]);

  // Aggregate
  const ppCounts: Record<string, number> = {};
  for (const r of ppRows) ppCounts[r.subject_id] = (ppCounts[r.subject_id] || 0) + 1;

  const notesCounts: Record<string, number> = {};
  for (const r of notesRows) if (r.subject_id) notesCounts[r.subject_id] = (notesCounts[r.subject_id] || 0) + 1;

  const qCounts: Record<string, number> = {};
  for (const r of qRows) qCounts[r.subject_id] = (qCounts[r.subject_id] || 0) + 1;

  const mockCounts: Record<string, number> = {};
  for (const r of mockSets) mockCounts[r.subject] = (mockCounts[r.subject] || 0) + 1;

  // R2 file counts
  const allR2 = await Promise.all(
    Object.keys(R2_PATHS).map(async slug => ({ slug, count: await countR2Files(slug) }))
  );
  const r2Counts: Record<string, number> = {};
  for (const { slug, count } of allR2) r2Counts[slug] = count;

  // Build result
  const result: Record<string, SubjectStats> = {};
  for (const sub of subjects) {
    const code = (sub.code || "").toLowerCase();
    const isEdexcel = sub.slug.startsWith("edexcel");

    let mockCount = mockCounts[MOCK_SUBJECT_MAP[code]] || 0;
    if (mockCount === 0 && isEdexcel) {
      if ((sub.display_name || "").toLowerCase().includes("biology"))
        mockCount = mockCounts["edexcel-biology"] || 0;
    }

    const dbQ = qCounts[sub.id] || 0;
    const r2Q = r2Counts[sub.slug] || 0;

    result[sub.id] = {
      past_papers: ppCounts[sub.id] || 0,
      notes: notesCounts[sub.id] || 0,
      questions: dbQ + r2Q,
      mock_exams: mockCount,
    };
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
