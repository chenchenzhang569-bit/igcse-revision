"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface PaidSubject {
  id: string;
  name: string;
  expires_at: string | null;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  paid_subjects: PaidSubject[];
  total_paid: number;
  purchase_count: number;
  invite_count: number;
  paid_invites: number;
  invite_code: string;
  invited_by: string | null;
}

interface Purchase {
  id: string;
  user_id: string;
  subject_id: string | null;
  subject_name: string;
  amount_cny: number;
  status: string;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface Subject {
  id: string;
  display_name: string;
  code: string | null;
  board_name: string;
}

interface EditForm {
  subject_id: string;
  amount_cny: number;
  expires_at: string;
  status: string;
}

interface EditModal {
  purchase: Purchase | null;
  mode: "edit" | "add";
}

const STATUS_OPTIONS = [
  { value: "paid", label: "已付款", color: "text-emerald-600" },
  { value: "trial", label: "试用中", color: "text-blue-600" },
  { value: "pending", label: "待付款（无权限）", color: "text-red-500" },
  { value: "refunded", label: "已退款", color: "text-gray-400" },
  { value: "expired", label: "已过期", color: "text-amber-600" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ purchases: Purchase[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [filteredPurchases, setFilteredPurchases] = useState(0);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editForm, setEditForm] = useState<EditForm>({
    subject_id: "",
    amount_cny: 0,
    expires_at: "",
    status: "paid",
  });

  // Auth
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null);
    });
  }, []);

  // Fetch subjects for dropdown
  useEffect(() => {
    if (!token) return;
    fetch("/api/subjects", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.subjects || [];
        setSubjects(arr);
      })
      .catch(() => {});
  }, [token]);

  // Fetch users
  const fetchUsers = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);

    fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Expand user detail
  const toggleExpand = async (userId: string, showAll?: boolean) => {
    if (expandedId === userId && showAll === undefined) {
      setExpandedId(null);
      setDetail(null);
      setShowAllPurchases(false);
      return;
    }
    setExpandedId(userId);
    setDetailLoading(true);
    const showAllParam = showAll !== undefined ? showAll : showAllPurchases;
    const url = `/api/admin/users/${userId}${showAllParam ? "?showAll=true" : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token || ""}` },
    });
    const d = await res.json();
    setDetail({ purchases: d.purchases || [] });
    setTotalPurchases(d.total || 0);
    setFilteredPurchases(d.filtered || 0);
    setDetailLoading(false);
  };

  // Refresh current detail without toggling
  const refreshDetail = async () => {
    if (!expandedId) return;
    setDetailLoading(true);
    const url = `/api/admin/users/${expandedId}${showAllPurchases ? "?showAll=true" : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token || ""}` },
    });
    const d = await res.json();
    setDetail({ purchases: d.purchases || [] });
    setTotalPurchases(d.total || 0);
    setFilteredPurchases(d.filtered || 0);
    setDetailLoading(false);
  };

  // Ban/unban
  const toggleBan = async (user: UserRow) => {
    const action = user.banned ? "unban" : "ban";
    if (!confirm(`${action} ${user.email}?`)) return;

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: user.id, ban: !user.banned }),
    });

    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, banned: !u.banned } : u))
      );
    }
  };

  // Open edit modal
  const openEdit = (p: Purchase) => {
    setEditModal({ purchase: p, mode: "edit" });
    setEditForm({
      subject_id: p.subject_id || "",
      amount_cny: Math.round(p.amount_cny / 100),
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : "",
      status: p.status,
    });
  };

  // Open add modal
  const openAdd = () => {
    setEditModal({ purchase: null, mode: "add" });
    setEditForm({ subject_id: "", amount_cny: 250, expires_at: "", status: "paid" });
  };

  // Save purchase (add or edit)
  const savePurchase = async () => {
    if (!expandedId || !token) return;

    const payload = {
      subject_id: editForm.subject_id || null,
      amount_cny: editForm.amount_cny * 100, // fen
      expires_at: editForm.expires_at || null,
      status: editForm.status,
    };

    if (editModal?.mode === "edit" && editModal.purchase) {
      const res = await fetch(`/api/admin/users/${expandedId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchaseId: editModal.purchase.id,
          ...payload,
        }),
      });
      if (res.ok) {
        setEditModal(null);
        refreshDetail();
      }
    } else {
      const res = await fetch(`/api/admin/users/${expandedId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditModal(null);
        toggleExpand(expandedId);
      }
    }
  };

  // Delete purchase
  const deletePurchase = async (purchaseId: string) => {
    if (!expandedId || !token || !confirm("Delete this purchase?")) return;

    const res = await fetch(
      `/api/admin/users/${expandedId}?purchaseId=${purchaseId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.ok) {
      setDetail((prev) =>
        prev
          ? {
              purchases: prev.purchases.filter((p) => p.id !== purchaseId),
            }
          : null
      );
    }
  };

  const totalPages = Math.ceil(total / 20);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("zh-CN");
  };

  const formatAmount = (fen: number) => `¥${(fen / 100).toFixed(0)}`;

  const statusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    if (!opt) return status;
    return <span className={`text-xs font-medium ${opt.color}`}>{opt.label}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-primary-900 mb-6">👤 用户管理</h1>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="搜索邮箱..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20"
        />
      </div>

      {/* Stats */}
      <p className="text-sm text-gray-400 mb-4">
        {total} users found
        {search && ` · searching: "${search}"`}
      </p>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white border rounded-xl overflow-hidden"
            >
              {/* Main row */}
              <button
                onClick={() => toggleExpand(user.id)}
                className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user.banned && (
                      <span className="mr-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        BANNED
                      </span>
                    )}
                    {user.email}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>注册: {formatDate(user.created_at)}</span>
                    {user.last_sign_in_at && (
                      <span>最后登录: {formatDate(user.last_sign_in_at)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-accent-500">
                    {user.total_paid > 0
                      ? `${formatAmount(user.total_paid)}`
                      : "免费"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user.purchase_count} 科
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-gray-600">
                    邀请 {user.invite_count || 0}
                  </p>
                  <p className="text-xs text-gray-400">
                    付费 {user.paid_invites || 0}
                  </p>
                </div>

                <span className="text-gray-300 text-sm">
                  {expandedId === user.id ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded detail */}
              {expandedId === user.id && (
                <div className="px-4 pb-4 border-t pt-3 bg-gray-50">
                  {/* Ban button */}
                  <div className="mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBan(user);
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                        user.banned
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                    >
                      {user.banned ? "✅ 解封" : "🔒 封禁"}
                    </button>
                  </div>

                  {/* Purchases */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500">
                        购买记录
                        {totalPurchases > filteredPurchases && (
                          <span className="text-gray-300 ml-1">
                            ({filteredPurchases}/{totalPurchases})
                          </span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        {totalPurchases > filteredPurchases && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newShowAll = !showAllPurchases;
                              setShowAllPurchases(newShowAll);
                              toggleExpand(user.id, newShowAll);
                            }}
                            className="text-xs font-semibold text-gray-400 hover:text-primary-900"
                          >
                            {showAllPurchases ? "隐藏 pending" : "显示全部"}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdd();
                          }}
                          className="text-xs font-semibold text-primary-900 hover:underline"
                        >
                          + 添加购买
                        </button>
                      </div>
                    </div>

                    {detailLoading ? (
                      <p className="text-xs text-gray-400">Loading...</p>
                    ) : !detail?.purchases.length ? (
                      <p className="text-xs text-gray-400">暂无购买记录</p>
                    ) : (
                      <div className="space-y-1">
                        {detail.purchases.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-white border rounded-lg px-3 py-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700">
                                {p.subject_name || "📚 全科"}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-2">
                                <span>{formatAmount(p.amount_cny)}</span>
                                <span>·</span>
                                <span>
                                  到期 {formatDate(p.expires_at)}
                                </span>
                                <span>·</span>
                                {statusBadge(p.status)}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(p);
                                }}
                                className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1"
                              >
                                编辑
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePurchase(p.id);
                                }}
                                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
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

      {/* Edit/Add Modal */}
      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setEditModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary-900 mb-4">
              {editModal.mode === "edit" ? "编辑购买记录" : "添加购买"}
            </h3>

            {/* Subject */}
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              科目
            </label>
            <select
              value={editForm.subject_id}
              onChange={(e) =>
                setEditForm({ ...editForm, subject_id: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            >
              <option value="">— 全科（¥250）—</option>
              <option value="" disabled>── 单科 ──</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.board_name} {s.display_name}{s.code ? ` · ${s.code}` : ""}
                </option>))} 
            </select>

            {/* Amount */}
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              金额 (¥)
            </label>
            <input
              type="number"
              value={editForm.amount_cny}
              onChange={(e) =>
                setEditForm({ ...editForm, amount_cny: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            />

            {/* Expires */}
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              到期日期
            </label>
            <input
              type="date"
              value={editForm.expires_at}
              onChange={(e) =>
                setEditForm({ ...editForm, expires_at: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            />

            {/* Status */}
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              状态
            </label>
            <select
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={savePurchase}
                className="flex-1 py-2 rounded-xl bg-primary-900 text-white text-sm font-semibold hover:bg-primary-800 transition"
              >
                保存
              </button>
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
