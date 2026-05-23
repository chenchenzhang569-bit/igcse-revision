"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  total: number;
  correct: number;
  rate: number;
  subjects: { slug: string; total: number; correct: number; rate: number }[];
  recent: {
    question_id: string;
    question_text: string;
    is_correct: boolean;
    user_answer: string;
    correct_answer: string;
    subject_slug: string;
    subtopic_code: string;
    difficulty: string;
    created_at: string;
  }[];
}

const SUBJECT_LABELS: Record<string, string> = {
  "caie-physics-0625": "Physics",
  "caie-chemistry-0620": "Chemistry",
  "caie-biology-0610": "Biology",
  "caie-mathematics-0580": "Mathematics",
};

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "#001C71",
  Chemistry: "#059669",
  Biology: "#7C3AED",
  Mathematics: "#EA580C",
};

const DIFF_BADGE: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-600",
  medium: "bg-amber-50 text-amber-600",
  hard: "bg-rose-50 text-rose-600",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-answers/stats", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.error) setStats({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
        else setStats(data);
      })
      .catch(() => setStats({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const s = stats;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', 'Poppins', system-ui, sans-serif" }}>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#001C71" }}>Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Track your IGCSE revision progress</p>
      </div>

      {/* ROW 1: Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/subjects" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-5 h-5 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <p className="text-xs font-extrabold text-white">Browse Subjects</p>
        </Link>
        <Link href="/dashboard/my-bank" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-5 h-5 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          <p className="text-xs font-extrabold text-white">My Question Bank</p>
        </Link>
        <Link href="/past-papers" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-5 h-5 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <p className="text-xs font-extrabold text-white">Past Papers</p>
        </Link>
        <Link href="/mock-exams" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-5 h-5 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          <p className="text-xs font-extrabold text-white">Mock Exams</p>
        </Link>
      </div>

      {/* ROW 2: Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #001C71, #002a8a)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Questions Done</span>
            <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-4xl font-extrabold tracking-tight" style={{ color: "#FF8C00" }}>{s.total}</p>
        </div>
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #001C71, #002a8a)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Correct</span>
            <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-4xl font-extrabold tracking-tight" style={{ color: "#FF8C00" }}>{s.correct}</p>
        </div>
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #001C71, #002a8a)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Accuracy</span>
            <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <p className="text-4xl font-extrabold tracking-tight" style={{ color: "#FF8C00" }}>{s.rate}%</p>
        </div>
      </div>

      {/* ROW 3: Recent Activity */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #001C71, #001a60)" }}>
        <h2 className="text-lg font-extrabold mb-5 text-white">
          <svg className="w-5 h-5 inline mr-2 -mt-0.5 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Recent Activity
        </h2>
        {s.recent.length > 0 ? (
          <div className="space-y-1">
            {s.recent.slice(0, 8).map((a, i) => {
              const subLabel = SUBJECT_LABELS[a.subject_slug] || a.subject_slug;
              return (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-white/10 last:border-0">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${a.is_correct ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"}`}>
                    {a.is_correct ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90 font-semibold truncate">{a.question_text || `Question ${a.question_id?.slice(0, 8)}`}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-white/50 font-medium">{subLabel}</span>
                      {a.subtopic_code && <span className="text-xs text-white/30">· {a.subtopic_code}</span>}
                      {a.difficulty && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${a.difficulty === "easy" ? "bg-emerald-400/20 text-emerald-300" : a.difficulty === "medium" ? "bg-amber-400/20 text-amber-300" : "bg-rose-400/20 text-rose-300"}`}>{a.difficulty}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-white/40 shrink-0 font-semibold">{timeAgo(a.created_at)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/50 py-4 text-center font-medium">No activity yet — start answering questions</p>
        )}
      </div>

      {/* ROW 4: Subject Progress */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-lg font-extrabold mb-5" style={{ color: "#001C71" }}>
          <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Subject Progress
        </h2>
        {s.subjects.length > 0 ? (
          <div className="space-y-5">
            {s.subjects.map(sub => {
              const label = SUBJECT_LABELS[sub.slug] || sub.slug;
              const color = SUBJECT_COLORS[label] || "#001C71";
              return (
                <div key={sub.slug}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-gray-700">{label}</span>
                    <span className="text-gray-400 text-xs font-semibold">{sub.correct}/{sub.total} · {sub.rate}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.max(sub.rate, 4)}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center font-medium">No data yet — answer questions to see your progress</p>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 bg-gray-100 rounded w-44" />
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}</div>
      <div className="h-40 bg-gray-100 rounded-2xl" />
      <div className="h-48 bg-white rounded-2xl border border-gray-100" />
    </div>
  );
}
