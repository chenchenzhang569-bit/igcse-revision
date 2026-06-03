"use client";

import { useEffect, useState } from "react";
import WidgetCard from "./WidgetCard";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4"];

interface AnalyticsStats {
  total_pv: number;
  total_visitors: number;
  today_pv: number;
  today_visitors: number;
  week_pv: number;
  week_visitors: number;
  bounce_rate: number;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  os: Record<string, number>;
  pages: Record<string, number>;
  sources: Record<string, number>;
  daily: Record<string, { pv: number; visitors: number; bounces: number; sessions: number; total_time: number }>;
}

export default function SiteAnalyticsWidget({
  token,
  onToggle,
}: {
  token: string | null;
  onToggle: () => void;
}) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/analytics/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <WidgetCard title="🌐 网站分析" defaultView="card" widgetId="analytics" hidden={false} onToggle={onToggle}>
        {() => (
          <div className="animate-pulse grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        )}
      </WidgetCard>
    );
  }

  if (!stats) {
    return (
      <WidgetCard title="🌐 网站分析" defaultView="card" widgetId="analytics" hidden={false} onToggle={onToggle}>
        {() => <p className="text-sm text-gray-400 text-center py-4">暂无数据（埋点后开始收集）</p>}
      </WidgetCard>
    );
  }

  const fmt = (n: number) => n.toLocaleString();
  const deviceData = Object.entries(stats.devices || {}).map(([k, v]) => ({ name: k, value: v }));
  const browserData = Object.entries(stats.browsers || {}).map(([k, v]) => ({ name: k, value: v }));
  const osData = Object.entries(stats.os || {}).map(([k, v]) => ({ name: k, value: v }));
  const sourceData = Object.entries(stats.sources || {}).map(([k, v]) => ({ name: k, value: v }));
  const topPages = Object.entries(stats.pages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ name: k || "/", value: v }));

  // Daily trend (last 7 days)
  const weekDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  const trendData = weekDates.map((date) => ({
    date: date.slice(5),
    pv: stats.daily?.[date]?.pv || 0,
    visitors: stats.daily?.[date]?.visitors || 0,
  }));

  return (
    <WidgetCard
      title="🌐 网站分析"
      defaultView="card"
      views={["card", "pie", "bar"]}
      widgetId="analytics"
      hidden={false}
      onToggle={onToggle}
    >
      {(view) => {
        switch (view) {
          case "bar":
            return (
              <div className="space-y-6">
                {/* Daily trend */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">近 7 日趋势</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="pv" fill="#001C71" name="PV" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="visitors" fill="#FF8C00" name="访客" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Devices pie + Browser pie side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {deviceData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">设备</h4>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {browserData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">浏览器</h4>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={browserData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {browserData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                {/* OS pie */}
                {osData.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">操作系统</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={osData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {osData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );

          case "pie":
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {deviceData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">设备分布</h4>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label>
                            {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {browserData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">浏览器分布</h4>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={browserData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label>
                            {browserData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {osData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">操作系统</h4>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={osData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label>
                            {osData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {sourceData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">流量来源</h4>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label>
                            {sourceData.map((_, i) => <Cell key={i} fill={COLORS[(i + 6) % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            );

          default: {
            // card view
            return (
              <div className="space-y-4">
                {/* Overview numbers */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-primary-900">{fmt(stats.today_pv)}</div>
                    <div className="text-[10px] text-gray-500">今日 PV</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">{fmt(stats.today_visitors)}</div>
                    <div className="text-[10px] text-gray-500">今日访客</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-700">{fmt(stats.total_pv)}</div>
                    <div className="text-[10px] text-gray-500">总 PV</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">{fmt(stats.total_visitors)}</div>
                    <div className="text-[10px] text-gray-500">总访客</div>
                  </div>
                </div>
                {/* Week stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-indigo-50 rounded-lg">
                    <div className="text-lg font-bold text-indigo-600">{fmt(stats.week_pv)}</div>
                    <div className="text-[10px] text-gray-500">本周 PV</div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <div className="text-lg font-bold text-amber-600">{fmt(stats.week_visitors)}</div>
                    <div className="text-[10px] text-gray-500">本周访客</div>
                  </div>
                  <div className="text-center p-2 bg-rose-50 rounded-lg">
                    <div className="text-lg font-bold text-rose-600">{stats.bounce_rate}%</div>
                    <div className="text-[10px] text-gray-500">跳出率</div>
                  </div>
                </div>
                {/* Top pages - grouped by category */}
                {topPages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">热门题型 TOP 10</h4>
                    {(() => {
                      const groups: Record<string, number> = {};
                      const totalTop = topPages.reduce((s, p) => s + p.value, 0);
                      for (const p of topPages) {
                        const url = p.name;
                        let group = "其他";
                        if (url.startsWith("/past-papers")) group = "真题";
                        else if (url.startsWith("/mock-exams")) group = "模拟考";
                        else if (url.includes("/mcq") || url.includes("mcq")) group = "MCQ";
                        else if (url.includes("/notes/") || url.includes("notes")) group = "笔记";
                        else if (url.includes("/topics/") || url.includes("/sections/")) group = "练习";
                        else group = "其他";
                        groups[group] = (groups[group] || 0) + p.value;
                      }
                      const sorted = Object.entries(groups)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 7);
                      return (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={sorted.map(([n, v]) => ({ name: n, value: v }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {sorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => [`${fmt(v)} (${(v / totalTop * 100).toFixed(1)}%)`, ""]} />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                )}
                {/* Sources */}
                {sourceData.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-1">流量来源</h4>
                    <div className="grid grid-cols-3 gap-1">
                      {sourceData.slice(0, 6).map((s) => (
                        <div key={s.name} className="text-center p-1 bg-gray-50 rounded">
                          <div className="text-xs font-bold text-gray-700">{fmt(s.value)}</div>
                          <div className="text-[10px] text-gray-400">{s.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        }
      }}
    </WidgetCard>
  );
}
