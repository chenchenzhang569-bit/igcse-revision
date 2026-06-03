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
            const allPages = Object.entries(stats.pages || {}).map(([k, v]) => ({ name: k, value: v }));
            const totalAll = allPages.reduce((s, p) => s + p.value, 0);
            const subjNames: Record<string, string> = {
              "caie-mathematics-0580": "数学 0580",
              "caie-additional-mathematics-0606": "附加数学 0606",
              "caie-physics-0625": "物理 0625",
              "caie-chemistry-0620": "化学 0620",
              "caie-biology-0610": "生物 0610",
              "caie-economics-0455": "经济 0455",
              "caie-computer-science-0478": "计算机 0478",
            };
            const bySubj: Record<string, number> = {};
            for (const p of allPages) {
              for (const [slug, name] of Object.entries(subjNames)) {
                if (p.name.includes(slug)) { bySubj[name] = (bySubj[name] || 0) + p.value; break; }
              }
            }
            const subjSorted = Object.entries(bySubj).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const byType: Record<string, number> = {};
            for (const p of allPages) {
              const url = p.name;
              const tabMatch = url.match(/[?&]tab=([^&]+)/);
              const tab = tabMatch ? tabMatch[1].toLowerCase() : null;
              if (tab === "past-papers" || tab === "pastpaper") byType["真题"] = (byType["真题"] || 0) + p.value;
              else if (tab === "mock-exams" || tab === "mockexam") byType["模拟考"] = (byType["模拟考"] || 0) + p.value;
              else if (tab === "mcq") byType["MCQ"] = (byType["MCQ"] || 0) + p.value;
              else if (tab === "notes") byType["笔记"] = (byType["笔记"] || 0) + p.value;
              else if (tab === "questions" || tab === "structured") byType["练习"] = (byType["练习"] || 0) + p.value;
              else if (url.startsWith("/past-papers")) byType["真题"] = (byType["真题"] || 0) + p.value;
              else if (url.startsWith("/mock-exams")) byType["模拟考"] = (byType["模拟考"] || 0) + p.value;
            }
            const typeSorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);

            return (
              <div className="space-y-6">
                {/* Row 1: Today + Total + Week all in one line */}
                <div className="flex items-center justify-around bg-gray-50 rounded-xl px-4 py-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary-900">{fmt(stats.today_pv)} <span className="text-xs font-normal text-gray-500">PV</span></div>
                    <div className="text-xs text-gray-500">今日 PV</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-700">{fmt(stats.total_pv)} <span className="text-xs font-normal text-gray-500">PV</span></div>
                    <div className="text-xs text-gray-500">累计 PV</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-indigo-600">{fmt(stats.week_pv)} <span className="text-xs font-normal text-gray-500">PV</span></div>
                    <div className="text-xs text-gray-500">本周 PV</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{fmt(stats.today_visitors)} <span className="text-xs font-normal text-gray-500">访客</span></div>
                    <div className="text-xs text-gray-500">今日访客</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{fmt(stats.total_visitors)} <span className="text-xs font-normal text-gray-500">访客</span></div>
                    <div className="text-xs text-gray-500">总访客</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-rose-600">{stats.bounce_rate}%</div>
                    <div className="text-xs text-gray-500">跳出率</div>
                  </div>
                </div>

                {/* Hot data - two PieCharts side by side, bigger */}
                {totalAll > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border rounded-xl p-3">
                        <h5 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1">📋 按题型</h5>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={typeSorted.map(([n, v]) => ({ name: n, value: v }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                              {typeSorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => [`${fmt(v)} (${(v / totalAll * 100).toFixed(1)}%)`, ""]} contentStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-white border rounded-xl p-3">
                        <h5 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1">🏫 按科目</h5>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={subjSorted.map(([n, v]) => ({ name: n, value: v }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name.replace(" 0", " ")} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                              {subjSorted.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => [`${fmt(v)} (${(v / totalAll * 100).toFixed(1)}%)`, ""]} contentStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sources */}
                {sourceData.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-2">🔗 流量来源</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {sourceData.slice(0, 8).map((s) => (
                        <div key={s.name} className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-sm font-bold text-gray-700">{fmt(s.value)}</div>
                          <div className="text-[10px] text-gray-400 truncate">{s.name}</div>
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
