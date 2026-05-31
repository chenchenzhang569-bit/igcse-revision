"use client";

import { useState, useEffect, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useT } from "@/lib/i18n/LanguageContext";
import { useSearchParams } from "next/navigation";

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

function InviteContent() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [claimMsg, setClaimMsg] = useState("");
  const [claimError, setClaimError] = useState("");
  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get("code") || "";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        if (!inviteParam) window.location.href = "/login";
        else setLoading(false);
        return;
      }
      setUser(data.session.user);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/invite/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setClaimError(d.error); setLoading(false); return; }
        setStats(d);
        setLoading(false);
      });

    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d: Subject[]) => {
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

  if (loading) return <div className="text-center py-20 text-gray-400">{t("common", "loading")}</div>;

  if (inviteParam && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-primary-900 mb-4">You've been invited! 🎉</h1>
        <p className="text-gray-500 mb-6">Create an account to accept the invitation and start practicing.</p>
        <a
          href={`/register?code=${inviteParam}`}
          className="inline-block bg-accent-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent-600 transition"
        >
          Sign Up →
        </a>
        <p className="text-xs text-gray-400 mt-4">Already have an account? <a href="/login" className="text-primary-600 underline">Sign in</a></p>
      </div>
    );
  }

  if (!stats) return <div className="text-center py-20 text-red-500">{t("common", "error")}</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-primary-900 mb-2">{t("invite", "title")}</h1>
      <p className="text-gray-500 mb-8">{t("invite", "subtitle")}</p>

      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {stats.isTopInviter && (
            <span className="text-2xl" title={t("invite", "badgeName")}>🏆</span>
          )}
          <div>
            <div className="text-3xl font-bold text-primary-900">{stats.paidCount}<span className="text-lg text-gray-400 font-normal">/3</span></div>
            <div className="text-sm text-gray-500">{t("invite", "paidCount")}</div>
          </div>
          {stats.rewardClaimed && (
            <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">{t("invite", "claimed")}</span>
          )}
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (stats.paidCount / 3) * 100)}%` }}
          />
        </div>

        <div className="flex gap-6 text-sm text-gray-500">
          <span>{t("invite", "totalInvited")} <strong className="text-gray-800">{stats.totalInvited}</strong></span>
          <span><strong className="text-gray-800">{stats.paidCount}</strong> {t("invite", "paidLabel")}</span>
        </div>

        {stats.rewardClaimed && (
          <div className="mt-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-medium text-yellow-800">{t("invite", "badgeName")}</div>
              <div className="text-xs text-yellow-600">{t("invite", "badgeDesc")}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">{t("invite", "inviteLink")}</h2>
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
            {copied ? t("invite", "copied") : t("invite", "copy")}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">{t("invite", "shareHint")}</p>
      </div>

      {stats.canClaim && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="font-semibold text-green-800 mb-1">🎉 {t("invite", "claimTitle")}</h2>
          <p className="text-sm text-green-600 mb-4">{t("invite", "claimDesc")}</p>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
          >
            <option value="">{t("invite", "selectSubject")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>

          <button
            onClick={claimReward}
            disabled={claiming || !selectedSubject}
            className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            {claiming ? t("invite", "claiming") : t("invite", "claimCta")}
          </button>

          {claimError && <p className="text-red-600 text-sm mt-2">{claimError}</p>}
          {claimMsg && <p className="text-green-700 text-sm mt-2">{claimMsg}</p>}
        </div>
      )}
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <InviteContent />
    </Suspense>
  );
}
