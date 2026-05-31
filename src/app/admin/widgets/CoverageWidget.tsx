"use client";

import { useEffect, useState } from "react";
import WidgetCard from "./WidgetCard";

type CoverageData = {
  subtopics: number;
  notes: number;
  practice: number;
  practiceAnswers: number;
  mcq: number;
  mcqAnswers: number;
  examQp: number;
  examMs: number;
  missingMs: number;
};

type CoverageResponse = {
  subjects: { id: string; name: string }[];
  coverage: Record<string, CoverageData>;
};

interface Props {
  token: string | null;
  onToggle?: () => void;
}

const COV_KEYS: { key: keyof CoverageData; label: string; icon: string }[] = [
  { key: "notes", label: "笔记", icon: "📓" },
  { key: "practice", label: "练习", icon: "✏️" },
  { key: "practiceAnswers", label: "练习答案", icon: "✅" },
  { key: "mcq", label: "MCQ", icon: "❓" },
  { key: "mcqAnswers", label: "MCQ答案", icon: "🔑" },
  { key: "examQp", label: "真题QP", icon: "📄" },
  { key: "examMs", label: "真题MS", icon: "📋" },
  { key: "missingMs", label: "缺MS", icon: "❌" },
];

export default function CoverageWidget({ token, onToggle }: Props) {
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = subject ? `?subject_id=${subject}` : "";
    fetch(`/api/admin/coverage${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, subject]);

  const fmt = (n: number) => n.toLocaleString();

  if (loading || !data) {
    return (
      <WidgetCard title="🧩 题库覆盖" defaultView="card" widgetId="coverage" onToggle={onToggle}>
        {() => <div className="text-center text-gray-400 text-sm py-4">加载中...</div>}
      </WidgetCard>
    );
  }

  const subjectIds = subject
    ? [subject]
    : Object.keys(data.coverage).filter((sid) =>
        data.subjects.find((s) => s.id === sid)
      );

  return (
    <WidgetCard title="🧩 题库覆盖" defaultView="card" views={["card", "table"]}
      widgetId="coverage" onToggle={onToggle}>
      {(view) => (
        <div>
          {/* Subject filter */}
          <div className="mb-3">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-white text-gray-600 w-full max-w-xs"
            >
              <option value="">📚 全部科目</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {view === "table" ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-1 pr-2">科目</th>
                  <th className="py-1 px-1 text-center" title="总Subtopics">📚</th>
                  {COV_KEYS.map((k) => (
                    <th key={k.key} className="py-1 px-1 text-center" title={k.label}>
                      {k.icon}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjectIds.map((sid) => {
                  const c = data.coverage[sid];
                  const subj = data.subjects.find((s) => s.id === sid);
                  if (!c) return null;
                  const subtopics = c.subtopics || 1;
                  return (
                    <tr key={sid} className="border-t">
                      <td className="py-1.5 pr-2 truncate max-w-[150px]">
                        {subj?.name || sid.slice(0, 8)}
                      </td>
                      <td className="text-center font-semibold">{c.subtopics}</td>
                      {COV_KEYS.map((k) => {
                        const val = c[k.key];
                        const pct = Math.round((val / subtopics) * 100);
                        const isMissing = k.key === "missingMs";
                        const color = isMissing
                          ? val > 0 ? "text-red-500" : "text-green-500"
                          : val > 0 ? "text-primary-900" : "text-gray-300";
                        return (
                          <td key={k.key} className={`text-center font-semibold ${color}`}>
                            {isMissing ? val : `${val}`}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="space-y-4">
              {subjectIds.map((sid) => {
                const c = data.coverage[sid];
                const subj = data.subjects.find((s) => s.id === sid);
                if (!c) return null;
                const subtopics = c.subtopics || 1;
                return (
                  <div key={sid}>
                    {!subject && (
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {subj?.name || sid.slice(0, 8)}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {COV_KEYS.map((k) => {
                        const val = c[k.key];
                        const isMissing = k.key === "missingMs";
                        if (isMissing) {
                          return (
                            <div key={k.key} className={`text-center p-2 rounded-lg border ${val > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                              <div className={`text-lg font-bold ${val > 0 ? "text-red-500" : "text-green-500"}`}>
                                {val > 0 ? `-${val}` : "0"}
                              </div>
                              <div className="text-xs text-gray-400">{k.icon} {k.label}</div>
                            </div>
                          );
                        }
                        const pct = Math.round((val / subtopics) * 100);
                        const hasSub = k.key === "examQp" || k.key === "examMs";
                        return (
                          <div key={k.key} className={`text-center p-2 rounded-lg border ${val > 0 ? (hasSub ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200") : "bg-gray-50 border-gray-100"}`}>
                            <div className={`text-lg font-bold ${val > 0 ? "text-primary-900" : "text-gray-300"}`}>
                              {hasSub ? val : `${val}/${subtopics}`}
                            </div>
                            <div className="text-xs text-gray-400">
                              {k.icon} {k.label}
                              {!hasSub && subtopics > 0 && (
                                <span className="ml-1 text-gray-300">({pct}%)</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
