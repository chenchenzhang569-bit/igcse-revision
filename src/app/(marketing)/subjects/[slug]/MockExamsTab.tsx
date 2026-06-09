"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";

const supabase = getSupabaseClient();

// R2 subject config: subjects whose mock data is stored in R2 JSON, not in DB
const R2_SUBJECTS: Record<string, { key: string; slug: string }> = {
  "edexcel-biology-4bi1": { key: "edexcel-biology-4bi1", slug: "edexcel-biology-4bi1" },
  "edexcel-chemistry-4ch1": { key: "edexcel-chemistry-4ch1", slug: "edexcel-chemistry-4ch1" },
  "edexcel-physics-4ph1": { key: "edexcel-physics-4ph1", slug: "edexcel-physics-4ph1" },
};

const TIER_COLORS: Record<string, string> = {
  Core: "bg-blue-50 border-blue-200 text-blue-700",
  Extended: "bg-purple-50 border-purple-200 text-purple-700",
};

const PAPER_ICONS: Record<string, string> = {
  MCQ: "📋",
  Theory: "📝",
  Practical: "🔬",
};

const CS_SET_LABELS: Record<number, string> = {
  11: "Set A · Paper 1",
  12: "Set A · Paper 2",
  21: "Set B · Paper 1",
  22: "Set B · Paper 2",
  31: "Set C · Paper 1",
  32: "Set C · Paper 2",
};

type SetData = {
  id: string;
  set_number: number;
  tier: string;
  slug: string;
  papers: PaperData[];
};

type PaperData = {
  id: string;
  paper_type: string;
  paper_number: string;
  minutes: number;
  total_marks: number;
  slug: string;
  questionCount: number;
  pdf_url?: string;
};

export function MockExamsTab({
  subjectKey,
  subjectSlug,
  board,
}: {
  subjectKey: string;
  subjectSlug: string;
  board: string;
}) {
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Check if this is an R2-based subject (mock data stored in R2 JSON)
        const r2Config = R2_SUBJECTS[subjectSlug];
        if (r2Config) {
          // Fetch from R2 JSON api route
          const res = await fetch(`/api/r2/json/${r2Config.slug}`);
          if (res.ok) {
            const allQuestions = await res.json();
            // Determine subject-specific slug prefix and paper patterns
            const subjPrefix = subjectSlug === "edexcel-chemistry-4ch1" ? "edexcel-chemistry-" : subjectSlug === "edexcel-physics-4ph1" ? "edexcel-physics-" : "edexcel-biology-";
            const hasPaper1c = allQuestions.some((q: any) => q.paper === "paper-1c");
            // Group into sets and papers
            const setMap: Record<string, any> = {};
            const paperMap: Record<string, any[]> = {};
            for (const q of allQuestions) {
              const setKey = q.set;
              const paperKey = `${q.set}-${q.paper}`;
              if (!setMap[setKey]) {
                const slugPart = q.set.split("-")[1];
                const setNum = parseInt(slugPart) || (slugPart ? slugPart.charCodeAt(0) - 96 : 1);
                setMap[setKey] = { id: setKey, set_number: setNum, tier: "Extended", slug: q.set, papers: [] };
              }
              if (!paperMap[paperKey]) {
                paperMap[paperKey] = [];
              }
              paperMap[paperKey].push(q);
            }
            // Build set list with paper data
            const setList: SetData[] = Object.values(setMap).map((s: any) => {
              const papers: PaperData[] = [];
              for (const [pk, qs] of Object.entries(paperMap)) {
                if (pk.startsWith(s.slug)) {
                  const isPaper1c = pk.includes("paper-1c");
                  const isPaper1b = pk.includes("paper-1b");
                  const isPaper1p = pk.includes("paper-1p");
                  const paperNum = isPaper1c ? "1C" : (isPaper1b ? "1B" : (isPaper1p ? "1P" : "2P"));
                  const paperMins = (isPaper1c || isPaper1b || isPaper1p) ? 120 : 75;
                  papers.push({
                    id: pk,
                    paper_type: "Theory",
                    paper_number: paperNum,
                    minutes: paperMins,
                    total_marks: (qs as any[]).reduce((sum: number, q: any) => sum + (q.marks || 0), 0),
                    slug: `${subjPrefix}${pk}`,
                    questionCount: (qs as any[]).length,
                  });
                }
              }
              return { ...s, papers };
            });
            setSets(setList.sort((a: any, b: any) => a.set_number - b.set_number));
            setLoading(false);
            return;
          }
        }

        // Fallback to DB-based fetch for CAIE subjects
        const { data: setRows, error: setErr } = await supabase
          .from("mock_exam_sets")
          .select("id, set_number, tier, slug")
          .eq("subject", subjectKey)
          .eq("board", board)
          .order("set_number");

        if (setErr) { setError(setErr.message); setLoading(false); return; }
        if (!setRows || setRows.length === 0) { setLoading(false); return; }

        // Fetch papers
        const setIds = setRows.map((s: any) => s.id);
        const { data: paperRows, error: paperErr } = await supabase
          .from("mock_exam_papers")
          .select("id, set_id, paper_type, paper_number, minutes, total_marks, slug, pdf_url")
          .in("set_id", setIds)
          .order("paper_type");

        if (paperErr) { setError(paperErr.message); setLoading(false); return; }

        // Count questions
        const paperIds = paperRows?.map((p: any) => p.id) || [];
        const { data: qRows } = await supabase
          .from("mock_exam_questions")
          .select("paper_id")
          .in("paper_id", paperIds);

        const countMap: Record<string, number> = {};
        if (qRows) {
          for (const q of qRows as any[]) {
            countMap[q.paper_id] = (countMap[q.paper_id] || 0) + 1;
          }
        }

        // Group papers by set
        const papersBySet: Record<string, PaperData[]> = {};
        if (paperRows) {
          for (const p of paperRows as any[]) {
            if (!papersBySet[p.set_id]) papersBySet[p.set_id] = [];
            papersBySet[p.set_id].push({
              ...p,
              questionCount: countMap[p.id] || 0,
            });
          }
        }

        setSets(
          setRows.map((s: any) => ({
            ...s,
            papers: papersBySet[s.id] || [],
          }))
        );
      } catch (e: any) {
        setError(e.message || "Fetch error");
      }
      setLoading(false);
    })();
  }, [subjectKey]);

  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold text-primary-900 mb-4">📝 Mock Exams</h2>

      {loading && (
        <p className="text-gray-400 py-8 text-center">Loading mock exams...</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && sets.length === 0 && (
        <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">Mock exams coming soon</p>
        </div>
      )}

      {sets.length > 0 && (() => {
          const isCS = subjectKey === "computer-science";

          if (isCS) {
            // Group CS sets by tens digit: 11,12→A | 21,22→B | 31,32→C
            const csGroups: Record<number, SetData[]> = {};
            for (const s of sets) {
              const g = Math.floor(s.set_number / 10);
              if (!csGroups[g]) csGroups[g] = [];
              csGroups[g].push(s);
            }
            const csLabels: Record<number, string> = { 1: "Set A", 2: "Set B", 3: "Set C" };

            return (
              <div className="space-y-5">
                {Object.entries(csGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([gKey, gSets]) => {
                  const label = csLabels[Number(gKey)] || `Group ${gKey}`;
                  const allPapers = gSets.flatMap(s => s.papers);
                  const totalQs = allPapers.reduce((sum, p) => sum + p.questionCount, 0);
                  return (
                    <div key={gKey} className="bg-white border rounded-xl overflow-hidden">
                      <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-800">{label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 border-blue-200 text-blue-700">Core</span>
                        </div>
                        <span className="text-sm text-gray-400">{totalQs} questions</span>
                      </div>
                      <div className="divide-y">
                        {allPapers.map((paper) => (
                          <Link
                            key={paper.id}
                            href={`/mock-exams/${subjectSlug}/${paper.slug}`}
                            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{PAPER_ICONS[paper.paper_type] || "📄"}</span>
                              <div>
                                <span className="font-medium text-gray-800 group-hover:text-primary-600 transition">
                                  {CS_SET_LABELS[gSets.find(s => s.id === paper.set_id)?.set_number || 0] || paper.paper_number}
                                </span>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {paper.minutes} min · {paper.total_marks} marks · {paper.questionCount} questions
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                                Start →
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Non-CS: original rendering (maths grouping, clickable paper links)
          const syllabusNames: Record<string, string> = {
            "0580": "CIE Math 0580",
            "0607": "International Math 0607",
            "0606": "Additional Math 0606",
          };
          const grouped: Record<string, SetData[]> = {};
          for (const s of sets) {
            const prefix = s.slug.split("-")[0];
            const key = syllabusNames[prefix] ? prefix : "_default";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(s);
          }
          const groupOrder = Object.keys(grouped).filter(k => k !== "_default");
          const defaultGroup = grouped["_default"] || [];
          const allGroups = [...groupOrder.map(k => ({ key: k, sets: grouped[k] })), ...(defaultGroup.length > 0 ? [{ key: "_default", sets: defaultGroup }] : [])];
          
          return (
            <div className="space-y-8">
              {allGroups.map(group => (
                <div key={group.key}>
                  {group.key !== "_default" && (
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 ml-1">
                      {syllabusNames[group.key] || group.key}
                    </h3>
                  )}
                  <div className="space-y-5">
                    {group.sets.map((set) => (
            <div key={set.id} className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">Set {set.set_number}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      TIER_COLORS[set.tier] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {set.tier}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {set.papers.reduce((sum, p) => sum + p.questionCount, 0)} questions
                </span>
              </div>
              <div className="divide-y">
                {set.papers.map((paper) => (
                  <Link
                    key={paper.id}
                    href={`/mock-exams/${subjectSlug}/${paper.slug}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{PAPER_ICONS[paper.paper_type] || "📄"}</span>
                      <div>
                        <span className="font-medium text-gray-800 group-hover:text-primary-600 transition">
                          {paper.paper_number} — {paper.paper_type}
                        </span>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {paper.minutes} min · {paper.total_marks} marks · {paper.questionCount} questions
                        </div>
                      </div>
                    </div>
                    <span className="text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                      Start →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
    </section>
  );
}
