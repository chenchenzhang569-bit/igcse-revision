"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/subjects", label: "Revision" },
  { href: "/past-papers", label: "Past Paper" },
  { href: "/subjects", label: "Notes" },
  { href: "/pricing", label: "Purchase" },
  { href: "/submit-errors", label: "Submit Errors" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
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

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[0.95rem] lg:text-[1.15rem] font-extrabold text-primary-900 hover:text-accent-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile auth — compact text */}
            <div className="flex lg:hidden items-center gap-1 mr-1">
              <Link href="/login" className="font-poppins font-extrabold text-xs text-primary-900 px-1 py-1">
                Login
              </Link>
              <span className="text-gray-300 text-xs">|</span>
              <Link href="/register" className="font-poppins font-extrabold text-xs text-accent-500 px-1 py-1">
                Register
              </Link>
            </div>

            {/* Desktop auth — small buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/login"
                className="font-poppins font-extrabold uppercase tracking-wider text-xs text-primary-900 border-2 border-primary-900 px-3 py-1.5 rounded hover:bg-primary-900 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="font-poppins font-extrabold uppercase tracking-wider text-xs bg-accent-500 border-2 border-accent-500 hover:bg-accent-600 hover:border-accent-600 text-white px-3 py-1.5 rounded transition-colors"
              >
                Register
              </Link>
            </div>

            {/* Hamburger */}
            <button
              className="lg:hidden p-1.5 text-primary-900"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown — nav only */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-base font-extrabold text-primary-900 hover:text-accent-500 transition-colors py-1"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary-900 text-white py-8 sm:py-10 text-center px-4">
        <p className="font-poppins text-xl sm:text-2xl font-bold mb-2">IGMaster</p>
        <p className="text-white/60 mb-5 text-sm">Targeted Preparation for IGCSE Success.</p>
        <p className="text-xs text-white/40">
          &copy; 2026 Master IGCSE Revision. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
