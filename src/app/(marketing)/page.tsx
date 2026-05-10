import Link from "next/link";

const tiles = [
  { icon: "fa-book-open", title: "Revision", desc: "Step-by-step topic mastery with structured learning paths designed for high scores.", href: "/subjects" },
  { icon: "fa-file-lines", title: "Past Paper", desc: "Access 10+ years of solved past papers for CAIE and Edexcel boards instantly.", href: "/past-papers" },
  { icon: "fa-note-sticky", title: "Notes", desc: "Concise, visual summary notes optimized for quick revision before exams.", href: "/subjects" },
  { icon: "fa-circle-exclamation", title: "Submit Errors", desc: "Found a typo? Help us maintain 100% accuracy by reporting errors to our team.", href: "/submit-errors" },
];

export default function HomePage() {
  return (
    <div>
      {/* Logo Section */}
      <section className="text-center pt-16 pb-6 px-5">
        <h1 className="font-urbanist text-6xl md:text-7xl font-bold text-primary-900 mb-1 tracking-tight">
          Master
        </h1>
        <p className="font-urbanist text-lg text-gray-400 tracking-[0.15em]">
          Master IGCSE. Achieve More.
        </p>
      </section>

      {/* Hero */}
      <section
        className="text-center py-16 px-5"
        style={{
          background: "radial-gradient(circle at top right, rgba(0, 28, 113, 0.03), transparent 50%)",
        }}
      >
        <h2 className="font-urbanist text-4xl md:text-5xl font-bold text-primary-900 mb-5">
          Smart. Targeted. Revision.
        </h2>
        <p className="text-lg text-gray-400 max-w-[700px] mx-auto mb-10 leading-relaxed">
          Your ultimate destination for CAIE and Edexcel preparation. Master every
          topic with expert-curated notes and past papers.
        </p>
        <Link
          href="/subjects"
          className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-urbanist font-bold uppercase tracking-wider text-sm px-10 py-[18px] rounded transition-colors"
        >
          Start Revising Now
        </Link>
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
