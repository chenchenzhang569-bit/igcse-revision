"use client";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "📊 Dashboard" },
    { href: "/subjects", label: "📚 Browse Subjects" },
    { href: "/past-papers", label: "📄 Past Papers" },
    { href: "/dashboard/my-bank", label: "💾 My Question Bank" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header — full width, logo same size as homepage */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-5 h-[60px] flex items-center justify-between">
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

          {/* Desktop: user info + sign out */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-600 truncate max-w-[160px]">{user.email}</span>
                <button
                  onClick={signOut}
                  className="text-xs text-gray-400 hover:text-accent-500 transition"
                >
                  Sign out
                </button>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <>
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={signOut}
                  className="text-xs text-gray-400 hover:text-accent-500 transition mr-1"
                >
                  Sign out
                </button>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden px-4 pb-3 space-y-1 border-t bg-white">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main content — full width, no sidebar */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-5 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
