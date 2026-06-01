"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import WidgetCard from "./WidgetCard";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4"];

type QData = {
  question_distribution: { name: string; count: number }[];
  db_quality: { total_questions: number; subjects_with_questions: number };
};

interface Props {
  token: string | null;
  availableSubjects: { id: string; name: string }[];
  onToggle?: () => void;
}

export default function QuestionDistWidget({ token, availableSubjects, onToggle }: Props) {
  const [data, setData] = useState<QData | null>(null);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("all");
  const [showFilter, setShowFilter] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchUrl, setFetchUrl] = useState("");

  useEffect(() => {
    if (!token) return;
    const abort = new AbortController();
    setFetching(true);
    setFetchUrl("");
    const params = new URLSearchParams();
    if (subject) params.set("subject_id", subject);
    if (type !== "all") params.set("type", type);
    const qs = params.toString();
    const url = `/api/admin/dashboard${qs ? "?" + qs : ""}`;
    setFetchUrl(url);
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) { throw new Error(`HTTP ${r.status}`); }
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("QDistWidget fetch error:", url, e);
      })
      .finally(() => setFetching(false));
    return () => abort.abort();
  }, [token, subject, type]);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <WidgetCard title="🗂️ 题目分布" defaultView="pie" views={["pie", "card", "table"]}
      widgetId="questions" onToggle={onToggle ? () => onToggle() : undefined}>
      {(view) => (
        <div>
          {/* Filter toggle */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="text-xs text-gray-400 hover:text-primary-600"
            >
              {showFilter ? "隐藏筛选 ▲" : "显示筛选 ▼"}
            </button>
          </div>

          {/* Filter controls */}
          {showFilter && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white text-gray-600"
              >
                <option value="">📚 全部科目</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="flex gap-0.5 bg-gray-100 rounded p-0.5">
                {(["all", "questions", "mock_exam", "mcq"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`text-xs px-2 py-0.5 rounded transition ${
                      type === t ? "bg-white text-primary-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {{ all: "全部", questions: "练习", mock_exam: "模拟考", mcq: "MCQ" }[t]}
                  </button>
                ))}
              </div>
              {(subject || type !== "all") && (
                <button onClick={() => { setSubject(""); setType("all"); }} className="text-xs text-gray-400 hover:text-primary-600">重置</button>
              )}
            </div>
          )}

          {/* Data display */}
          {fetching ? (
            <div className="text-center text-gray-400 text-sm py-4">加载中...</div>
          ) : !data ? (
            <div className="text-center text-gray-400 text-sm py-4">无数据{fetchUrl && ` (${fetchUrl})`}</div>
          ) : view === "pie" ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.question_distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={({ name, count }: any) => `${name.slice(0, 8)} ${count}`}
                  >
                    {data.question_distribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-900">{fmt(data.db_quality.total_questions)}</div>
                  <div className="text-xs text-gray-400">总数</div>
                </div>
              </div>
            </div>
          ) : view === "table" ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400"><th>科目</th><th className="text-right">题目数</th></tr></thead>
              <tbody>
                {data.question_distribution.slice(0, 15).map((q) => (
                  <tr key={q.name} className="border-t">
                    <td className="py-1.5 truncate max-w-[200px]">{q.name}</td>
                    <td className="text-right font-semibold">{fmt(q.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-900">{fmt(data.db_quality.total_questions)}</div>
              <div className="text-xs text-gray-500">{data.db_quality.subjects_with_questions} 科有题目</div>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
