// force-redeploy-v16
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
      { name: "Physics 0625", slug: "caie-physics-0625" },
      { name: "Chemistry 0620", slug: "caie-chemistry-0620" },
      { name: "Biology 0610", slug: "caie-biology-0610" },
      { name: "Mathematics 0580", slug: "caie-mathematics-0580" },
    ],
  },
  {
    name: "Edexcel",
    label: "Pearson Edexcel",
    slug: "edexcel",
    logo: "/edexcel-logo.png",
    logoHeight: "h-10 sm:h-12",
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
      <section className="bg-primary-900 px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: text */}
          <div className="flex-1">
            <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
              Master IGCSE, Achieve More
            </h2>
            <p className="text-white/70 text-sm md:text-base mb-2 leading-relaxed">
              The most comprehensive IGCSE revision platform for CAIE and Edexcel.
            </p>
            <p className="text-white/50 text-sm md:text-base mb-8 leading-relaxed">
              Access expertly curated past papers, topic questions, and revision notes — 
              all organized by subject and topic so you can focus on what matters most.
            </p>
            <Link
              href="/subjects"
              className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-poppins font-bold uppercase tracking-wider text-sm sm:text-base px-6 sm:px-8 py-3 rounded transition-colors"
            >
              Start Revising
            </Link>
          </div>

          {/* Right: video */}
          <div className="flex-1 w-full max-w-[540px]">
            <video
              className="w-full rounded-lg shadow-2xl"
              controls
              poster="https://cdn.jsdelivr.net/gh/chenchenzhang569-bit/igcse-revision@d5be93a/public/promo-poster.png"
              playsInline
              webkit-playsinline="true"
              x5-video-player-type="h5"
              x5-video-orientation="portraint"
              preload="auto"
            >
              <source src="https://cdn.jsdelivr.net/gh/chenchenzhang569-bit/igcse-revision@410f818/public/promo-video.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* Exam Board Selector */}
      <section className="w-full px-3 sm:px-5 -mt-10 sm:-mt-14 relative z-10 pb-6 sm:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {boards.map((board) => (
            <div
              key={board.slug}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 md:p-8 hover:shadow-lg transition-all duration-300"
            >
              {/* Logo */}
              <div className="mb-4">
                <div className={`${board.logoHeight} relative max-w-[200px] sm:max-w-[240px] ${board.slug === "edexcel" ? "-mt-1" : ""}`}>
                  <Image
                    src={board.logo}
                    alt={board.label}
                    fill
                    className="object-contain object-left"
                  />
                </div>
              </div>

              {/* Subject tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {board.subjects.map((s) => (
                  <Link
                    key={`${board.slug}-${s.slug}`}
                    href={`/subjects/${s.slug}`}
                    className="text-xs sm:text-sm font-bold bg-gray-100 text-primary-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-accent-500 hover:text-white transition-colors no-underline"
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
