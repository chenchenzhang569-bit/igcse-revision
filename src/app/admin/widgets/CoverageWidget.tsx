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
    <WidgetCard title="🧩 题库覆盖" defaultView="card" widgetId="coverage" onToggle={onToggle}>
      {() => (
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

          <div className="space-y-3">
            {subjectIds.map((sid) => {
              const c = data.coverage[sid];
              const subj = data.subjects.find((s) => s.id === sid);
              if (!c) return null;
              const s = c.subtopics || 1;

              const rows: { icon: string; label: string; display: string; color: string }[] = [
                { icon: "📓", label: "笔记", display: `${c.notes}/${s} (${Math.round(c.notes/s*100)}%)`, color: c.notes > 0 ? "text-primary-900" : "text-gray-300" },
                { icon: "✏️", label: "练习", display: `${c.practice}/${s} (${Math.round(c.practice/s*100)}%)`, color: c.practice > 0 ? "text-primary-900" : "text-gray-300" },
                { icon: "✅", label: "练习答案", display: `${c.practiceAnswers}/${s} (${Math.round(c.practiceAnswers/s*100)}%)`, color: c.practiceAnswers > 0 ? "text-primary-900" : "text-gray-300" },
                { icon: "❓", label: "MCQ", display: `${c.mcq}/${s} (${Math.round(c.mcq/s*100)}%)`, color: c.mcq > 0 ? "text-primary-900" : "text-gray-300" },
                { icon: "🔑", label: "MCQ答案", display: `${c.mcqAnswers}/${s} (${Math.round(c.mcqAnswers/s*100)}%)`, color: c.mcqAnswers > 0 ? "text-primary-900" : "text-gray-300" },
                { icon: "📄", label: "真题 QP", display: `${c.examQp}`, color: "text-orange-600" },
                { icon: "📋", label: "真题 MS", display: `${c.examMs}`, color: "text-orange-600" },
              ];

              return (
                <div key={sid}>
                  <p className="text-sm font-semibold text-gray-600 mb-1">{subj?.name || sid.slice(0, 8)} <span className="text-xs text-gray-400 font-normal">📚{c.subtopics}</span></p>
                  <div className="space-y-0.5">
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-center gap-2">
                        <span className="w-16 text-xs text-gray-400 shrink-0">{r.icon} {r.label}</span>
                        <span className={`text-xs font-medium ${r.color}`}>{r.display}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
