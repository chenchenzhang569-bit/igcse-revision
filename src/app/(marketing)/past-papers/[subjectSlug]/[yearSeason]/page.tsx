import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const supabase = getSupabaseClient();

const DATA: Record<string, { board: string; code: string; name: string; icon: string }> = {
  "caie-physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️" },
  "caie-chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪" },
  "caie-biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬" },
  "caie-mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐" },
  "caie-additional-mathematics-0606": { board: "CAIE", code: "0606", name: "Additional Mathematics", icon: "📊" },
  "edexcel-physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️" },
  "edexcel-chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪" },
  "edexcel-biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬" },
  "edexcel-mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐" },
};

type PastPaper = { id: string; title: string; year: number; season: string; paper_number: number; paper_type: string; file_url: string };

function getSeasonFromSlug(slug: string): string {
  const map: Record<string, string> = {
    march: "Mar", mar: "Mar", "feb-march": "Feb/Mar", "feb-mar": "Feb/Mar",
    "may-june": "May/Jun", "may-jun": "May/Jun", jun: "Jun", summer: "Summer",
    "oct-nov": "Oct/Nov", nov: "Nov",
    "n-a": "N/A", topic: "Topic",
  };
  return map[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function PastPapersSeasonPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; yearSeason: string }>;
}) {
  const { subjectSlug, yearSeason } = await params;
  const subjInfo = DATA[subjectSlug];
  if (!subjInfo) notFound();

  const parts = yearSeason.split("-");
  const year = parseInt(parts[0]);
  const seasonSlug = parts.slice(1).join("-");
  const season = getSeasonFromSlug(seasonSlug);
  if (isNaN(year)) notFound();

  let pairs: { paper_number: number; qp: PastPaper | null; ms: PastPaper | null }[] = [];

  try {
    let subjectId: string | null = null;
    const slugs = [subjectSlug, subjectSlug.split("-")[1] || "physics", subjInfo.name.toLowerCase()];
    for (const s of slugs) {
      const { data } = await supabase.from("subjects").select("id").eq("slug", s);
      if (data && data.length > 0) { subjectId = data[0].id; break; }
    }
    if (!subjectId && subjInfo.code) {
      const { data } = await supabase.from("subjects").select("id").eq("code", subjInfo.code);
      if (data && data.length > 0) subjectId = data[0].id;
    }

    if (subjectId) {
      const { data: papers } = await supabase
        .from("past_papers")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("year", year)
        .eq("season", season)
        .order("paper_number")
        .limit(500);

      if (papers && papers.length > 0) {
        const pairMap = new Map<number, { qp: PastPaper | null; ms: PastPaper | null }>();
        for (const p of papers as PastPaper[]) {
          const n = p.paper_number;
          if (!pairMap.has(n)) pairMap.set(n, { qp: null, ms: null });
          const entry = pairMap.get(n)!;
          const pt = (p.paper_type || "").toLowerCase();
          if (pt.includes("question") || pt.endsWith("qp")) entry.qp = p;
          else if (pt.includes("mark") || pt.endsWith("ms")) entry.ms = p;
          else entry.qp = p;
        }
        pairs = [...pairMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([num, val]) => ({ paper_number: num, ...val }));
      }
    }
  } catch { /* empty */ }

  const { board, code, name, icon } = subjInfo;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary-600">{name}</Link>
        <span>/</span>
        <Link href={`/past-papers/${subjectSlug}`} className="hover:text-primary-600">Past Papers</Link>
        <span>/</span>
        <span className="text-gray-600">{year} {season}</span>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">{board} {name} — {year} {season}</h1>
          <p className="text-gray-500 mt-1">Code: {code} · {pairs.length} paper pairs</p>
        </div>
      </div>

      {pairs.length > 0 ? (
        <section className="mt-8 space-y-3">
          {pairs.map(({ paper_number, qp, ms }) => (
            <div key={paper_number} className="bg-white border rounded-xl p-4 sm:p-5 hover:shadow-sm transition flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-primary-900">Paper {paper_number}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{qp?.title || ms?.title || ""}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {qp && (
                  <a href={qp.file_url} target="_blank" rel="noopener noreferrer"
                    className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-primary-700 transition whitespace-nowrap">
                    📄 QP
                  </a>
                )}
                {ms && (
                  <a href={ms.file_url} target="_blank" rel="noopener noreferrer"
                    className="bg-accent-500 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-accent-600 transition whitespace-nowrap">
                    📝 MS
                  </a>
                )}
                {!qp && !ms && <span className="text-xs text-gray-400">No files</span>}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="mt-8 bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">No papers found for {year} {season}</p>
          <Link href={`/past-papers/${subjectSlug}`} className="text-primary-600 text-sm mt-2 inline-block">← Back to season list</Link>
        </div>
      )}
    </div>
  );
}
