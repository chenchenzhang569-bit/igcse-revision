"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import WidgetCard from "./WidgetCard";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4", "#8B5CF6"];

type DimInfo = {
  has: number;
  total: number;
  missing: { id: string; name: string; topic: string }[];
};

type PaperDetail = {
  year: number;
  season: string;
  paper_number: string;
};

type SubjectCoverage = {
  subject_name: string;
  total_subtopics: number;
  subtopics: { id: string; name: string; topic: string }[];
  notes: DimInfo;
  practice: DimInfo;
  practice_answer: DimInfo;
  mcq: DimInfo;
  mcq_answer: DimInfo;
  past_paper_qp: number;
  past_paper_mcq_qp: number;
  past_paper_ms: number;
  past_paper_missing_ms: number;
  past_paper_missing_ms_details: PaperDetail[];
  past_paper_missing_qp_details: PaperDetail[];
};

type ApiData = {
  subjects: { id: string; name: string }[];
  coverage: Record<string, SubjectCoverage>;
};

interface Props {
  token: string | null;
  availableSubjects: { id: string; name: string }[];
  onToggle?: () => void;
}

const DIMS = [
  { key: "notes", label: "笔记", icon: "📓" },
  { key: "practice", label: "练习", icon: "✏️" },
  { key: "practice_answer", label: "练习答案", icon: "✅" },
  { key: "mcq", label: "MCQ", icon: "❓" },
  { key: "mcq_answer", label: "MCQ答案", icon: "🔑" },
] as const;

const PP_DIMS = [
  { key: "past_paper_qp", label: "真题 QP", icon: "📄" },
  { key: "past_paper_ms", label: "真题 MS", icon: "📋" },
] as const;

export default function SubjectQAWidget({ token, availableSubjects, onToggle }: Props) {
  const [data, setData] = useState<ApiData | null>(null);
  const [subject, setSubject] = useState("");
  const [dimKey, setDimKey] = useState("all");
  const [showFilter, setShowFilter] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const abort = new AbortController();
    setFetching(true);
    const params = new URLSearchParams();
    if (subject) params.set("subject_id", subject);
    const qs = params.toString();
    const url = `/api/admin/subject-qa${qs ? "?" + qs : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("SubjectQAWidget fetch error:", url, e);
      })
      .finally(() => setFetching(false));
    return () => abort.abort();
  }, [token, subject]);

  const fmt = (n: number) => n.toLocaleString();
  const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0;

  // Get current coverage
  let coverage: SubjectCoverage | null = null;
  let allCoverage: SubjectCoverage[] = [];
  if (data) {
    if (subject) {
      coverage = data.coverage[subject] || null;
    } else {
      allCoverage = Object.values(data.coverage);
    }
  }

  // Build pie/table data
  let distribution: { name: string; count: number }[] = [];

  if (subject && coverage) {
    // Subject selected: show dimension breakdown
    distribution = [
      ...DIMS.map(d => ({ name: d.label, count: coverage![d.key as keyof SubjectCoverage] as DimInfo ? (coverage![d.key as keyof SubjectCoverage] as DimInfo).has : 0 })),
      { name: "真题 QP", count: coverage.past_paper_qp },
      { name: "真题 MS", count: coverage.past_paper_ms },
    ].filter(d => d.count > 0);
  } else if (dimKey !== "all" && !subject) {
    // Dimension selected, no subject: show by subject
    const dimKeyStr = dimKey;
    if (dimKeyStr.startsWith("past_paper")) {
      for (const c of allCoverage) {
        const v = dimKeyStr === "past_paper_qp" ? c.past_paper_qp : c.past_paper_ms;
        if (v > 0) distribution.push({ name: c.subject_name, count: v });
      }
    } else {
      for (const c of allCoverage) {
        const dim = c[dimKeyStr as keyof SubjectCoverage] as DimInfo;
        if (dim && dim.has > 0) distribution.push({ name: c.subject_name, count: dim.has });
      }
    }
  } else {
    // All dimensions, no subject: show total by subject
    for (const c of allCoverage) {
      let total = 0;
      for (const d of DIMS) {
        const dim = c[d.key as keyof SubjectCoverage] as DimInfo;
        if (dim) total += dim.has;
      }
      total += c.past_paper_qp + c.past_paper_ms;
      if (total > 0) distribution.push({ name: c.subject_name, count: total });
    }
  }

  const dimColors: Record<string, string> = {
    notes: COLORS[0],
    practice: COLORS[1],
    practice_answer: COLORS[2],
    mcq: COLORS[3],
    mcq_answer: COLORS[4],
  };

  return (
    <WidgetCard title="📊 题库覆盖" defaultView="card" views={["card", "pie", "table"]}
      widgetId="qa" onToggle={onToggle ? () => onToggle() : undefined}>
      {(view) => (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => setShowFilter(!showFilter)}
              className="text-xs text-gray-400 hover:text-primary-600">
              {showFilter ? "隐藏筛选 ▲" : "显示筛选 ▼"}
            </button>
          </div>

          {showFilter && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <select value={subject} onChange={(e) => { setSubject(e.target.value); setExpandedDim(null); }}
                className="text-xs border rounded px-2 py-1 bg-white text-gray-600">
                <option value="">📚 全部科目（共 {availableSubjects.length} 科）</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {!subject && (
                <div className="flex gap-0.5 bg-gray-100 rounded p-0.5 flex-wrap">
                  <button onClick={() => setDimKey("all")}
                    className={`text-xs px-2 py-0.5 rounded transition ${dimKey === "all" ? "bg-white text-primary-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>全部</button>
                  {[...DIMS, ...PP_DIMS].map(d => (
                    <button key={d.key} onClick={() => setDimKey(d.key)}
                      className={`text-xs px-2 py-0.5 rounded transition ${dimKey === d.key ? "bg-white text-primary-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              )}
              {(subject || dimKey !== "all") && (
                <button onClick={() => { setSubject(""); setDimKey("all"); setExpandedDim(null); }}
                  className="text-xs text-gray-400 hover:text-primary-600">重置</button>
              )}
            </div>
          )}

          {fetching ? (
            <div className="text-center text-gray-400 text-sm py-4">加载中...</div>
          ) : !data ? (
            <div className="text-center text-gray-400 text-sm py-4">无数据</div>
          ) : view === "pie" ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={distribution} dataKey="count" nameKey="name"
                  cx="50%" cy="50%" outerRadius={90}
                  label={({ name, count }: any) => `${name.slice(0, 10)} ${count}`}>
                  {distribution.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : view === "table" ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400"><th>科目/维度</th><th className="text-right">数量</th></tr></thead>
              <tbody>
                {distribution.slice(0, 15).map((d) => (
                  <tr key={d.name} className="border-t">
                    <td className="py-1.5 truncate max-w-[200px]">{d.name}</td>
                    <td className="text-right font-semibold">{fmt(d.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Card view
            <div>
              {subject && coverage ? (
                <div>
                  <div className="text-center text-sm text-gray-500 mb-3">
                    共 <span className="font-bold text-primary-900">{coverage.total_subtopics}</span> 个 Subtopics
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DIMS.map((d) => {
                      const dim = coverage[d.key as keyof SubjectCoverage] as DimInfo;
                      if (!dim) return null;
                      const isMissing = dim.has < dim.total;
                      const color = dim.has === 0 ? "bg-red-50 border-red-200" : dim.has < dim.total ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200";
                      const isOpen = expandedDim === d.key;
                      return (
                        <div key={d.key} className={`rounded-lg border p-3 ${color}`}>
                          <button onClick={() => setExpandedDim(isOpen ? null : d.key)}
                            className="w-full flex items-center justify-between text-left">
                            <span className="text-sm font-medium">
                              {d.icon} {d.label}
                            </span>
                            <span className="text-sm font-bold">
                              {dim.has}/{dim.total}
                              <span className="text-xs text-gray-400 ml-1">({pct(dim.has, dim.total)}%)</span>
                            </span>
                          </button>
                          {isOpen && dim.missing.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">缺 {dim.label} 的 Subtopic:</p>
                              {dim.missing.map(m => (
                                <a key={m.id}
                                  href={`/admin/upload?subject_id=${subject}&subtopic_id=${m.id}`}
                                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/50 text-xs text-gray-600"
                                >
                                  <span className="truncate">{m.topic} → {m.name}</span>
                                  <span className="text-gray-300 ml-1">→</span>
                                </a>
                              ))}
                            </div>
                          )}
                          {isOpen && dim.missing.length === 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-green-600">
                              ✅ 全部 {dim.total} 个 Subtopic 都有 {d.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Past paper stats - expandable with missing paper details */}
                  <div className="grid grid-cols-1 gap-2 mt-3">
                    {[
                      {
                        key: "past_paper_qp" as const,
                        label: "真题 QP",
                        icon: "📄",
                        count: coverage.past_paper_qp,
                        total: coverage.past_paper_qp,
                        // QP行展开显示缺MS的QP
                        missingDetails: coverage.past_paper_missing_ms_details || [],
                        missingLabel: "缺 MS",
                        hint: "（有QP但缺对应MS）",
                      },
                      {
                        key: "past_paper_ms" as const,
                        label: "真题 MS",
                        icon: "📋",
                        count: coverage.past_paper_ms,
                        total: coverage.past_paper_qp,
                        // MS行展开显示缺QP的MS
                        missingDetails: coverage.past_paper_missing_qp_details || [],
                        missingLabel: "缺 QP",
                        hint: "（有MS但缺对应QP）",
                      },
                    ].map((d) => {
                      const actualMissing = d.total - d.count;
                      const hasMissing = actualMissing > 0;
                      const details = d.missingDetails;
                      const color = d.count === 0 ? "bg-red-50 border-red-200" : hasMissing ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200";
                      const isOpen = expandedDim === d.key;
                      return (
                        <div key={d.key} className={`rounded-lg border p-3 ${color}`}>
                          <button onClick={() => setExpandedDim(isOpen ? null : d.key)}
                            className="w-full flex items-center justify-between text-left">
                            <span className="text-sm font-medium">
                              {d.icon} {d.label}
                            </span>
                            <span className="text-sm font-bold">
                              {fmt(d.count)}
                              {hasMissing && <span className="text-xs text-red-500 ml-1">(缺 {details.length})</span>}
                            </span>
                          </button>
                          {isOpen && details.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">{d.missingLabel} {d.hint}:</p>
                              {details.map((p: PaperDetail, i: number) => (
                                <div key={i}
                                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/50 text-xs text-gray-600"
                                >
                                  <span>{p.year} {p.season} Paper {p.paper_number}</span>
                                  <a href={`/admin/upload?subject_id=${subject}`}
                                    className="text-primary-600 hover:underline ml-2"
                                  >上传</a>
                                </div>
                              ))}
                            </div>
                          )}
                          {isOpen && details.length === 0 && !hasMissing && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-green-600">
                              ✅ 全部配合齐全
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg mb-3">
                    <div className="text-2xl font-bold text-primary-900">{fmt(Object.keys(data.coverage).length)}</div>
                    <div className="text-xs text-gray-500">有 Subtopics 的学科</div>
                  </div>
                  <div className="text-center text-xs text-gray-400">选一个科目查看详情</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
