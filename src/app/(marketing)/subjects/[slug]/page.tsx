import Link from "next/link";
import { PastPapersTab } from "./PastPapersTab";

interface Topic { name: string; displayName: string; slug: string; sort: number }

const PHYSICS: Topic[] = [
  { name: "Motion, forces and energy", displayName: "Motion, Forces & Energy", slug: "motion-forces-energy", sort: 1 },
  { name: "Thermal physics", displayName: "Thermal Physics", slug: "thermal-physics", sort: 2 },
  { name: "Waves", displayName: "Waves", slug: "waves", sort: 3 },
  { name: "Electricity and magnetism", displayName: "Electricity & Magnetism", slug: "electricity-magnetism", sort: 4 },
  { name: "Nuclear physics", displayName: "Nuclear Physics", slug: "nuclear-physics", sort: 5 },
  { name: "Space physics", displayName: "Space Physics", slug: "space-physics", sort: 6 },
];
const CHEMISTRY: Topic[] = [
  { name: "States of matter", displayName: "States of Matter", slug: "states-of-matter", sort: 1 },
  { name: "Atoms, elements and compounds", displayName: "Atoms, Elements & Compounds", slug: "atoms-elements-compounds", sort: 2 },
  { name: "Stoichiometry", displayName: "Stoichiometry", slug: "stoichiometry", sort: 3 },
  { name: "Electrochemistry", displayName: "Electrochemistry", slug: "electrochemistry", sort: 4 },
  { name: "Chemical energetics", displayName: "Chemical Energetics", slug: "chemical-energetics", sort: 5 },
  { name: "Chemical reactions", displayName: "Chemical Reactions", slug: "chemical-reactions", sort: 6 },
  { name: "Acids, bases and salts", displayName: "Acids, Bases & Salts", slug: "acids-bases-salts", sort: 7 },
  { name: "The Periodic Table", displayName: "The Periodic Table", slug: "periodic-table", sort: 8 },
  { name: "Metals", displayName: "Metals", slug: "metals", sort: 9 },
  { name: "Chemistry of the environment", displayName: "Chemistry of the Environment", slug: "chemistry-environment", sort: 10 },
  { name: "Organic chemistry", displayName: "Organic Chemistry", slug: "organic-chemistry", sort: 11 },
  { name: "Experimental techniques", displayName: "Experimental Techniques", slug: "experimental-techniques", sort: 12 },
];
const BIOLOGY: Topic[] = [
  { name: "Characteristics of living organisms", displayName: "Characteristics of Living Organisms", slug: "characteristics-living-organisms", sort: 1 },
  { name: "Organisation of the organism", displayName: "Organisation of the Organism", slug: "organisation-organism", sort: 2 },
  { name: "Movement into and out of cells", displayName: "Movement In & Out of Cells", slug: "movement-cells", sort: 3 },
  { name: "Biological molecules", displayName: "Biological Molecules", slug: "biological-molecules", sort: 4 },
  { name: "Enzymes", displayName: "Enzymes", slug: "enzymes", sort: 5 },
  { name: "Plant nutrition", displayName: "Plant Nutrition", slug: "plant-nutrition", sort: 6 },
  { name: "Human nutrition", displayName: "Human Nutrition", slug: "human-nutrition", sort: 7 },
  { name: "Transport in plants", displayName: "Transport in Plants", slug: "transport-plants", sort: 8 },
  { name: "Transport in animals", displayName: "Transport in Animals", slug: "transport-animals", sort: 9 },
  { name: "Diseases and immunity", displayName: "Diseases & Immunity", slug: "diseases-immunity", sort: 10 },
  { name: "Gas exchange in humans", displayName: "Gas Exchange in Humans", slug: "gas-exchange-humans", sort: 11 },
  { name: "Respiration", displayName: "Respiration", slug: "respiration", sort: 12 },
  { name: "Excretion in humans", displayName: "Excretion in Humans", slug: "excretion-humans", sort: 13 },
  { name: "Coordination and response", displayName: "Coordination & Response", slug: "coordination-response", sort: 14 },
  { name: "Drugs", displayName: "Drugs", slug: "drugs", sort: 15 },
  { name: "Reproduction", displayName: "Reproduction", slug: "reproduction", sort: 16 },
  { name: "Inheritance", displayName: "Inheritance", slug: "inheritance", sort: 17 },
  { name: "Variation and selection", displayName: "Variation & Selection", slug: "variation-selection", sort: 18 },
  { name: "Organisms and their environment", displayName: "Organisms & Their Environment", slug: "organisms-environment", sort: 19 },
  { name: "Human influences on ecosystems", displayName: "Human Influences on Ecosystems", slug: "human-influences-ecosystems", sort: 20 },
  { name: "Biotechnology", displayName: "Biotechnology & Genetic Modification", slug: "biotechnology", sort: 21 },
];
const MATHEMATICS: Topic[] = [
  { name: "Number", displayName: "Number", slug: "number", sort: 1 },
  { name: "Algebra and graphs", displayName: "Algebra & Graphs", slug: "algebra-graphs", sort: 2 },
  { name: "Coordinate geometry", displayName: "Coordinate Geometry", slug: "coordinate-geometry", sort: 3 },
  { name: "Geometry", displayName: "Geometry", slug: "geometry", sort: 4 },
  { name: "Mensuration", displayName: "Mensuration", slug: "mensuration", sort: 5 },
  { name: "Trigonometry", displayName: "Trigonometry", slug: "trigonometry", sort: 6 },
  { name: "Vectors and transformations", displayName: "Vectors & Transformations", slug: "vectors-transformations", sort: 7 },
  { name: "Probability", displayName: "Probability", slug: "probability", sort: 8 },
  { name: "Statistics", displayName: "Statistics", slug: "statistics", sort: 9 },
];

const DATA: Record<string, { board: string; code: string; name: string; icon: string; key: string; topics: Topic[] }> = {
  "caie-physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "caie-chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "caie-biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "caie-mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "mathematics", topics: MATHEMATICS },
  "edexcel-physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "edexcel-chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "edexcel-biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "edexcel-mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐", key: "mathematics", topics: MATHEMATICS },
};

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const data = DATA[slug];

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">Browse all subjects →</Link>
      </div>
    );
  }

  const { board, code, name, icon, key, topics } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">← Back to Home</Link>

      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">{board} IGCSE {name}</h1>
          <p className="text-gray-500 mt-1">Code: {code}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-8 border-b">
        <Link href={`/subjects/${slug}`} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${!tab || tab === "topics" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📚 Topics</Link>
        <Link href={`/subjects/${slug}?tab=past-papers`} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${tab === "past-papers" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📄 Past Papers</Link>
        <Link href={`/subjects/${slug}?tab=mock-exams`} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${tab === "mock-exams" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📝 Mock Exams</Link>
      </div>

      {/* Topics tab */}
      {(!tab || tab === "topics") && (
        <section className="mt-6">
          <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((topic) => (
              <Link key={topic.slug} href={`/subjects/${slug}/topics/${topic.slug}`}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">{topic.sort}</span>
                  <div>
                    <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">{topic.displayName}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{topic.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Past Papers tab */}
      {tab === "past-papers" && (
        <PastPapersTab slug={slug} board={board} name={name} code={code} icon={icon} subjectKey={key} />
      )}

      {/* Mock Exams tab */}
      {tab === "mock-exams" && (
        <section className="mt-6">
          <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
            <p className="font-medium">Mock exams coming soon</p>
          </div>
        </section>
      )}
    </div>
  );
}

