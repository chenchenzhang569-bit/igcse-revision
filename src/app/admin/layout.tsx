"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const menuItems = [
  { href: "/admin", label: "📊 Dashboard", icon: "📊" },
  { href: "/admin/upload", label: "📤 文档上传", icon: "📤" },
  { href: "/admin/users", label: "👤 用户管理", icon: "👤" },
  { href: "/admin/errors", label: "🐛 错误报告", icon: "🐛" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

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

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="w-56 bg-gray-900 text-white flex-col hidden md:flex">
        <div className="p-5 border-b border-gray-800">
          <Link href="/admin" className="text-lg font-bold">
            ⚙️ 管理后台
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href
              || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label.replace(/^.\s/, "")}</span>
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

      {/* ---- Mobile top bar ---- */}
      <div className="md:hidden fixed top-0 inset-x-0 h-12 bg-gray-900 flex items-center px-3 z-50">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white text-xl">
          ☰
        </button>
        <span className="ml-3 text-white font-bold text-sm">⚙️ 管理后台</span>
      </div>

      {/* ---- Mobile overlay + sidebar ---- */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={closeMobileMenu}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-gray-900 text-white z-50 pt-12">
            <nav className="p-3 space-y-1">
              {menuItems.map((item) => {
                const active = pathname === item.href
                  || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition ${
                      active
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label.replace(/^.\s/, "")}</span>
                  </Link>
                );
              })}
              <hr className="border-gray-800 my-2" />
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                ← 返回前台
              </Link>
            </nav>
          </aside>
        </>
      )}

      {/* ---- Main content ---- */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
