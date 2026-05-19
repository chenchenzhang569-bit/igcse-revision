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
        <div className="max-w-[720px]">
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
      </section>

      {/* Promo Video Banner */}
      <section className="bg-blue-700 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          {/* Left text */}
          <div className="flex-1 text-white">
            <h3 className="font-poppins text-xl sm:text-2xl md:text-3xl font-bold mb-4">
              你的 IGCSE A* 加速器
            </h3>
            <ul className="space-y-2 text-white/90 text-sm sm:text-base mb-6">
              <li>✅ CAIE 数理化生全覆盖</li>
              <li>✅ 按 Topic 分类，Easy/Medium/Hard 三档难度</li>
              <li>✅ 做完即改，自动判分，错题显示解析</li>
              <li>✅ Mock Exam 全真模拟</li>
              <li>✅ ¥100/科，¥500 全科，支付宝支付</li>
            </ul>
            <Link
              href="/subjects"
              className="inline-block bg-white text-blue-700 font-poppins font-bold uppercase tracking-wider text-sm sm:text-base px-6 sm:px-8 py-3 rounded transition-colors hover:bg-blue-50"
            >
              开始刷题
            </Link>
          </div>
          {/* Right video */}
          <div className="flex-1 w-full max-w-[500px]">
            <div className="relative w-full aspect-video bg-blue-900 rounded-lg overflow-hidden shadow-xl">
              <video
                className="w-full h-full object-cover"
                controls
                poster="/video-poster.png"
                preload="metadata"
              >
                <source src="/promo-video.mp4" type="video/mp4" />
                你的浏览器不支持视频播放。
              </video>
            </div>
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
