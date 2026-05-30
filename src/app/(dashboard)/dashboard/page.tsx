"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
  "caie-physics-0625": "Physics 0625",
  "caie-chemistry-0620": "Chemistry 0620",
  "caie-biology-0610": "Biology 0610",
  "caie-mathematics-0580": "Mathematics 0580",
  "caie-economics-0455": "Economics 0455",
  "caie-computer-science-0478": "Computer Science 0478",
  "caie-additional-mathematics-0606": "Additional Math 0606",
  "edexcel-physics-4ph1": "Physics 4PH1",
  "edexcel-chemistry-4ch1": "Chemistry 4CH1",
  "edexcel-biology-4bi1": "Biology 4BI1",
  "edexcel-mathematics-4ma1": "Mathematics A 4MA1",
};

// Sort subjects: CAIE first, then Edexcel — and add board prefix
function sortGroupedSubjects(subjects: { slug: string; total: number; correct: number; rate: number; used?: number; subtopics?: number }[]) {
  return [...subjects].sort((a, b) => {
    const boardA = a.slug.startsWith("edexcel") ? 1 : 0;
    const boardB = b.slug.startsWith("edexcel") ? 1 : 0;
    if (boardA !== boardB) return boardA - boardB;
    return subjectLabel(a.slug).localeCompare(subjectLabel(b.slug));
  });
}

function subjectBoardLabel(slug: string): string {
  const board = slug.startsWith("edexcel") ? "Edexcel" : "CAIE";
  return `${board}: ${subjectLabel(slug)}`;
}

function subjectLabel(slug: string): string {
  if (SUBJECT_LABELS[slug]) return SUBJECT_LABELS[slug];
  const parts = slug.split("-");
  const code = parts[parts.length - 1]?.toUpperCase() || "";
  const name = parts.slice(1, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  return name ? `${name} ${code}` : slug;
}

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

interface Purchase {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_slug: string;
  board: string;
  status: string;
  expires_at: string;
  days_left: number | null;
  expired: boolean;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [upgradePrice, setUpgradePrice] = useState<number | null>(null);
  const [hasAllSubject, setHasAllSubject] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch("/api/user-answers/stats", { credentials: "include", headers });
    }).then(r => r.json())
      .then(data => {
        if (data.error) setStats({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] });
        else setStats(data);
      })
      .catch(() => setStats({ total: 0, correct: 0, rate: 0, subjects: [], recent: [] }))
      .finally(() => setLoading(false));

    // Fetch subscriptions (with auth token)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch("/api/payment/purchases", { credentials: "include", headers });
    }).then(r => r.json())
      .then(d => {
        setPurchases(d.purchases || []);
        setUpgradePrice(d.hasAllSubject ? null : d.upgradePrice);
        setHasAllSubject(d.hasAllSubject || false);
      })
      .catch(() => {});
  }, []);

  if (loading) return <DashboardSkeleton />;

  const s = stats;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', 'Poppins', system-ui, sans-serif" }}>
      <div>
        <p className="text-lg font-extrabold tracking-tight" style={{ color: "#001C71" }}>{t("dashboard", "title")}</p>
      </div>

      {/* ROW 1: Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link href="/subjects" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-7 h-7 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <p className="text-sm font-extrabold text-white">{t("dashboard", "browseSubjects")}</p>
        </Link>
        <Link href="/dashboard/my-bank" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-7 h-7 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          <p className="text-sm font-extrabold text-white">{t("dashboard", "myBank")}</p>
        </Link>
        <Link href="/invite" className="group rounded-xl p-4 text-center border-2 border-[#FF8C00]/30 hover:border-[#FF8C00] hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #FF8C00, #E67E00)" }}>
          <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <p className="text-sm font-extrabold text-white">{t("dashboard", "inviteFriends")}</p>
        </Link>
        <Link href="/past-papers" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-7 h-7 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <p className="text-sm font-extrabold text-white">{t("dashboard", "pastPapers")}</p>
        </Link>
        <Link href="/mock-exams" className="group rounded-xl p-4 text-center border-2 border-[#001C71]/20 hover:border-[#FF8C00]/50 hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}>
          <svg className="w-7 h-7 mx-auto mb-2 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          <p className="text-sm font-extrabold text-white">{t("dashboard", "mockExams")}</p>
        </Link>
      </div>

      {/* Subscriptions card */}
      {purchases.length > 0 && (
        <div className={`border rounded-2xl p-5 ${
          purchases.every(p => p.expired)
            ? "bg-red-50/60 border-red-200"
            : purchases.some(p => p.days_left !== null && p.days_left <= 14 && p.days_left > 0)
            ? "bg-amber-50/60 border-amber-200"
            : "bg-emerald-50/60 border-emerald-200"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {purchases.every(p => p.expired)
                  ? "❌"
                  : purchases.some(p => p.days_left !== null && p.days_left <= 14 && p.days_left > 0)
                  ? "⚠️"
                  : "✅"}
              </span>
              <h2 className="text-base font-extrabold" style={{ color: "#001C71" }}>{t("dashboard", "subscriptions")}</h2>
            </div>
            {!hasAllSubject && upgradePrice != null && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm font-bold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2 rounded-lg transition shrink-0"
              >
                Upgrade to All Subjects ¥{upgradePrice / 100} →
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {purchases.map(p => (
              <Link
                key={p.subject_id}
                href={`/subjects/${p.subject_slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all"
                style={{ background: "linear-gradient(135deg, #001C71, #00154f)" }}
              >
                {p.board && <span className="text-white/70 text-[10px]">{p.board}</span>}
                <span className="text-white/80">{p.subject_code}</span>
                <span className="text-white">{p.subject_name}</span>
                <span className="text-white/40 mx-0.5">·</span>
                {p.expired ? (
                  <span className="text-red-300">Expired</span>
                ) : p.days_left != null && p.days_left <= 14 ? (
                  <span className="text-amber-300 font-bold">⚠ {p.days_left}d</span>
                ) : (
                  <span className="text-white/60">{p.days_left}d</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ROW 2: Subject Progress — Bar Chart (full width) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-lg font-extrabold mb-5" style={{ color: "#001C71" }}>
          <svg className="w-7 h-7 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Subject Progress
        </h2>
        {s.subjects.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sortGroupedSubjects(s.subjects).map(sub => ({ name: subjectLabel(sub.slug), Practiced: sub.used || 0, Remaining: (sub.subtopics || 0) - (sub.used || 0) }))} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "#374151" }} width={90} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v: number, name: string) => [v, name === "Practiced" ? "Subtopic practiced" : "Subtopic remaining"]} />
              <Bar dataKey="Practiced" fill="#FF8C00" radius={[0, 4, 4, 0]} barSize={18} />
              <Bar dataKey="Remaining" fill="#001C71" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center font-medium">No data yet — answer questions to see your progress</p>
        )}
      </div>

      {/* ROW 2.5: Overall Accuracy — Per-Subject Donuts */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-lg font-extrabold mb-5" style={{ color: "#001C71" }}>
          <svg className="w-7 h-7 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
          Overall Accuracy
        </h2>
        {(() => {
          const DEFAULT_SLUGS = [
            "caie-physics-0625",
            "caie-chemistry-0620",
            "caie-biology-0610",
          ];
          // 1. Recently practiced subjects (from recent activity)
          const practicedSlugs: string[] = [];
          for (const r of s.recent) {
            if (!practicedSlugs.includes(r.subject_slug)) practicedSlugs.push(r.subject_slug);
          }
          // 2. Fill: purchased but not practiced
          const unpracticedSlugs = s.subjects
            .filter(sub => sub.total === 0 && !practicedSlugs.includes(sub.slug))
            .map(sub => sub.slug);
          // 3. Fill: remaining from subjects array
          const remainingSlugs = s.subjects
            .filter(sub => !practicedSlugs.includes(sub.slug) && !unpracticedSlugs.includes(sub.slug))
            .map(sub => sub.slug);
          // 4. Fill: hardcoded defaults (Physics, Chemistry, Biology)
          const defaultSlugs = DEFAULT_SLUGS.filter(
            slug => !practicedSlugs.includes(slug) && !unpracticedSlugs.includes(slug) && !remainingSlugs.includes(slug)
          );

          const selectedSlugs = [...practicedSlugs, ...unpracticedSlugs, ...remainingSlugs, ...defaultSlugs].slice(0, 3);

          if (selectedSlugs.length === 0) {
            return <p className="text-sm text-gray-400 py-4 text-center font-medium">No data yet — answer questions to see your accuracy</p>;
          }

          const DONUT_COLORS = ["#FF8C00", "#001C71", "#059669"];
          return (
            <div className="grid grid-cols-3 gap-4">
              {selectedSlugs.map((slug, idx) => {
                const sub = s.subjects.find(x => x.slug === slug);
                const correct = sub?.correct || 0;
                const total = sub?.total || 0;
                const rate = total > 0 ? (sub?.rate || 0) : 100;
                const hasData = total > 0;
                const pieData = hasData
                  ? [{ name: "Correct", value: correct }, { name: "Incorrect", value: total - correct }]
                  : [{ name: "Ready", value: 1 }];
                return (
                  <div key={slug} className="relative flex flex-col items-center" style={{ height: 210 }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {hasData ? (
                            <>
                              <Cell fill="#FF8C00" />
                              <Cell fill="#001C71" />
                            </>
                          ) : (
                            <Cell fill="#FF8C00" />
                          )}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                          formatter={(v: number, name: string) => [v, name === "Correct" ? "Correct" : name === "Incorrect" ? "Incorrect" : "Ready"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, height: 160 }}>
                      <span className="text-2xl font-extrabold" style={{ color: DONUT_COLORS[idx] }}>{rate}%</span>
                      <span className="text-xs text-gray-400 font-medium">{hasData ? `${correct}/${total}` : "0/0"}</span>
                    </div>
                    <p className="text-xs font-semibold text-center mt-2 px-1 leading-tight" style={{ color: DONUT_COLORS[idx] }}>
                      {subjectLabel(slug)}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ROW 3: Recent Activity */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-lg font-extrabold mb-5" style={{ color: "#001C71" }}>
          <svg className="w-7 h-7 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Recent Activity
        </h2>
        {s.recent.length > 0 ? (
          <div className="space-y-1">
            {s.recent.slice(0, 8).map((a, i) => {
              const subLabel = subjectLabel(a.subject_slug);
              return (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${a.is_correct ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    {a.is_correct ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-semibold truncate">{a.question_text || `Question ${a.question_id?.slice(0, 8)}`}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-medium">{subLabel}</span>
                      {a.subtopic_code && <span className="text-xs text-gray-400">· {a.subtopic_code}</span>}
                      {a.difficulty && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${a.difficulty === "easy" ? "bg-emerald-50 text-emerald-600" : a.difficulty === "medium" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>{a.difficulty}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 font-semibold">{timeAgo(a.created_at)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center font-medium">No activity yet — start answering questions</p>
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
