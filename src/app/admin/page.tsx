"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import WidgetCard from "./widgets/WidgetCard";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4"];

type DashboardData = {
  traffic: { dau: number; mau: number; today_signups: number; week_signups: number };
  users: { total: number; paid: number; trial_active: number; week_new_paid: number };
  revenue: { total: number; week: number };
  invites: { total: number; paid: number; conversion: number };
  sources: Record<string, number>;
  db_quality: { total_questions: number; missing_answers: number; mock_papers: number; notes: number; subjects_with_questions: number };
  question_distribution: { name: string; count: number }[];
  available_subjects: { id: string; name: string }[];
};

const WIDGET_STORAGE_KEY = "admin_widget_hidden";

function loadHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY) || "[]")); } catch { return new Set(); }
}
function saveHidden(hidden: Set<string>) {
  localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify([...hidden]));
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tsData, setTsData] = useState<{ date: string; dau: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.auth.getSession().then(({ data: s }) => setToken(s.session?.access_token || null));
    setHidden(loadHidden());
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set("subject_id", filterSubject);
    if (filterType !== "all") params.set("type", filterType);
    const qs = params.toString();
    fetch(`/api/admin/dashboard${qs ? "?" + qs : ""}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));

    fetch("/api/admin/login-events?days=30", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setTsData).catch(() => {});
  }, [token, filterSubject, filterType]);

  const toggleWidget = (id: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveHidden(next);
      return next;
    });
  };

  if (loading || !data) {
    return <div className="p-8 text-gray-400">Loading dashboard...</div>;
  }

  const fmt = (n: number) => n.toLocaleString();
  const fmtYuan = (fen: number) => `¥${(fen / 100).toFixed(0)}`;

  // Hidden widget bar
  const hiddenList = ["overview", "payment", "revenue", "invites", "dau", "signups", "sources", "questions", "db", "funnel"].filter(id => hidden.has(id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-primary-900">📊 Dashboard</h1>
        {hiddenList.length > 0 && (
          <button onClick={() => { const n = new Set<string>(); saveHidden(n); setHidden(n); }}
            className="text-xs text-gray-400 hover:text-primary-600">
            Show all widgets ({hiddenList.length} hidden)
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {data.available_subjects && (
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700"
          >
            <option value="">📚 全部科目</option>
            {data.available_subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["all", "questions", "mock_exam", "mcq"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1 rounded-md transition ${
                filterType === t ? "bg-white text-primary-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {{ all: "全部", questions: "练习", mock_exam: "模拟考", mcq: "MCQ" }[t]}
            </button>
          ))}
        </div>
        {(filterSubject || filterType !== "all") && (
          <button
            onClick={() => { setFilterSubject(""); setFilterType("all"); }}
            className="text-xs text-gray-400 hover:text-primary-600"
          >
            重置
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ⭐ Overview */}
        <WidgetCard title="⭐ 实时概览" defaultView="card" hidden={hidden.has("overview")} onToggle={() => toggleWidget("overview")}>
          {(view) => (
            <div className={view === "card" ? "grid grid-cols-2 gap-3" : ""}>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.traffic.dau)}</div>
                <div className="text-xs text-gray-500">今日活跃</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{fmt(data.traffic.week_signups)}</div>
                <div className="text-xs text-gray-500">本周新注册</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{fmt(data.users.total)}</div>
                <div className="text-xs text-gray-500">总用户</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{fmt(data.users.paid)}</div>
                <div className="text-xs text-gray-500">付费用户</div>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* ⭐ Payment status */}
        <WidgetCard title="⭐ 付费状态" defaultView="card" views={["card", "pie"]} hidden={hidden.has("payment")} onToggle={() => toggleWidget("payment")}>
          {(view) => view === "pie" ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: "Paid", value: data.users.paid },
                  { name: "Trial", value: data.users.trial_active },
                  { name: "Free", value: Math.max(0, data.users.total - data.users.paid - data.users.trial_active) },
                ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center"><div className="text-2xl font-bold text-primary-900">{fmt(data.users.paid)}</div><div className="text-xs text-gray-500">付费</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-blue-600">{fmt(data.users.trial_active)}</div><div className="text-xs text-gray-500">试用中</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-gray-400">{fmt(Math.max(0, data.users.total - data.users.paid - data.users.trial_active))}</div><div className="text-xs text-gray-500">免费</div></div>
            </div>
          )}
        </WidgetCard>

        {/* ⭐ Revenue */}
        <WidgetCard title="⭐ 收入" defaultView="card" views={["card", "bar"]} hidden={hidden.has("revenue")} onToggle={() => toggleWidget("revenue")}>
          {(view) => view === "bar" ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: "本周", value: data.revenue.week }, { name: "总计", value: data.revenue.total }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v: number) => `¥${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={(v: number) => fmtYuan(v)} />
                <Bar dataKey="value" fill="#FF8C00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{fmtYuan(data.revenue.week)}</div>
                <div className="text-xs text-gray-500">本周收入</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{fmtYuan(data.revenue.total)}</div>
                <div className="text-xs text-gray-500">总收入</div>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* ⭐ Invites */}
        <WidgetCard title="⭐ 邀请统计" defaultView="card" views={["card", "table"]} hidden={hidden.has("invites")} onToggle={() => toggleWidget("invites")}>
          {(view) => view === "table" ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2 text-gray-500">总邀请</td><td className="text-right font-semibold">{fmt(data.invites.total)}</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500">付费邀请</td><td className="text-right font-semibold">{fmt(data.invites.paid)}</td></tr>
                <tr><td className="py-2 text-gray-500">转化率</td><td className="text-right font-semibold">{data.invites.conversion}%</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.invites.total)}</div>
                <div className="text-xs text-gray-500">总邀请</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{fmt(data.invites.paid)}</div>
                <div className="text-xs text-gray-500">付费邀请</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{data.invites.conversion}%</div>
                <div className="text-xs text-gray-500">转化率</div>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* DAU/MAU */}
        <WidgetCard title="📊 DAU / MAU" defaultView="card" views={["card", "bar"]} hidden={hidden.has("dau")} onToggle={() => toggleWidget("dau")}>
          {(view) => view === "bar" ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <Tooltip />
                <Bar dataKey="dau" fill="#001C71" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.traffic.dau)}</div>
                <div className="text-xs text-gray-500">DAU (今日)</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{fmt(data.traffic.mau)}</div>
                <div className="text-xs text-gray-500">MAU (30天)</div>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* Signup trend */}
        <WidgetCard title="📈 用户增长" defaultView="card" hidden={hidden.has("signups")} onToggle={() => toggleWidget("signups")}>
          {() => (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.traffic.today_signups)}</div>
                <div className="text-xs text-gray-500">今日注册</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{fmt(data.traffic.week_signups)}</div>
                <div className="text-xs text-gray-500">本周注册</div>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* Traffic sources */}
        <WidgetCard title="📱 流量来源" defaultView="card" views={["card", "pie", "table"]} hidden={hidden.has("sources")} onToggle={() => toggleWidget("sources")}>
          {(view) => {
            const srcArr = Object.entries(data.sources).map(([k, v]) => ({ name: k, value: v }));
            if (view === "pie") return (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={srcArr} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            );
            if (view === "table") return (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400"><th>来源</th><th className="text-right">用户</th></tr></thead>
                <tbody>{srcArr.map(s => <tr key={s.name} className="border-t"><td className="py-1.5">{s.name}</td><td className="text-right font-semibold">{fmt(s.value)}</td></tr>)}</tbody>
              </table>
            );
            return (
              <div className="grid grid-cols-4 gap-2">
                {srcArr.map(s => (
                  <div key={s.name} className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-primary-900">{fmt(s.value)}</div>
                    <div className="text-xs text-gray-400">{s.name}</div>
                  </div>
                ))}
              </div>
            );
          }}
        </WidgetCard>

        {/* Question distribution */}
        <WidgetCard title="🗂️ 题目分布" defaultView="card" views={["card", "pie", "table"]} hidden={hidden.has("questions")} onToggle={() => toggleWidget("questions")}>
          {(view) => {
            if (view === "pie") return (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.question_distribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, count }: any) => `${name.slice(0, 8)} ${count}`}>
                    {data.question_distribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            );
            if (view === "table") return (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400"><th>科目</th><th className="text-right">题目数</th></tr></thead>
                <tbody>{data.question_distribution.slice(0, 15).map(q => <tr key={q.name} className="border-t"><td className="py-1.5 truncate max-w-[200px]">{q.name}</td><td className="text-right font-semibold">{fmt(q.count)}</td></tr>)}</tbody>
              </table>
            );
            return (
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.db_quality.total_questions)}</div>
                <div className="text-xs text-gray-500">{data.db_quality.subjects_with_questions} 科有题目</div>
              </div>
            );
          }}
        </WidgetCard>

        {/* DB Quality */}
        <WidgetCard title="🔍 DB 质量" defaultView="card" views={["card", "table"]} hidden={hidden.has("db")} onToggle={() => toggleWidget("db")}>
          {(view) => view === "table" ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2 text-gray-500">总题目</td><td className="text-right font-semibold">{fmt(data.db_quality.total_questions)}</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500">缺答案</td><td className="text-right font-semibold text-red-500">{fmt(data.db_quality.missing_answers)}</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500">Mock 试卷</td><td className="text-right font-semibold">{fmt(data.db_quality.mock_papers)}</td></tr>
                <tr><td className="py-2 text-gray-500">Notes 文档</td><td className="text-right font-semibold">{fmt(data.db_quality.notes)}</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.db_quality.total_questions)}</div>
                <div className="text-xs text-gray-500">总题目</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{fmt(data.db_quality.missing_answers)}</div>
                <div className="text-xs text-gray-500">缺答案</div>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* Invite funnel */}
        <WidgetCard title="🔄 邀请漏斗" defaultView="card" views={["card", "table"]} hidden={hidden.has("funnel")} onToggle={() => toggleWidget("funnel")}>
          {(view) => view === "table" ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2 text-gray-500">总邀请</td><td className="text-right font-semibold">{fmt(data.invites.total)}</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500">转化付费</td><td className="text-right font-semibold">{fmt(data.invites.paid)}</td></tr>
                <tr><td className="py-2 text-gray-500">转化率</td><td className="text-right font-semibold">{data.invites.conversion}%</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{data.invites.conversion}%</div>
              <div className="text-xs text-gray-500">邀请 → 付费转化率</div>
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
