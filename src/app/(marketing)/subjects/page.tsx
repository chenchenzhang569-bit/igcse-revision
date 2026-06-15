"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useT } from "@/lib/i18n/LanguageContext";


interface Subject {
  slug: string;
  display_name: string;
  name: string;
  board: string;
  code: string;
  icon: string;
  price: string;
  originalPrice: string;
  id: string;
}

interface SubjectStats {
  past_papers: number;
  notes: number;
  questions: number;
  mock_exams: number;
}

interface SubjectStatsRow {
  subject_id: string;
  past_paper_qp_count: number;
  notes: number;
  questions: number;
  r2_questions: number;
  mock_exams: number;
  r2_mock_exams: number;
}

export default function SubjectsPage() {
  const t = useT();
  const hideEdexcel = process.env.NEXT_PUBLIC_HIDE_EDEXCEL === "true";
  const boards: ("CAIE" | "Edexcel")[] = hideEdexcel ? ["CAIE"] : ["CAIE", "Edexcel"];
  const [activeBoard, setActiveBoard] = useState<"CAIE" | "Edexcel">("CAIE");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Record<string, SubjectStats>>({});

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("subjects")
      .select("id, slug, display_name, name, code, icon, price_cny")
      .eq("is_published", true)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) { console.error("Subjects fetch error:", error); return; }
        if (Array.isArray(data)) {
          setSubjects(
            data.map((s: any) => ({
              id: s.id,
              slug: s.slug,
              display_name: s.display_name || s.name,
              name: s.name,
              board: s.slug?.startsWith("edexcel") ? "Edexcel" : "CAIE",
              code: s.code || "",
              icon: s.icon || "📚",
              price: s.price_cny ? `¥${(s.price_cny / 100).toFixed(0)}` : "¥50",
              originalPrice: s.price_cny ? `¥${(s.price_cny / 100 * 2).toFixed(0)}` : "¥100",
            }))
          );
        }
      })
      .catch((err) => { console.error("Subjects fetch exception:", err); });

    // Fetch stats from subject_stats table
    supabase
      .from("subject_stats")
      .select("*")
      .then(({ data, error }) => {
        if (error) { console.error("Stats fetch error:", error); return; }
        if (Array.isArray(data)) {
          const statsMap: Record<string, SubjectStats> = {};
          const rows = data as SubjectStatsRow[];
          for (const row of rows) {
            statsMap[row.subject_id] = {
              past_papers: row.past_paper_qp_count,
              notes: row.notes,
              questions: row.questions + (row.r2_questions || 0),
              mock_exams: row.mock_exams + (row.r2_mock_exams || 0),
            };
          }
          setStats(statsMap);
        }
      })
      .catch((err) => { console.error("Stats fetch exception:", err); });
  }, []);

  const filtered = subjects.filter((s) => s.board === activeBoard);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">{t("subjects", "title")}</h1>
        <p className="text-gray-500 text-lg">CAIE &amp; Edexcel IGCSE</p>
      </div>

      {/* Board Tabs */}
      <div className="flex justify-center gap-2 mb-10">
        {boards.map((board) => (
          <button
            key={board}
            onClick={() => setActiveBoard(board)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeBoard === board
                ? "bg-primary-900 text-white shadow-md"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {board}
            <span className="ml-1.5 text-xs opacity-70">
              ({subjects.filter((s) => s.board === board).length})
            </span>
          </button>
        ))}
      </div>

      {/* Subject Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filtered.map((s) => (
            <Link
              key={s.slug}
              href={`/subjects/${s.slug}?board=${s.board}`}
              className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-8 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-4 min-w-0">
                  <span className="text-3xl shrink-0">{s.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-semibold">
                        {s.board}
                      </span>
                      <span className="text-xs text-gray-400">{s.code}</span>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition">
                      {s.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{s.name}</p>
                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="text-accent-500 font-bold text-lg">{s.price}</span>
                      <span className="text-sm text-gray-400 line-through">{s.originalPrice}</span>
                    </div>
                  </div>
                </div>
                {/* Stats — right-aligned vertical stack */}
                {stats[s.id] && (
                  <div className="shrink-0 text-right leading-relaxed pt-0.5 text-sm">
                    <div><span className="font-semibold text-gray-700">{stats[s.id].past_papers}</span><span className="text-xs text-gray-400 ml-1">{t("stats", "pastPapers")}</span></div>
                    <div><span className="font-semibold text-gray-700">{stats[s.id].notes}</span><span className="text-xs text-gray-400 ml-1">{t("stats", "topicNotes")}</span></div>
                    <div><span className="font-semibold text-gray-700">{stats[s.id].questions.toLocaleString()}</span><span className="text-xs text-gray-400 ml-1">{t("stats", "onlineQuestions")}</span></div>
                    <div><span className="font-semibold text-gray-700">{stats[s.id].mock_exams}</span><span className="text-xs text-gray-400 ml-1">{t("stats", "mockExams")}</span></div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 py-12">No subjects found for {activeBoard}</p>
      )}

      {/* CTA */}
      <div className="text-center mt-16 pt-12 border-t">
        <p className="text-gray-500 mb-4">{t("pricing", "featureAllBoards")}</p>
        <Link
          href="/pricing"
          className="inline-block bg-accent-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent-600 transition"
        >
          {t("common", "startNow")} →
        </Link>
      </div>
    </div>
  );
}
