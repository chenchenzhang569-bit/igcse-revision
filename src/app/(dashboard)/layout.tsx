"use client";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6 border-b">
          <a href="/dashboard" className="text-xl font-bold text-primary-600">
            🎓 IGCSE
          </a>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            📊 仪表盘
          </a>
          <a
            href="/subjects"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            📚 浏览科目
          </a>
        </nav>
        <div className="p-4 border-t">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm flex-1 min-w-0">
                <p className="text-gray-700 font-medium truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3 flex items-center justify-between">
        <a href="/dashboard" className="text-lg font-bold text-primary-600">
          🎓 IGCSE
        </a>
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-xs">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="text-xs text-gray-400 hover:text-red-500 transition"
            >
              退出
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 mt-14 md:mt-0">{children}</main>
    </div>
  );
}
