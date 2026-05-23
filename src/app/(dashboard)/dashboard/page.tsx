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

const DIFF_STYLES: Record<string, string> = {
  easy: "bg-green-50 text-green-600 border-green-200",
  medium: "bg-yellow-50 text-yellow-600 border-yellow-200",
  hard: "bg-red-50 text-red-600 border-red-200",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-answers/stats", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          // API error (e.g. no answers yet) — show zeros, not empty state
          setStats({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
        } else {
          setStats(data);
        }
      })
      .catch(() => setStats({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const s = stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Track your IGCSE revision progress</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Questions Done" value={s.total} color="#001C71" icon="📝" />
        <StatCard label="Correct" value={s.correct} color="#059669" icon="✅" />
        <StatCard label="Accuracy" value={`${s.rate}%`} color="#7C3AED" icon="🎯" />
      </div>

      {/* Subject progress */}
      {s.subjects.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-bold text-primary-900 mb-4">📚 Subject Progress</h2>
          <div className="space-y-4">
            {s.subjects.map(sub => {
              const label = SUBJECT_LABELS[sub.slug] || sub.slug;
              const color = SUBJECT_COLORS[label] || "#001C71";
              return (
                <div key={sub.slug}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-700">{label}</span>
                    <span className="text-gray-500">{sub.correct}/{sub.total} ({sub.rate}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sub.rate}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickLink href="/subjects" icon="📚" label="Browse Subjects" />
        <QuickLink href="/dashboard/my-bank" icon="💾" label="My Question Bank" />
        <QuickLink href="/past-papers" icon="📄" label="Past Papers" />
        <QuickLink href="/mock-exams" icon="📋" label="Mock Exams" />
      </div>

      {/* Recent activity */}
      {s.recent.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-bold text-primary-900 mb-4">🕐 Recent Activity</h2>
          <div className="space-y-3">
            {s.recent.slice(0, 8).map((a, i) => {
              const subLabel = SUBJECT_LABELS[a.subject_slug] || a.subject_slug;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${a.is_correct ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {a.is_correct ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{a.question_text || `Question ${a.question_id?.slice(0, 8)}`}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{subLabel}</span>
                      {a.subtopic_code && <span className="text-xs text-gray-300">{a.subtopic_code}</span>}
                      {a.difficulty && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${DIFF_STYLES[a.difficulty] || ""}`}>{a.difficulty}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(a.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="bg-white border rounded-xl p-4 text-center hover:shadow-md hover:border-primary-200 transition group">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-sm font-semibold text-gray-600 group-hover:text-primary-600">{label}</p>
    </Link>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  );
}
