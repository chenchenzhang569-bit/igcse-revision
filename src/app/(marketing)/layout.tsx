"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

const navKeys = [
  { href: "/", key: "home" },
  { href: "/subjects", key: "subjects" },
  { href: "/past-papers", key: "pastPapers" },
  { href: "/mock-exams", key: "mockExams" },
  { href: "/pricing", key: "pricing" },
];

function Header() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="IGMaster - IGCSE Revision Platform | CAIE & Edexcel"
            width={129}
            height={54}
            className="h-11 sm:h-14 w-auto"
            priority
            fetchPriority="high"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navKeys.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="text-[1.05rem] lg:text-[1.25rem] font-extrabold text-primary-900 hover:text-accent-500 transition-colors"
            >
              {t("nav", link.key)}
            </Link>
          ))}
        </nav>

        {/* Auth + toggle + hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          {user ? (
            <>
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="font-poppins font-extrabold uppercase tracking-wider text-xs text-primary-900 border-2 border-primary-900 px-3 py-1.5 rounded hover:bg-primary-900 hover:text-white transition-colors"
                >
                  {t("nav", "dashboard")}
                </Link>
                <button
                  onClick={signOut}
                  className="font-poppins font-extrabold uppercase tracking-wider text-xs text-accent-500 border-2 border-accent-500 px-3 py-1.5 rounded hover:bg-accent-600 hover:text-white transition-colors"
                >
                  {t("nav", "logout")}
                </button>
              </div>
              <div className="flex lg:hidden items-center gap-1 mr-1">
                <Link href="/dashboard" className="font-poppins font-extrabold text-xs text-primary-900 px-1 py-1">
                  {t("nav", "dashboard")}
                </Link>
                <button onClick={signOut} className="font-poppins font-extrabold text-xs text-accent-500 px-1 py-1">
                  {t("nav", "logout")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex lg:hidden items-center gap-1 mr-1">
                <Link href="/login" className="font-poppins font-extrabold text-xs text-primary-900 px-1 py-1">
                  {t("nav", "login")}
                </Link>
                <span className="text-gray-300 text-xs">|</span>
                <Link href="/register" className="font-poppins font-extrabold text-xs text-accent-500 px-1 py-1">
                  {t("nav", "signup")}
                </Link>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/login"
                  className="font-poppins font-extrabold uppercase tracking-wider text-xs text-primary-900 border-2 border-primary-900 px-3 py-1.5 rounded hover:bg-primary-900 hover:text-white transition-colors"
                >
                  {t("nav", "login")}
                </Link>
                <Link
                  href="/register"
                  className="font-poppins font-extrabold uppercase tracking-wider text-xs bg-accent-500 border-2 border-accent-500 hover:bg-accent-600 hover:border-accent-600 text-white px-3 py-1.5 rounded transition-colors"
                >
                  {t("nav", "signup")}
                </Link>
              </div>
            </>
          )}

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

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          {navKeys.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-base font-extrabold text-primary-900 hover:text-accent-500 transition-colors py-1"
            >
              {t("nav", link.key)}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-primary-900 text-white py-8 sm:py-10 text-center px-4">
      <div className="max-w-[720px] mx-auto">
      <p className="font-poppins text-xl sm:text-2xl font-bold mb-2">IGMaster</p>
      <p className="text-white/60 mb-5 text-sm">{t("home", "heroSub")}</p>
      <p className="text-xs text-white/40 space-x-3">
        <span>&copy; 2026 IGMaster. {t("footer", "copyright")}.</span>
        <a href="mailto:support@igmaster.org" className="hover:text-white/70 transition">{t("footer", "contact")}</a>
        <span>·</span>
        <a href="/disclaimer" className="hover:text-white/70 transition">{t("footer", "disclaimer")}</a>
      </p>
      </div>
    </footer>
  );
}
