import Link from "next/link";
import Image from "next/image";

const boards = [
  {
    name: "CAIE",
    label: "Cambridge CAIE",
    slug: "caie",
    logo: "/caie-logo.png",
    logoHeight: "h-10 sm:h-12",
    subjects: [
      { name: "Physics 0625", slug: "physics" },
      { name: "Chemistry 0620", slug: "chemistry" },
      { name: "Biology 0610", slug: "biology" },
      { name: "Mathematics 0580", slug: "mathematics" },
    ],
  },
  {
    name: "Edexcel",
    label: "Pearson Edexcel",
    slug: "edexcel",
    logo: "/edexcel-logo.png",
    logoHeight: "h-16 sm:h-20",
    subjects: [
      { name: "Physics 4PH1", slug: "physics" },
      { name: "Chemistry 4CH1", slug: "chemistry" },
      { name: "Biology 4BI1", slug: "biology" },
      { name: "Mathematics 4MA1", slug: "mathematics" },
    ],
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero — wider bar, split subtext */}
      <section className="bg-primary-900 text-center px-4 sm:px-5 py-10 sm:py-14">
        <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
          Master IGCSE, Achieve More
        </h2>
        <p className="text-white/60 text-sm md:text-base max-w-[640px] mx-auto mb-5 sm:mb-6 leading-relaxed">
          Your ultimate destination for CAIE and Edexcel preparation.<br />
          Master every topic with expert-curated notes and past papers.
        </p>
        <Link
          href="/subjects"
          className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-poppins font-bold uppercase tracking-wider text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded transition-colors"
        >
          Start Revising Now
        </Link>
      </section>

      {/* Exam Board Selector */}
      <section className="w-full px-3 sm:px-5 -mt-7 sm:-mt-9 relative z-10 pb-10 sm:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {boards.map((board) => (
            <div
              key={board.slug}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 md:p-8 hover:shadow-lg transition-all duration-300"
            >
              {/* Logo + custom label */}
              <div className="mb-4">
                <div className={`${board.logoHeight} relative max-w-[200px] sm:max-w-[240px] ${board.slug === "edexcel" ? "-mt-1" : ""}`}>
                  <Image
                    src={board.logo}
                    alt={board.label}
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <p className="text-xs sm:text-sm font-bold text-primary-900 mt-2">{board.label}</p>
              </div>

              {/* Subject tags — smaller */}
              <div className="flex flex-wrap gap-2 mb-4">
                {board.subjects.map((s) => (
                  <Link
                    key={`${board.slug}-${s.slug}`}
                    href={`/subjects/${s.slug}?board=${board.name}`}
                    className="text-sm sm:text-base font-bold bg-gray-100 text-primary-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-accent-500 hover:text-white transition-colors no-underline"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>

              {/* Explore more */}
              <Link
                href={`/subjects?board=${board.name}`}
                className="inline-block text-accent-500 font-poppins font-extrabold uppercase text-xs sm:text-sm tracking-wider transition-colors"
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
