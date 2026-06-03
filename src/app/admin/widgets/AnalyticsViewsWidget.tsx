"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import WidgetCard from "./WidgetCard";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4"];

type AnalyticsData = {
  total_views: number;
  by_tab: { name: string; count: number }[];
  by_path: { name: string; count: number }[];
  daily_trend: { date: string; count: number }[];
};

interface Props {
  token: string | null;
  onToggle?: () => void;
}

const TAB_LABELS: Record<string, string> = {
  notes: "📝 Notes",
  mcq: "📋 MCQ",
  structured: "📄 Structured",
  "past-papers": "📑 Past Papers",
  "mock-exams": "🎯 Mock Exams",
};

export default function AnalyticsViewsWidget({ token, onToggle }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, days]);

  const fmt = (n: number) => n.toLocaleString();

  if (loading || !data) {
    return (
      <WidgetCard title="📊 页面分析" defaultView="card" widgetId="analytics" onToggle={onToggle}>
        {() => <div className="text-center text-gray-400 text-sm py-4">加载中...</div>}
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="📊 页面分析" defaultView="card" views={["card", "pie", "bar"]} widgetId="analytics" onToggle={onToggle}>
      {(view) => (
        <div>
          {/* Days filter */}
          <div className="flex justify-end mb-2 gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs px-2 py-0.5 rounded ${
                  days === d ? "bg-primary-900 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {d}天
              </button>
            ))}
          </div>

          {view === "card" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900">{fmt(data.total_views)}</div>
                <div className="text-xs text-gray-500">总浏览量</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {fmt((data.by_tab || []).reduce((s, t) => s + t.count, 0))}
                </div>
                <div className="text-xs text-gray-500">按 Tab 分类</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {fmt((data.daily_trend || []).slice(-1)[0]?.count || 0)}
                </div>
                <div className="text-xs text-gray-500">今日浏览</div>
              </div>
            </div>
          )}

          {view === "pie" && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={(data.by_tab || []).filter((t) => t.count > 0)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  label={({ name, count }: any) => `${(TAB_LABELS[name] || name).slice(0, 10)} ${count}`}
                >
                  {(data.by_tab || [])
                    .filter((t) => t.count > 0)
                    .map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}

          {view === "bar" && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#001C71" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
