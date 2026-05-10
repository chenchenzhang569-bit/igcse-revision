import Link from "next/link";
import Image from "next/image";

const boards = [
  {
    name: "CAIE",
    fullName: "Cambridge Assessment International Education",
    slug: "caie",
    logo: "/caie-logo.png",
    logoHeight: "h-12",
    subjects: [
      { name: "Physics 0625", slug: "caie-physics-0625" },
      { name: "Chemistry 0620", slug: "caie-chemistry-0620" },
      { name: "Biology 0610", slug: "caie-biology-0610" },
      { name: "Mathematics 0580", slug: "caie-mathematics-0580" },
    ],
  },
  {
    name: "Edexcel",
    fullName: "Pearson Edexcel International GCSE",
    slug: "edexcel",
    logo: "/edexcel-logo.png",
    logoHeight: "h-20",
    subjects: [
      { name: "Physics 4PH1", slug: "edexcel-physics-4ph1" },
      { name: "Chemistry 4CH1", slug: "edexcel-chemistry-4ch1" },
      { name: "Biology 4BI1", slug: "edexcel-biology-4bi1" },
      { name: "Mathematics 4MA1", slug: "edexcel-mathematics-4ma1" },
    ],
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary-900 text-center px-5 py-10">
        <h2 className="font-urbanist text-3xl md:text-4xl font-bold text-white mb-3">
          Master IGCSE, Achieve More
        </h2>
        <p className="text-white/60 text-sm md:text-base max-w-[500px] mx-auto mb-6 leading-relaxed">
          Your ultimate destination for CAIE and Edexcel preparation. Master every
          topic with expert-curated notes and past papers.
        </p>
        <Link
          href="/subjects"
          className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-urbanist font-bold uppercase tracking-wider text-base px-8 py-3 rounded transition-colors"
        >
          Start Revising Now
        </Link>
      </section>

      {/* Exam Board Selector */}
      <section className="w-full px-5 -mt-6 relative z-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {boards.map((board) => (
            <div
              key={board.slug}
              className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 hover:shadow-lg transition-all duration-300"
            >
              {/* Logo — per-board sizing, Edexcel shifted up */}
              <div className="mb-4">
                <div className={`${board.logoHeight} relative max-w-[240px] ${board.slug === "edexcel" ? "-mt-1" : ""}`}>
                  <Image
                    src={board.logo}
                    alt={board.fullName}
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{board.fullName}</p>
              </div>

              {/* Subject tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {board.subjects.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/subjects/${s.slug}`}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-full hover:bg-accent-500 hover:text-white transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>

              {/* Explore more link */}
              <Link
                href={`/subjects?board=${board.name}`}
                className="inline-block text-accent-500 font-urbanist font-bold uppercase text-xs tracking-wider hover:text-accent-600 transition-colors"
              >
                Explore {board.name} Subjects →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
