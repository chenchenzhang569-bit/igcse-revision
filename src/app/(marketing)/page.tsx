import Link from "next/link";

const subjects = [
  { name: "Physics", code: "0625", board: "CAIE", slug: "caie-physics-0625", color: "bg-blue-50 text-blue-700" },
  { name: "Chemistry", code: "0620", board: "CAIE", slug: "caie-chemistry-0620", color: "bg-orange-50 text-orange-700" },
  { name: "Biology", code: "0610", board: "CAIE", slug: "caie-biology-0610", color: "bg-green-50 text-green-700" },
  { name: "Mathematics", code: "0580", board: "CAIE", slug: "caie-mathematics-0580", color: "bg-purple-50 text-purple-700" },
];

const stats = [
  { value: "4", label: "Core Subjects" },
  { value: "2,000+", label: "Past Papers" },
  { value: "500+", label: "Topic Questions" },
  { value: "¥299", label: "Per Subject" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-900">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-indigo-950" />
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Master Your IGCSE<br />
              <span className="text-accent-400">Exams</span> with Confidence
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-10 max-w-xl">
              Comprehensive revision resources for CAIE &amp; Edexcel — past papers, 
              topic questions, notes, and mock exams, all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/subjects"
                className="inline-flex items-center justify-center bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-accent-500/25"
              >
                Start Revising Free
              </Link>
              <Link
                href="/past-papers"
                className="inline-flex items-center justify-center border-2 border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                Browse Past Papers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 border border-gray-100">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-primary-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Explore Subjects
          </h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            CAIE &amp; Edexcel — pick your subject and start revising today.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {subjects.map((s) => (
            <Link
              key={s.slug}
              href={`/subjects/${s.slug}`}
              className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-primary-200 hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center text-lg font-bold mb-4`}>
                {s.name[0]}
              </div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary-900 transition-colors">
                {s.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {s.board} &middot; {s.code}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-accent-500 font-bold">¥299</span>
                <span className="text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-500 text-lg">
              Built for students who want top grades.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Past Papers",
                desc: "Complete CAIE & Edexcel past papers with mark schemes, organized by year and season.",
                icon: "📄",
              },
              {
                title: "Topic Questions",
                desc: "Practice by topic with MCQ and structured questions from PMT, with instant answer checking.",
                icon: "📝",
              },
              {
                title: "Revision Notes",
                desc: "Concise, exam-focused notes covering every syllabus point for all subjects.",
                icon: "📖",
              },
              {
                title: "Mock Exams",
                desc: "Timed mock exams that simulate real test conditions to build your confidence.",
                icon: "✅",
              },
              {
                title: "Per-Subject Access",
                desc: "Pay only for what you need — ¥299 per subject gives you full, permanent access.",
                icon: "💰",
              },
              {
                title: "Always Updated",
                desc: "Content refreshed with each exam cycle so you're always studying the latest material.",
                icon: "🔄",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-900 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to Start?
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-lg mx-auto">
            Register for free, preview subjects, and unlock full access when you're ready.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center bg-accent-500 hover:bg-accent-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-accent-500/25"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
