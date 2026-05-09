"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "📊 仪表盘", exact: true },
  { href: "/admin/subjects", label: "📚 科目管理" },
  { href: "/admin/topics", label: "📂 主题管理" },
  { href: "/admin/notes", label: "📝 笔记管理" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
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
