"use client";

import { useEffect, useState } from "react";
import WidgetCard from "./WidgetCard";

const MAX_DISPLAY = 5;

export default function ActivityWidget({
  token,
  onToggle,
}: {
  token: string | null;
  onToggle: () => void;
}) {
  const [data, setData] = useState<{
    recent: any[];
    summary: Record<string, number>;
    anomalies: { user_id: string; type: string; count: number; reason: string; email: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/admin/activity?hours=${hours}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, hours]);

  if (loading) {
    return (
      <WidgetCard title="🚨 活动监控" defaultView="card" widgetId="activity" hidden={false} onToggle={onToggle}>
        {() => <div className="animate-pulse h-24 bg-gray-100 rounded-lg" />}
      </WidgetCard>
    );
  }

  if (!data) {
    return (
      <WidgetCard title="🚨 活动监控" defaultView="card" widgetId="activity" hidden={false} onToggle={onToggle}>
        {() => <p className="text-sm text-gray-400 text-center py-4">暂无活动数据</p>}
      </WidgetCard>
    );
  }

  const anomalyTotal = data.anomalies.reduce((s, a) => s + a.count, 0);
  const totalActivities = Object.values(data.summary).reduce((s, v) => s + v, 0);

  return (
    <WidgetCard title="🚨 活动监控" defaultView="card" widgetId="activity" hidden={false} onToggle={onToggle}>
      {(view) => (
        <div className="space-y-4">
          {/* Period selector + summary */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[6, 24, 72].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`text-xs px-2 py-1 rounded ${
                    hours === h ? "bg-primary-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {h === 6 ? "6h" : h === 24 ? "24h" : "72h"}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{totalActivities} 次活动</span>
          </div>

          {/* Anomalies section */}
          {data.anomalies.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 font-bold text-sm">⚠️ {data.anomalies.length} 个异常用户</span>
                <span className="text-xs text-red-400">({anomalyTotal} 次操作)</span>
              </div>
              <div className="space-y-2">
                {data.anomalies.slice(0, MAX_DISPLAY).map((a, i) => (
                  <div key={i} className="bg-white rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-gray-400 truncate flex-1">{a.email}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                        a.type === "高频下载" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      }`}>{a.type}</span>
                    </div>
                    <div className="text-xs font-semibold text-red-600 mt-0.5">{a.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No anomalies */}
          {data.anomalies.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-green-600 font-semibold">✅ 未检测到异常活动</p>
              <p className="text-xs text-gray-400 mt-1">过去 {hours} 小时共 {totalActivities} 次操作</p>
            </div>
          )}

          {/* Activity summary */}
          {Object.keys(data.summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(data.summary).map(([type, count]) => (
                <div key={type} className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-700">{count}</div>
                  <div className="text-xs text-gray-400 truncate">{type}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent activity list */}
          {data.recent.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">最近活动</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {data.recent.slice(0, 20).map((log: any) => (
                  <div key={log.id} className="text-xs text-gray-600 py-1.5 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 shrink-0 w-12">
                        {new Date(log.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 shrink-0">{log.activity_type}</span>
                      <span className="truncate text-gray-500 flex-1">{log.detail || log.page_url || ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
