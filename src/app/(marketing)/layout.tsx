import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/subjects", label: "Revision" },
  { href: "/past-papers", label: "Past Paper" },
  { href: "/subjects", label: "Notes" },
  { href: "/pricing", label: "Purchase" },
  { href: "/submit-errors", label: "Submit Errors" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav — matches design spec */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-5 h-[72px] flex items-center justify-between">
          <Link href="/" className="font-urbanist text-2xl font-bold text-primary-900">
            Master
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[0.95rem] font-semibold text-primary-900 hover:text-accent-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="font-urbanist font-bold uppercase tracking-wider text-[0.85rem] text-primary-900 border-2 border-primary-900 px-5 py-2.5 rounded hover:bg-primary-900 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="font-urbanist font-bold uppercase tracking-wider text-[0.85rem] bg-accent-500 hover:bg-accent-600 text-white px-5 py-2.5 rounded transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary-900 text-white py-10 text-center">
        <p className="font-urbanist text-2xl font-bold mb-2">Master</p>
        <p className="text-white/60 mb-5 text-sm">Targeted Preparation for IGCSE Success.</p>
        <p className="text-xs text-white/40">
          &copy; 2026 Master IGCSE Revision. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
