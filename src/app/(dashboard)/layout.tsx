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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6 border-b">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="IGMaster"
              width={120}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/subjects"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            📚 Browse Subjects
          </Link>
          <Link
            href="/past-papers"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            📄 Past Papers
          </Link>
          <Link
            href="/dashboard/my-bank"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            💾 My Question Bank
          </Link>
        </nav>
        <div className="p-4 border-t">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm flex-1 min-w-0">
                <p className="text-gray-700 font-medium truncate">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-accent-500 transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary-900">
            <Image src="/logo.png" alt="IGMaster" width={100} height={42} className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
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
        {mobileMenuOpen && (
          <nav className="px-4 pb-3 space-y-1 border-t bg-white">
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
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 mt-14 md:mt-0">{children}</main>
    </div>
  );
}
