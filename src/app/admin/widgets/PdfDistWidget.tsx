"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import WidgetCard from "./WidgetCard";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4", "#8B5CF6"];

type PdfData = {
  total_pdfs: number;
  pdf_distribution: { name: string; count: number }[];
  breakdown: { qp: number; mcq_qp: number; ms: number; notes: number; mock: number };
  missing_ms: number;
};

interface Props {
  token: string | null;
  availableSubjects: { id: string; name: string }[];
  onToggle?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  all: "全部",
  qp: "题目卷",
  mcq: "MCQ卷",
  ms: "评分方案",
  notes: "笔记",
  mock_exam: "模拟考",
};

export default function PdfDistWidget({ token, availableSubjects, onToggle }: Props) {
  const [data, setData] = useState<PdfData | null>(null);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("all");
  const [showFilter, setShowFilter] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!token) return;
    const abort = new AbortController();
    setFetching(true);
    const params = new URLSearchParams();
    if (subject) params.set("subject_id", subject);
    if (type !== "all") params.set("type", type);
    const qs = params.toString();
    const url = `/api/admin/pdf-stats${qs ? "?" + qs : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("PdfDistWidget fetch error:", url, e);
      })
      .finally(() => setFetching(false));
    return () => abort.abort();
  }, [token, subject, type]);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <WidgetCard title="📄 PDF 统计" defaultView="card" views={["card", "pie", "table"]}
      widgetId="pdfs" onToggle={onToggle ? () => onToggle() : undefined}>
      {(view) => (
        <div>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="text-xs text-gray-400 hover:text-primary-600"
            >
              {showFilter ? "隐藏筛选 ▲" : "显示筛选 ▼"}
            </button>
          </div>

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
              <div className="flex gap-0.5 bg-gray-100 rounded p-0.5 flex-wrap">
                {(["all", "qp", "mcq", "ms", "notes", "mock_exam"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`text-xs px-2 py-0.5 rounded transition ${
                      type === t ? "bg-white text-primary-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              {(subject || type !== "all") && (
                <button onClick={() => { setSubject(""); setType("all"); }} className="text-xs text-gray-400 hover:text-primary-600">重置</button>
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
                <Pie
                  data={data.pdf_distribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  label={({ name, count }: any) => `${name.slice(0, 10)} ${count}`}
                >
                  {data.pdf_distribution.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : view === "table" ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400"><th>分类/科目</th><th className="text-right">数量</th></tr></thead>
              <tbody>
                {data.pdf_distribution.slice(0, 15).map((q) => (
                  <tr key={q.name} className="border-t">
                    <td className="py-1.5 truncate max-w-[200px]">{q.name}</td>
                    <td className="text-right font-semibold">{fmt(q.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>
              <div className="text-center p-3 bg-blue-50 rounded-lg mb-2">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.total_pdfs)}</div>
                <div className="text-xs text-gray-500">总 PDF</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-gray-50 rounded"><div className="font-bold">{fmt(data.breakdown.qp)}</div><div className="text-gray-400">题目卷</div></div>
                <div className="text-center p-2 bg-gray-50 rounded"><div className="font-bold">{fmt(data.breakdown.mcq_qp)}</div><div className="text-gray-400">MCQ卷</div></div>
                <div className="text-center p-2 bg-gray-50 rounded"><div className="font-bold">{fmt(data.breakdown.ms)}</div><div className="text-gray-400">评分方案</div></div>
                <div className="text-center p-2 bg-gray-50 rounded"><div className="font-bold">{fmt(data.breakdown.notes)}</div><div className="text-gray-400">笔记</div></div>
                <div className="text-center p-2 bg-gray-50 rounded"><div className="font-bold">{fmt(data.breakdown.mock)}</div><div className="text-gray-400">模拟考</div></div>
                <div className="text-center p-2 bg-red-50 rounded"><div className="font-bold text-red-500">{fmt(data.missing_ms)}</div><div className="text-gray-400">缺MS</div></div>
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
