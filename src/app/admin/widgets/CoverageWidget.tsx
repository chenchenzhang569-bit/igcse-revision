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
                <tr className="text-left text-gray-400 border-b">
                  <th className="py-1 pr-2">科目</th>
                  <th className="py-1 px-1 text-center">📚</th>
                  <th className="py-1 px-1 text-center">📓笔记</th>
                  <th className="py-1 px-1 text-center">✏️练习</th>
                  <th className="py-1 px-1 text-center">✅答案</th>
                  <th className="py-1 px-1 text-center">❓MCQ</th>
                  <th className="py-1 px-1 text-center">🔑MCQ答</th>
                  <th className="py-1 px-1 text-center">📄QP</th>
                  <th className="py-1 px-1 text-center">📋MS</th>
                  <th className="py-1 px-1 text-center">❌缺MS</th>
                </tr>
              </thead>
              <tbody>
                {subjectIds.map((sid) => {
                  const c = data.coverage[sid];
                  const subj = data.subjects.find((s) => s.id === sid);
                  if (!c) return null;
                  return (
                    <tr key={sid} className="border-t hover:bg-gray-50">
                      <td className="py-1.5 pr-2 truncate max-w-[130px] text-gray-600">{subj?.name?.split(" ").slice(0,2).join(" ") || sid.slice(0,8)}</td>
                      <td className="text-center font-semibold">{c.subtopics}</td>
                      <td className={`text-center font-semibold ${c.notes>0?"text-primary-900":"text-gray-300"}`}>{c.notes}</td>
                      <td className={`text-center font-semibold ${c.practice>0?"text-primary-900":"text-gray-300"}`}>{c.practice}</td>
                      <td className={`text-center font-semibold ${c.practiceAnswers>0?"text-primary-900":"text-gray-300"}`}>{c.practiceAnswers}</td>
                      <td className={`text-center font-semibold ${c.mcq>0?"text-primary-900":"text-gray-300"}`}>{c.mcq}</td>
                      <td className={`text-center font-semibold ${c.mcqAnswers>0?"text-primary-900":"text-gray-300"}`}>{c.mcqAnswers}</td>
                      <td className="text-center font-semibold">{fmt(c.examQp)}</td>
                      <td className="text-center font-semibold">{fmt(c.examMs)}</td>
                      <td className={`text-center font-semibold ${c.missingMs>0?"text-red-500":"text-gray-300"}`}>{c.missingMs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3">
              {subjectIds.map((sid) => {
                const c = data.coverage[sid];
                const subj = data.subjects.find((s) => s.id === sid);
                if (!c) return null;
                const s = c.subtopics || 1;
                return (
                  <div key={sid}>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">{subj?.name || sid.slice(0,8)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full ${c.notes>0?"bg-blue-100 text-primary-900":"bg-gray-100 text-gray-300"}`}>
                        📓{c.notes}/{s}({Math.round(c.notes/s*100)}%)
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full ${c.practice>0?"bg-blue-100 text-primary-900":"bg-gray-100 text-gray-300"}`}>
                        ✏️{c.practice}/{s}({Math.round(c.practice/s*100)}%)
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full ${c.practiceAnswers>0?"bg-blue-100 text-primary-900":"bg-gray-100 text-gray-300"}`}>
                        ✅{c.practiceAnswers}/{s}({Math.round(c.practiceAnswers/s*100)}%)
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full ${c.mcq>0?"bg-blue-100 text-primary-900":"bg-gray-100 text-gray-300"}`}>
                        ❓{c.mcq}/{s}({Math.round(c.mcq/s*100)}%)
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full ${c.mcqAnswers>0?"bg-blue-100 text-primary-900":"bg-gray-100 text-gray-300"}`}>
                        🔑{c.mcqAnswers}/{s}({Math.round(c.mcqAnswers/s*100)}%)
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        📄{fmt(c.examQp)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        📋{fmt(c.examMs)}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full ${c.missingMs>0?"bg-red-100 text-red-600":"bg-gray-100 text-gray-300"}`}>
                        ❌{c.missingMs>0?`-${c.missingMs}`:0}
                      </span>
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
