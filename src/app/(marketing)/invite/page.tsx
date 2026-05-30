"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Stats = {
  inviteCode: string;
  inviteLink: string;
  totalInvited: number;
  paidCount: number;
  canClaim: boolean;
  rewardClaimed: boolean;
  rewardSubject: string | null;
  isTopInviter: boolean;
};

type Subject = { id: string; display_name: string; slug: string };

export default function InvitePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [claimMsg, setClaimMsg] = useState("");
  const [claimError, setClaimError] = useState("");
  const [user, setUser] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setUser(data.session.user);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch stats
    fetch("/api/invite/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setClaimError(d.error); setLoading(false); return; }
        setStats(d);
        setLoading(false);
      });
    
    // Fetch subjects
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d: Subject[]) => {
        // Dedupe by display_name, prefer CAIE
        const seen = new Set<string>();
        const deduped: Subject[] = [];
        for (const s of d) {
          if (!seen.has(s.display_name)) {
            seen.add(s.display_name);
            deduped.push(s);
          }
        }
        setSubjects(deduped);
      });
  }, [user]);

  const copyLink = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const claimReward = async () => {
    if (!selectedSubject) {
      setClaimError("请选择科目");
      return;
    }
    setClaiming(true);
    setClaimError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/invite/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subjectId: selectedSubject }),
      });
      const d = await res.json();
      if (d.error) setClaimError(d.error);
      else {
        setClaimMsg("✅ 领取成功！免费使用1年");
        setStats((prev) => prev ? { ...prev, rewardClaimed: true, canClaim: false } : prev);
      }
    } catch {
      setClaimError("网络错误");
    }
    setClaiming(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!stats) return <div className="text-center py-20 text-red-500">加载失败</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-primary-900 mb-2">邀请好友</h1>
      <p className="text-gray-500 mb-8">邀请3位付费用户 → 免费获得1科1年 + 学霸家长徽章</p>

      {/* Stats Card */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {stats.isTopInviter && (
            <span className="text-2xl" title="学霸家长">🏆</span>
          )}
          <div>
            <div className="text-3xl font-bold text-primary-900">{stats.paidCount}<span className="text-lg text-gray-400 font-normal">/3</span></div>
            <div className="text-sm text-gray-500">已付费邀请</div>
          </div>
          {stats.rewardClaimed && (
            <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">已领取</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (stats.paidCount / 3) * 100)}%` }}
          />
        </div>

        <div className="flex gap-6 text-sm text-gray-500">
          <span>共邀请 <strong className="text-gray-800">{stats.totalInvited}</strong> 人</span>
          <span><strong className="text-gray-800">{stats.paidCount}</strong> 人付费</span>
        </div>

        {/* Badge */}
        {stats.rewardClaimed && (
          <div className="mt-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-medium text-yellow-800">学霸家长</div>
              <div className="text-xs text-yellow-600">已领取奖励</div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Link */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">你的邀请链接</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={stats.inviteLink}
            className="flex-1 px-3 py-2 border rounded-lg text-sm text-gray-600 bg-gray-50"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
          >
            {copied ? "已复制 ✓" : "复制"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">分享到微信群、朋友圈或直接发给好友</p>
      </div>

      {/* Claim Reward */}
      {stats.canClaim && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="font-semibold text-green-800 mb-1">🎉 你已达标！</h2>
          <p className="text-sm text-green-600 mb-4">选择一科免费领取1年使用权</p>
          
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
          >
            <option value="">选择科目...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>

          <button
            onClick={claimReward}
            disabled={claiming || !selectedSubject}
            className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            {claiming ? "领取中..." : "领取免费科目"}
          </button>

          {claimError && <p className="text-red-600 text-sm mt-2">{claimError}</p>}
          {claimMsg && <p className="text-green-700 text-sm mt-2">{claimMsg}</p>}
        </div>
      )}
    </div>
  );
}
