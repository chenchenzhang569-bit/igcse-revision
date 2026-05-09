import Link from "next/link";

const featuredSubjects = [
  { name: "Mathematics", code: "0580", board: "CAIE", icon: "📐", slug: "caie-mathematics-0580" },
  { name: "Physics", code: "0625", board: "CAIE", icon: "⚛️", slug: "caie-physics-0625" },
  { name: "Chemistry", code: "0620", board: "CAIE", icon: "🧪", slug: "caie-chemistry-0620" },
  { name: "Biology", code: "0610", board: "CAIE", icon: "🧬", slug: "caie-biology-0610" },
  { name: "Additional Mathematics", code: "0606", board: "CAIE", icon: "🔢", slug: "caie-additional-mathematics-0606" },
  { name: "Economics", code: "0455", board: "CAIE", icon: "📈", slug: "caie-economics-0455" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              IGCSE Revision<span className="text-yellow-300">·</span>Targeted Prep
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed">
              All subjects across CAIE and Edexcel exam boards<br />
              Concise Notes · Practice Questions · Past Papers · Mock Exams
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/subjects"
                className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-lg"
              >
                浏览 Browse Subjects →
              </Link>
              <Link
                href="/register"
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition"
              >
                免费注册
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "CAIE + Edexcel", label: "两大考试局" },
            { value: "15+", label: "科目覆盖" },
            { value: "精简笔记", label: "逐主题整理" },
            { value: "¥299", label: "单科永久" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary-600">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">热门科目</h2>
          <p className="text-gray-500">点击科目查看详情和定价</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSubjects.map((s) => (
            <Link
              key={s.slug}
              href={`/subjects/${s.slug}`}
              className="group bg-white border rounded-xl p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{s.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition">
                    {s.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {s.board} · {s.code}
                  </p>
                  <p className="text-primary-600 font-bold mt-3">¥299</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">准备好开始了吗？</h2>
          <p className="text-gray-500 mb-8 text-lg">
            注册即享科目预览，满意后再购买
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition shadow-lg"
          >
            免费注册，立即开始 →
          </Link>
        </div>
      </section>
    </div>
  );
}
