"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface ErrorReport {
  id: string;
  user_email: string | null;
  url: string | null;
  message: string;
  stack: string | null;
  user_agent: string | null;
  status: "new" | "in_progress" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "🆕 New" },
  { key: "in_progress", label: "🔧 In Progress" },
  { key: "resolved", label: "✅ Resolved" },
];

const STATUS_BADGE: Record<string, string> = {
  new: "bg-red-50 text-red-600 border-red-200",
  in_progress: "bg-amber-50 text-amber-600 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/admin/errors?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setErrors(d.errors || []);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, page, statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    const res = await fetch("/api/admin/errors", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      setErrors((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: newStatus as ErrorReport["status"],
                resolved_at:
                  newStatus === "resolved" ? new Date().toISOString() : e.resolved_at,
              }
            : e
        )
      );
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-primary-900 mb-6">🐛 错误报告</h1>

      {/* 测试按钮 */}
      <button
        onClick={async () => {
          try {
            const res = await fetch("/api/errors/report", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: `Test error triggered manually at ${new Date().toISOString()}`,
                url: location.pathname,
                userAgent: navigator.userAgent,
              }),
            });
            const d = await res.json();
            alert(d.success ? "✅ Error reported! Refresh to see it." : "❌ Failed: " + (d.error || "unknown"));
          } catch (e: any) {
            alert("Network error: " + e.message);
          }
        }}
        className="mb-6 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
      >
        🧪 Trigger Test Error
      </button>

      {/* 状态筛选 */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              statusFilter === tab.key
                ? "bg-primary-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 统计 */}
      <p className="text-sm text-gray-400 mb-4">
        {total} reports found
        {statusFilter !== "all" && ` · filtered: ${statusFilter}`}
      </p>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : errors.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🎉</span>
          <p className="text-gray-400 mt-4 text-lg">No errors reported yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((err) => (
            <div
              key={err.id}
              className="bg-white border rounded-xl overflow-hidden"
            >
              {/* 主行 */}
              <button
                onClick={() =>
                  setExpandedId(expandedId === err.id ? null : err.id)
                }
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 transition"
              >
                <span
                  className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    STATUS_BADGE[err.status]
                  }`}
                >
                  {err.status === "new"
                    ? "New"
                    : err.status === "in_progress"
                    ? "In Progress"
                    : "Resolved"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {err.message}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {err.url && <span>{err.url}</span>}
                    {err.user_email && <span>{err.user_email}</span>}
                    <span>{timeAgo(err.created_at)}</span>
                  </div>
                </div>
                <span className="text-gray-300 text-sm shrink-0">
                  {expandedId === err.id ? "▲" : "▼"}
                </span>
              </button>

              {/* 展开详情 */}
              {expandedId === err.id && (
                <div className="px-4 pb-4 border-t pt-3 bg-gray-50">
                  {err.stack && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Stack Trace
                      </p>
                      <pre className="text-xs text-gray-600 bg-gray-100 rounded-lg p-3 overflow-x-auto max-h-48">
                        {err.stack}
                      </pre>
                    </div>
                  )}
                  {err.user_agent && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        User Agent
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        {err.user_agent}
                      </p>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    {err.status === "new" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(err.id, "in_progress");
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                      >
                        Mark In Progress
                      </button>
                    )}
                    {(err.status === "new" || err.status === "in_progress") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(err.id, "resolved");
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {err.status === "resolved" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(err.id, "new");
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                page === p
                  ? "bg-primary-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
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
