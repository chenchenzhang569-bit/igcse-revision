"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import ErrorReporter from "@/components/ErrorReporter";

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
  const { user, signOut, warning } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/admin/check-role", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const d = await res.json();
        if (d.isAdmin) setIsAdmin(true);
      } catch {}
    };
    check();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global error catcher */}
      <ErrorReporter />
      {/* Security Warning Banner */}
      {warning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-sm text-amber-800 font-semibold">{warning}</p>
        </div>
      )}

      {/* Top header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-5 h-[60px] flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="IGMaster"
              width={129}
              height={54}
              className="h-11 sm:h-14 w-auto"
              priority
            />
          </Link>

          {/* Center: Dashboard label */}
          <span className="text-xl font-extrabold tracking-tight text-primary-900 hidden sm:block">
            Dashboard
          </span>

          {/* Right: admin link + user info + sign out */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-accent-500 transition mr-2"
              >
                <span className="text-base">⚙️</span>
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            {user && (
              <>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-xs sm:text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[160px]">{user.email}</span>
                <button
                  onClick={signOut}
                  className="text-xs text-gray-400 hover:text-accent-500 transition"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-5 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
