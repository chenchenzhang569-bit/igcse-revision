"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";

const supabase = getSupabaseClient();

export function PastPapersTab({
  subjectId,
  slug,
  board,
  name,
  code,
  icon,
  subjectKey,
}: {
  subjectId: string | null;
  slug: string;
  board: string;
  name: string;
  code: string;
  icon: string;
  subjectKey: string;
}) {
  const [papers, setPapers] = useState<{ key: string; year: number; season: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!subjectId) { setError("Subject not found in database — run SQL migration first"); setLoading(false); return; }

    (async () => {
      try {
        const { data: raw, error: qerr } = await supabase
          .from("past_papers")
          .select("year, season")
          .eq("subject_id", subjectId)
          .limit(5000);

        if (qerr) { setError(qerr.message); setLoading(false); return; }
        if (!raw || raw.length === 0) { setError("No papers in database yet"); setLoading(false); return; }

        const groups: Record<string, { year: number; season: string; count: number }> = {};
        for (const p of raw) {
          const k = `${p.year}-${p.season.toLowerCase().replace(/[\\/\s]+/g, "-")}`;
          if (!groups[k]) groups[k] = { year: p.year, season: p.season, count: 0 };
          groups[k].count++;
        }
        const seo = (s: string) =>
          s.includes("Mar") || s.includes("Feb") ? 1
          : s.includes("May") || s.includes("Jun") ? 2
          : s.includes("Oct") || s.includes("Nov") ? 3 : 9;
        setPapers(Object.entries(groups)
          .sort((a, b) => b[1].year - a[1].year || seo(a[1].season) - seo(b[1].season))
          .map(([key, info]) => ({ key, ...info })));
      } catch (e: any) { setError(e.message || "Fetch error"); }
      setLoading(false);
    })();
  }, [subjectId, slug]);

  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold text-primary-900 mb-4">📄 Past Papers</h2>
      {loading && <p className="text-gray-400 py-8 text-center">Loading past papers...</p>}
      {error && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">⚠ {error}</div>}
      {papers.length > 0 && (
        <div className="space-y-3">
          {(() => {
            let lastYear = -1;
            return papers.map((item) => {
              const showYear = item.year !== lastYear;
              lastYear = item.year;
              return (
                <div key={item.key}>
                  {showYear && (
                    <h3 className="text-lg font-bold text-primary-900 mt-6 mb-3">
                      <span className="bg-primary-600 text-white text-sm px-3 py-0.5 rounded-full">{item.year}</span>
                    </h3>
                  )}
                  <Link href={`/past-papers/${slug}/${item.key}`}
                    className="bg-white border rounded-xl p-4 hover:shadow-md hover:border-primary-300 transition-all flex items-center justify-between group">
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-primary-600">📅 {item.season}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.count} papers</span>
                      <span className="text-gray-300 group-hover:text-primary-500">→</span>
                    </div>
                  </Link>
                </div>
              );
            });
          })()}
        </div>
      )}
    </section>
  );
}
