import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-600 flex items-center gap-2">
            🎓 IGCSE Revision
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/subjects" className="text-gray-600 hover:text-primary-600 transition">
              浏览科目
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-primary-600 transition">
              定价
            </Link>
            <Link
              href="/login"
              className="text-primary-600 font-medium hover:text-primary-700 transition"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              免费注册
            </Link>
          </nav>
          {/* Mobile */}
          <div className="md:hidden flex items-center gap-3">
            <Link href="/login" className="text-sm text-primary-600">登录</Link>
            <Link href="/register" className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg">注册</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p className="mb-2">© 2026 IGCSE Revision. 精准备考，从这里开始。</p>
          <p>CAIE & Edexcel 国际考试复习平台</p>
        </div>
      </footer>
    </div>
  );
}
