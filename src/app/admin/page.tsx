"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import WidgetCard from "./widgets/WidgetCard";
import QuestionDistWidget from "./widgets/QuestionDistWidget";
import SubjectQAWidget from "./widgets/SubjectQAWidget";
import SiteAnalyticsWidget from "./widgets/SiteAnalyticsWidget";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#001C71", "#FF8C00", "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#06B6D4"];

type DashboardData = {
  traffic: { dau: number; mau: number; today_signups: number; week_signups: number };
  users: { total: number; paid: number; trial_active: number; week_new_paid: number };
  revenue: { total: number; week: number };
  invites: { total: number; paid: number; conversion: number };
  sources: Record<string, number>;
  question_distribution: { name: string; count: number }[];
  available_subjects: { id: string; name: string }[];
};

const WIDGET_STORAGE_KEY = "admin_widget_hidden";
const ORDER_STORAGE_KEY = "admin_widget_order";

const DEFAULT_ORDER = ["overview", "analytics", "payment", "revenue", "invites", "dau", "signups", "sources", "questions", "qa"];

function loadOrder(): string[] {
  try { const v = localStorage.getItem(ORDER_STORAGE_KEY); return v ? JSON.parse(v) : DEFAULT_ORDER; } catch { return DEFAULT_ORDER; }
}
function saveOrder(order: string[]) { localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order)); }
function loadHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY) || "[]")); } catch { return new Set(); }
}
function saveHidden(hidden: Set<string>) { localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify([...hidden])); }

function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-2 text-gray-400 hover:text-gray-600 select-none px-2 py-1 rounded hover:bg-gray-100 text-lg" title="拖拽排序">⠿</button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tsData, setTsData] = useState<{ date: string; dau: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 2 } }));

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.auth.getSession().then(({ data: s }) => setToken(s.session?.access_token || null));
    setHidden(loadHidden());
    setOrder(loadOrder());
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    fetch("/api/admin/login-events?days=30", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setTsData).catch(() => {});
  }, [token]);

  const toggleWidget = (id: string) => {
    setHidden(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); saveHidden(n); return n; });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder(prev => {
      const oldIdx = prev.indexOf(active.id);
      const newIdx = prev.indexOf(over.id);
      const newOrder = arrayMove(prev, oldIdx, newIdx);
      saveOrder(newOrder);
      return newOrder;
    });
  };

  if (loading || !data || order.length === 0) {
    return <div className="p-8 text-gray-400">Loading dashboard...</div>;
  }

  const fmt = (n: number) => n.toLocaleString();
  const fmtYuan = (fen: number) => `¥${(fen / 100).toFixed(0)}`;

  const visibleOrder = order.filter(id => !hidden.has(id));
  const hiddenList = order.filter(id => hidden.has(id));

  const renderWidget = (id: string) => {
    switch (id) {
      case "overview": return (
        <WidgetCard title="⭐ 实时概览" defaultView="card" widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {() => (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-primary-900">{fmt(data.traffic.dau)}</div><div className="text-xs text-gray-500">今日活跃</div></div>
              <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-700">{fmt(data.traffic.week_signups)}</div><div className="text-xs text-gray-500">本周新注册</div></div>
              <div className="text-center p-3 bg-orange-50 rounded-lg"><div className="text-2xl font-bold text-orange-600">{fmt(data.users.total)}</div><div className="text-xs text-gray-500">总用户</div></div>
              <div className="text-center p-3 bg-purple-50 rounded-lg"><div className="text-2xl font-bold text-purple-600">{fmt(data.users.paid)}</div><div className="text-xs text-gray-500">付费用户</div></div>
            </div>
          )}
        </WidgetCard>
      );
      case "payment": return (
        <WidgetCard title="⭐ 付费状态" defaultView="card" views={["card", "pie"]} widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {(view) => view === "pie" ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[{ name: "Paid", value: data.users.paid }, { name: "Trial", value: data.users.trial_active }, { name: "Free", value: Math.max(0, data.users.total - data.users.paid - data.users.trial_active) }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie><Tooltip />
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
      );
      case "revenue": return (
        <WidgetCard title="⭐ 收入" defaultView="card" views={["card", "bar"]} widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {(view) => view === "bar" ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: "本周", value: data.revenue.week }, { name: "总计", value: data.revenue.total }]}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(v: number) => `¥${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={(v: number) => fmtYuan(v)} /><Bar dataKey="value" fill="#FF8C00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-orange-50 rounded-lg"><div className="text-2xl font-bold text-orange-600">{fmtYuan(data.revenue.week)}</div><div className="text-xs text-gray-500">本周收入</div></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-2xl font-bold text-gray-700">{fmtYuan(data.revenue.total)}</div><div className="text-xs text-gray-500">总收入</div></div>
            </div>
          )}
        </WidgetCard>
      );
      case "invites": return (
        <WidgetCard title="⭐ 邀请统计" defaultView="card" views={["card", "table"]} widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {(view) => view === "table" ? (
            <table className="w-full text-sm"><tbody>
              <tr className="border-b"><td className="py-2 text-gray-500">总邀请</td><td className="text-right font-semibold">{fmt(data.invites.total)}</td></tr>
              <tr className="border-b"><td className="py-2 text-gray-500">付费邀请</td><td className="text-right font-semibold">{fmt(data.invites.paid)}</td></tr>
              <tr><td className="py-2 text-gray-500">转化率</td><td className="text-right font-semibold">{data.invites.conversion}%</td></tr>
            </tbody></table>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-primary-900">{fmt(data.invites.total)}</div><div className="text-xs text-gray-500">总邀请</div></div>
              <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-700">{fmt(data.invites.paid)}</div><div className="text-xs text-gray-500">付费邀请</div></div>
              <div className="text-center p-3 bg-purple-50 rounded-lg"><div className="text-2xl font-bold text-purple-600">{data.invites.conversion}%</div><div className="text-xs text-gray-500">转化率</div></div>
            </div>
          )}
        </WidgetCard>
      );
      case "dau": return (
        <WidgetCard title="📊 DAU / MAU" defaultView="card" views={["card", "bar"]} widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {(view) => view === "bar" ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tsData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} /><Tooltip /><Bar dataKey="dau" fill="#001C71" radius={[2, 2, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-primary-900">{fmt(data.traffic.dau)}</div><div className="text-xs text-gray-500">DAU (今日)</div></div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg"><div className="text-2xl font-bold text-indigo-600">{fmt(data.traffic.mau)}</div><div className="text-xs text-gray-500">MAU (30天)</div></div>
            </div>
          )}
        </WidgetCard>
      );
      case "signups": return (
        <WidgetCard title="📈 用户增长" defaultView="card" widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {() => (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-primary-900">{fmt(data.traffic.today_signups)}</div><div className="text-xs text-gray-500">今日注册</div></div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg"><div className="text-2xl font-bold text-indigo-600">{fmt(data.traffic.week_signups)}</div><div className="text-xs text-gray-500">本周注册</div></div>
            </div>
          )}
        </WidgetCard>
      );
      case "sources": return (
        <WidgetCard title="📱 流量来源" defaultView="card" views={["card", "pie", "table"]} widgetId={id} onToggle={() => toggleWidget(id)} hidden={false}>
          {(view) => {
            const srcArr = Object.entries(data.sources).map(([k, v]) => ({ name: k, value: v }));
            if (view === "pie") return (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={srcArr} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{COLORS.map((c, i) => <Cell key={i} fill={c} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            );
            if (view === "table") return (
              <table className="w-full text-sm"><thead><tr className="text-left text-gray-400"><th>来源</th><th className="text-right">用户</th></tr></thead>
                <tbody>{srcArr.map(s => <tr key={s.name} className="border-t"><td className="py-1.5">{s.name}</td><td className="text-right font-semibold">{fmt(s.value)}</td></tr>)}</tbody></table>
            );
            return (
              <div className="grid grid-cols-4 gap-2">{srcArr.map(s => <div key={s.name} className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-lg font-bold text-primary-900">{fmt(s.value)}</div><div className="text-xs text-gray-400">{s.name}</div></div>)}</div>
            );
          }}
        </WidgetCard>
      );
      case "questions": return <QuestionDistWidget token={token} availableSubjects={data.available_subjects} onToggle={() => toggleWidget("questions")} />;
      case "qa": return <SubjectQAWidget token={token} availableSubjects={data.available_subjects} onToggle={() => toggleWidget("qa")} />;
      case "analytics": return <SiteAnalyticsWidget token={token} onToggle={() => toggleWidget("analytics")} />;
      default: return null;
    }
  };

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-primary-900">📊 Dashboard</h1>
        {hiddenList.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => { const n = new Set<string>(); saveHidden(n); setHidden(n); }}
              className="text-xs text-gray-400 hover:text-primary-600">Show all ({hiddenList.length})</button>
            <button onClick={() => { saveOrder(DEFAULT_ORDER); setOrder(DEFAULT_ORDER); }}
              className="text-xs text-gray-400 hover:text-primary-600">重置排序</button>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleOrder.map(id => (
              id !== "analytics" && (
                <SortableWidget key={id} id={id}>
                  {renderWidget(id)}
                </SortableWidget>
              )
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Site Analytics - full width at bottom */}
      {!hidden.has("analytics") && (
        <div className="mt-4 w-full">
          <SiteAnalyticsWidget token={token} onToggle={() => toggleWidget("analytics")} />
        </div>
      )}

      {hiddenList.length > 0 && (
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">已隐藏: {hiddenList.map(id => id).join(", ")}</p>
          <div className="flex gap-2 flex-wrap">
            {hiddenList.map(id => (
              <button key={id} onClick={() => toggleWidget(id)}
                className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-100">{id}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
