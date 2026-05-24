"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const contentTabs = [
  { id: "subjects", label: "📚 科目管理", tab: "subjects" },
  { id: "topics", label: "📂 主题管理", tab: "topics" },
  { id: "notes", label: "📝 笔记管理", tab: "notes" },
  { id: "questions", label: "❓ 题库管理", tab: "questions" },
];

const toolsLinks = [
  { href: "/admin/past-papers", label: "📄 历年真题" },
  { href: "/admin/mock-exams", label: "📋 模拟试卷" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?redirect=admin");
        return;
      }

      try {
        const res = await fetch("/api/admin/check-role", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { isAdmin: ok } = await res.json();
          if (ok) { setIsAdmin(true); setChecking(false); return; }
        }
      } catch {}

      router.replace("/dashboard");
    };
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-400">Checking permissions...</p>
      </div>
    );
  }

  if (!isAdmin) return null; // redirect already triggered

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link href="/admin" className="text-lg font-bold">
            ⚙️ 管理后台
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-1">内容管理</p>
          {contentTabs.map((item) => {
            const active = pathname === "/admin";
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/admin?tab=${item.tab}`)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-1 mt-4">资源管理</p>
          {toolsLinks.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← 返回前台
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
