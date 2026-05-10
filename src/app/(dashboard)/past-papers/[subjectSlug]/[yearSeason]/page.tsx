import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type PastPaper = {
  id: string;
  title: string;
  year: number;
  season: string;
  paper_number: number;
  paper_type: string;
  file_url: string;
};

function getSeasonFromSlug(slug: string): string {
  const map: Record<string, string> = {
    "march": "Mar", "mar": "Mar",
    "feb-march": "Feb/Mar", "feb-mar": "Feb/Mar",
    "may-june": "May/Jun", "may-jun": "May/Jun",
    "jun": "Jun",
    "oct-nov": "Oct/Nov", "nov": "Nov",
  };
  return map[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function shortTitle(title: string): string {
  const match = title.match(/Paper\s+\d+/i);
  return match ? match[0] : title;
}

export default async function PastPapersSeasonPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; yearSeason: string }>;
}) {
  const { subjectSlug, yearSeason } = await params;
  const supabase = createClient();

  const parts = yearSeason.split("-");
  const year = parseInt(parts[0]);
  const seasonSlug = parts.slice(1).join("-");
  const season = getSeasonFromSlug(seasonSlug);

  if (isNaN(year)) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, display_name")
    .eq("slug", subjectSlug)
    .single();

  if (!subject) notFound();

  const subj = subject as any;

  const { data: papers = [] } = await supabase
    .from("past_papers")
    .select("*")
    .eq("subject_id", subj.id)
    .eq("year", year)
    .eq("season", season)
    .order("paper_number")
    .limit(500);

  // Pair QP + MS
  const pairMap = new Map<number, { qp: PastPaper | null; ms: PastPaper | null }>();
  for (const p of papers as PastPaper[]) {
    const n = p.paper_number;
    if (!pairMap.has(n)) pairMap.set(n, { qp: null, ms: null });
    const entry = pairMap.get(n)!;
    if (p.paper_type === "Question Paper") entry.qp = p;
    else if (p.paper_type === "Mark Scheme") entry.ms = p;
  }

  const pairs = [...pairMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([num, { qp, ms }]) => ({ paper_number: num, qp, ms }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">仪表盘</Link>
        {" / "}
        <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary-600">{subj.display_name}</Link>
        {" / "}
        <Link href={`/past-papers/${subjectSlug}`} className="hover:text-primary-600">历年真题</Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">
        <span className="bg-primary-600 text-white text-lg px-3 py-1 rounded-full mr-2 align-middle">{year}</span>
        📅 {season}
      </h1>

      {pairs.length === 0 ? (
        <div className="bg-yellow-50 border rounded-xl p-6 text-center text-yellow-700">暂无试卷</div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair, i) => (
            <div key={pair.paper_number} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium mr-2">
                    Q{i + 1}
                  </span>
                  <span className="text-sm text-gray-700">
                    {pair.qp ? shortTitle(pair.qp.title) : `Paper ${pair.paper_number}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  {pair.qp && (
                    <a
                      href={pair.qp.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition"
                    >
                      📄 题目
                    </a>
                  )}
                  {pair.ms && pair.ms.id !== pair.qp?.id && (
                    <a
                      href={pair.ms.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition"
                    >
                      📝 答案
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
