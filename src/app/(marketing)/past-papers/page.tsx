import Link from "next/link";

const subjects = [
  { name: "CAIE Physics 0625", slug: "caie-physics-0625", icon: "⚛️" },
  { name: "CAIE Chemistry 0620", slug: "caie-chemistry-0620", icon: "🧪" },
  { name: "CAIE Biology 0610", slug: "caie-biology-0610", icon: "🧬" },
  { name: "CAIE Mathematics 0580", slug: "caie-mathematics-0580", icon: "📐" },
  { name: "CAIE Additional Mathematics 0606", slug: "caie-additional-mathematics-0606", icon: "📊" },
  { name: "CAIE Economics 0455", slug: "caie-economics-0455", icon: "📈" },
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
