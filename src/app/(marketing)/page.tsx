import Link from "next/link";
import Image from "next/image";

const boards = [
  {
    name: "CAIE",
    fullName: "Cambridge Assessment International Education",
    slug: "caie",
    subjects: ["Physics 0625", "Chemistry 0620", "Biology 0610", "Mathematics 0580"],
    color: "from-blue-600 to-blue-800",
  },
  {
    name: "Edexcel",
    fullName: "Pearson Edexcel International GCSE",
    slug: "edexcel",
    subjects: ["Physics 4PH1", "Chemistry 4CH1", "Biology 4BI1", "Mathematics 4MA1"],
    color: "from-slate-600 to-slate-800",
  },
];

const tiles = [
  { icon: "fa-book-open", title: "Revision", desc: "Step-by-step topic mastery with structured learning paths designed for high scores.", href: "/subjects" },
  { icon: "fa-file-lines", title: "Past Paper", desc: "Access 10+ years of solved past papers for CAIE and Edexcel boards instantly.", href: "/past-papers" },
  { icon: "fa-note-sticky", title: "Notes", desc: "Concise, visual summary notes optimized for quick revision before exams.", href: "/subjects" },
  { icon: "fa-circle-exclamation", title: "Submit Errors", desc: "Found a typo? Help us maintain 100% accuracy by reporting errors to our team.", href: "/submit-errors" },
];

export default function HomePage() {
  return (
    <div>
      {/* Logo + Hero — full navy background */}
      <section className="bg-primary-900 text-center px-5 py-12">
        <div className="max-w-[400px] mx-auto mb-8">
          <Image
            src="/logo.png"
            alt="Master IGCSE"
            width={400}
            height={169}
            className="w-full h-auto"
            priority
          />
        </div>
        <h2 className="font-urbanist text-3xl md:text-4xl font-bold text-white mb-4">
          Smart. Targeted. Revision.
        </h2>
        <p className="text-white/60 text-base md:text-lg max-w-[600px] mx-auto mb-8 leading-relaxed">
          Your ultimate destination for CAIE and Edexcel preparation. Master every
          topic with expert-curated notes and past papers.
        </p>
        <Link
          href="/subjects"
          className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-urbanist font-bold uppercase tracking-wider text-xs px-6 py-3 rounded transition-colors"
        >
          Start Revising Now
        </Link>
      </section>

      {/* Exam Board Selector */}
      <section className="max-w-[900px] mx-auto px-5 -mt-10 relative z-10 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boards.map((board) => (
            <Link
              key={board.slug}
              href={`/subjects`}
              className="group block bg-white border border-gray-200 rounded-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${board.color} flex items-center justify-center text-white font-urbanist font-bold text-lg`}>
                  {board.name[0]}
                </div>
                <div>
                  <h3 className="font-urbanist text-xl font-bold text-primary-900">
                    {board.name}
                  </h3>
                  <p className="text-xs text-gray-400">{board.fullName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {board.subjects.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-accent-500 font-urbanist font-bold uppercase text-xs tracking-wider mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                Explore {board.name} Subjects →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Ecosystem Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 px-5 pb-24 max-w-[1200px] mx-auto">
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            className="group block bg-white p-10 border border-gray-200 rounded transition-all duration-300 hover:border-t-accent-500 hover:border-t-4 hover:shadow-lg hover:-translate-y-1"
          >
            <i className={`fa-solid ${tile.icon} text-4xl text-primary-900 mb-5 block`} />
            <h3 className="font-urbanist text-2xl font-bold text-primary-900 mb-4">
              {tile.title}
            </h3>
            <p className="text-gray-400 leading-relaxed">{tile.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
