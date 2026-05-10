import { createClient } from "@/lib/supabase/server";
import { parseSlug, TOPICS, SUBJECT_NAMES, type Topic } from "@/lib/topics-data";
import Link from "next/link";

export default async function PastPapersYearListPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const parsed = parseSlug(subjectSlug);
  const subjectKey = parsed?.subjectSlug || subjectSlug;
  const board = parsed?.board || "";
  const code = parsed?.code || "";
  const topics: Topic[] = TOPICS[subjectKey] || [];
  const info = SUBJECT_NAMES[subjectKey] || { displayName: subjectKey, icon: "📚" };

  // Try Supabase
  let dbSubject: any = null;
  let papers: any[] = [];
  try {
    const supabase = createClient();
    const { data: s } = await supabase
      .from("subjects")
      .select("id, display_name")
      .eq("slug", subjectKey)
      .single();
    dbSubject = s;
    if (dbSubject) {
      const { data: p } = await supabase
        .from("past_papers")
        .select("year, season")
        .eq("subject_id", dbSubject.id)
        .limit(5000);
      papers = p || [];
    }
  } catch { /* fall through to static */ }

  // Group by year+season
  const groups: Record<string, { year: number; season: string; count: number }> = {};
  for (const p of papers) {
    const key = `${p.year}-${p.season.toLowerCase().replace(/[\/\s]+/g, "-")}`;
    if (!groups[key]) groups[key] = { year: p.year, season: p.season, count: 0 };
    groups[key].count++;
  }

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
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
        ← Back to Home
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{info.icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">
            📄 {board} {info.displayName} Past Papers
          </h1>
          {code && <p className="text-gray-500 mt-1">Code: {code}</p>}
        </div>
      </div>

      {/* Topics grid — always shown */}
      {topics.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/subjects/${subjectSlug}/topics/${topic.slug}`}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">
                    {topic.sort}
                  </span>
                  <div>
                    <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                      {topic.displayName}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">{topic.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past papers by year-season */}
      {entries.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-xl font-bold text-primary-900 mb-4">Past Papers by Exam Season</h2>
          <div className="space-y-4">
            {(() => {
              let lastYear = -1;
              return entries.map(([slug, info]) => {
                const showYear = info.year !== lastYear;
                lastYear = info.year;
                return (
                  <div key={slug}>
                    {showYear && (
                      <h3 className="text-lg font-bold text-primary-900 mt-6 mb-3 flex items-center gap-2">
                        <span className="bg-primary-600 text-white text-sm px-3 py-0.5 rounded-full">{info.year}</span>
                      </h3>
                    )}
                    <Link
                      href={`/past-papers/${subjectSlug}/${slug}`}
                      className="bg-white border rounded-xl p-4 hover:shadow-md hover:border-primary-300 transition-all flex items-center justify-between group"
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
        </div>
      )}

      {/* No topic data at all */}
      {topics.length === 0 && entries.length === 0 && (
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600 mt-8">
          No past papers available yet
        </div>
      )}
    </div>
  );
}
