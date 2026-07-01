import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Past Papers",
  description:
    "Download free IGCSE past papers for CAIE and Edexcel. Browse by subject and year — Physics 0625, Chemistry 0620, Biology 0610, Mathematics 0580, and more. Practice with official marking schemes.",
  keywords: [
    "IGCSE past papers",
    "CAIE past papers",
    "Edexcel past papers",
    "IGCSE exam papers",
    "IGCSE physics past papers",
    "IGCSE chemistry past papers",
    "IGCSE biology past papers",
    "IGCSE maths past papers",
    "free past papers",
    "IGCSE revision",
    // Chinese keywords
    "IGCSE 历年真题",
    "IGCSE 真题下载",
    "IGCSE 试卷",
    "CAIE 历年真题",
    "Edexcel 真题",
    "IGCSE 0580 真题",
    "IGCSE 0625 真题",
    "IGCSE 0620 真题",
    "IGCSE 0610 真题",
    "IGCSE past paper 下载",
  ],
  openGraph: {
    title: "IGCSE Past Papers | IGMaster",
    description:
      "Download free IGCSE past papers for CAIE and Edexcel. Browse by subject and year.",
    url: "https://igmaster.org/past-papers",
  },
  alternates: {
    canonical: "https://igmaster.org/past-papers",
  },
};

const subjects = [
  { name: "CAIE Physics 0625", slug: "caie-physics-0625", icon: "⚛️" },
  { name: "CAIE Chemistry 0620", slug: "caie-chemistry-0620", icon: "🧪" },
  { name: "CAIE Biology 0610", slug: "caie-biology-0610", icon: "🧬" },
  { name: "CAIE Mathematics 0580", slug: "caie-mathematics-0580", icon: "📐" },
  { name: "CAIE Additional Mathematics 0606", slug: "caie-additional-mathematics-0606", icon: "📊" },
  { name: "CAIE Economics 0455", slug: "caie-economics-0455", icon: "📈" },
  { name: "CAIE Computer Science 0478", slug: "caie-computer-science-0478", icon: "💻" },
  { name: "Edexcel Physics 4PH1", slug: "edexcel-physics-4ph1", icon: "⚛️" },
  { name: "Edexcel Chemistry 4CH1", slug: "edexcel-chemistry-4ch1", icon: "🧪" },
  { name: "Edexcel Biology 4BI1", slug: "edexcel-biology-4bi1", icon: "🧬" },
  { name: "Edexcel Mathematics 4MA1", slug: "edexcel-mathematics-4ma1", icon: "📐" },
  { name: "Edexcel Further Maths 4PM1", slug: "edexcel-further-maths-4pm1", icon: "🔢" },
  { name: "Edexcel Business 4BS1", slug: "edexcel-business-4bs1", icon: "📊" },
  { name: "Edexcel Economics 4EC1", slug: "edexcel-economics-4ec1", icon: "📈" },
  { name: "Edexcel Geography 4GE1", slug: "edexcel-geography-4ge1", icon: "🌍" },
];

export default function PastPapersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary-900 mb-2">Past Papers</h1>
      <p className="text-gray-500 mb-8">Select a subject to browse past papers by year and season.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map((s) => (
          <Link
            key={s.slug}
            href={`/subjects/${s.slug}?tab=past-papers`}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-primary-300 transition-all group flex items-center gap-4"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <h3 className="font-semibold text-primary-900 group-hover:text-primary-600 transition">{s.name}</h3>
              <p className="text-sm text-gray-400 mt-0.5">View past papers →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
