import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PastPapersYearListPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const supabase = createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, display_name")
    .eq("slug", subjectSlug)
    .single();

  if (!subject) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Subject not found</p>
        <Link href="/dashboard" className="text-primary-600 mt-4 inline-block">← Back</Link>
      </div>
    );
  }

  const subj = subject as any;

  const { data: papers = [] } = await supabase
    .from("past_papers")
    .select("year, season")
    .eq("subject_id", subj.id)
    .limit(5000);

  // Group by year+season and count
  const groups: Record<string, { year: number; season: string; count: number }> = {};
  for (const p of papers as any[]) {
    const key = `${p.year}-${p.season.toLowerCase().replace(/[\/\s]+/g, "-")}`;
    if (!groups[key]) groups[key] = { year: p.year, season: p.season, count: 0 };
    groups[key].count++;
  }

  // Sort: newest first, then season order
  const seasonOrder = (s: string) => {
    if (s.includes("Mar") || s.includes("Feb")) return 1;
    if (s.includes("May") || s.includes("Jun")) return 2;
    if (s.includes("Oct") || s.includes("Nov")) return 3;
    return 9;
  };

  const entries = Object.entries(groups).sort((a, b) => {
    if (a[1].year !== b[1].year) return b[1].year - a[1].year;
    return seasonOrder(a[1].season) - seasonOrder(b[1].season);
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        {" / "}
        <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary-600">{subj.display_name}</Link>
        {" / "}
        <span className="text-gray-600">Past Papers</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-primary-900">📄 {subj.display_name} Past Papers</h1>
        <p className="text-gray-500 mt-1">Select an exam season to view papers and mark schemes</p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">
          No past papers available yet
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            let lastYear = -1;
            return entries.map(([slug, info]) => {
              const showYear = info.year !== lastYear;
              lastYear = info.year;
              return (
                <div key={slug}>
                  {showYear && (
                    <h2 className="text-lg font-bold text-primary-900 mt-6 mb-3 flex items-center gap-2">
                      <span className="bg-primary-600 text-white text-sm px-3 py-0.5 rounded-full">{info.year}</span>
                    </h2>
                  )}
                  <Link
                    href={`/past-papers/${subjectSlug}/${slug}`}
                    className="bg-white border rounded-xl p-4 hover:shadow-md hover:border-primary-300 transition-all flex items-center justify-between group ml-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-primary-600 transition">
                        📅 {info.season}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {info.count} papers
                      </span>
                    </div>
                    <span className="text-gray-300 group-hover:text-primary-500 transition">→</span>
                  </Link>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
