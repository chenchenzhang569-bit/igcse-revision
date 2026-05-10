import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/subjects", label: "Revision" },
  { href: "/past-papers", label: "Past Papers" },
  { href: "/subjects", label: "Notes" },
  { href: "/pricing", label: "Purchase" },
  { href: "/submit-errors", label: "Submit Errors" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl text-primary-900">
            <div className="w-9 h-9 bg-primary-900 rounded-lg flex items-center justify-center text-white text-sm font-extrabold">
              IR
            </div>
            IGCSE Revision
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-primary-900 transition-colors hidden sm:inline"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-accent-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-600 transition-colors shadow-sm"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-primary-900 text-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold text-white mb-4">IGCSE Revision</h4>
            <p className="text-sm leading-relaxed">Your complete revision platform for CAIE &amp; Edexcel IGCSE exams.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Subjects</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/subjects/caie-physics-0625" className="hover:text-white transition-colors">Physics</Link></li>
              <li><Link href="/subjects/caie-chemistry-0620" className="hover:text-white transition-colors">Chemistry</Link></li>
              <li><Link href="/subjects/caie-biology-0610" className="hover:text-white transition-colors">Biology</Link></li>
              <li><Link href="/subjects/caie-mathematics-0580" className="hover:text-white transition-colors">Mathematics</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/past-papers" className="hover:text-white transition-colors">Past Papers</Link></li>
              <li><Link href="/subjects" className="hover:text-white transition-colors">Revision Notes</Link></li>
              <li><Link href="/subjects" className="hover:text-white transition-colors">Topic Questions</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/submit-errors" className="hover:text-white transition-colors">Submit Errors</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-sm text-white/50">
          &copy; 2026 IGCSE Revision. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
