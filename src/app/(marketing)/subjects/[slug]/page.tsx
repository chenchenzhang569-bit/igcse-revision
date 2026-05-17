// force-redeploy-v2-math-topics-sme
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PastPapersTab } from "./PastPapersTab";
import { MockExamsTab } from "./MockExamsTab";

interface Topic { name: string; displayName: string; slug: string; sort: number }
interface TopicSection { section: string; topics: Topic[] }

const PHYSICS: Topic[] = [
  { name: "Motion, forces and energy", displayName: "Motion, Forces & Energy", slug: "motion-forces-energy", sort: 1 },
  { name: "Thermal physics", displayName: "Thermal Physics", slug: "thermal-physics", sort: 2 },
  { name: "Waves", displayName: "Waves", slug: "waves", sort: 3 },
  { name: "Electricity and magnetism", displayName: "Electricity & Magnetism", slug: "electricity-magnetism", sort: 4 },
  { name: "Nuclear physics", displayName: "Nuclear Physics", slug: "nuclear-physics", sort: 5 },
  { name: "Space physics", displayName: "Space Physics", slug: "space-physics", sort: 6 },
  { name: "Practical skills", displayName: "Practical Skills", slug: "practical-skills-physics", sort: 7 },
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
  { name: "Practical skills", displayName: "Practical Skills", slug: "practical-skills-chemistry", sort: 13 },
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
  { name: "Practical skills", displayName: "Practical Skills", slug: "practical-skills-biology", sort: 22 },
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

// SME math section mapping (slug → section name)
const SME_SECTION_MAP: Record<string, string> = {
  "types-of-numbers":"Number","compound-measures":"Number","fractions-decimals-percentages":"Number",
  "introduction-to-fractions":"Number","money-calculations":"Number","operations-with-fractions":"Number",
  "operations-with-numbers-decimals":"Number","percentages":"Number","powers-roots-standard-form":"Number",
  "prime-factors-hcf-lcm":"Number","ratio-proportion":"Number","reading-ordering-numbers":"Number",
  "rounding-estimation-bounds":"Number","simple-compound-interest":"Number","time-currency-conversions":"Number",
  "using-a-calculator":"Number",
  "algebraic-roots-indices":"Algebra & Sequences","expanding-factorising-brackets":"Algebra & Sequences",
  "inequalities":"Algebra & Sequences","introduction-to-algebra":"Algebra & Sequences",
  "linear-equations":"Algebra & Sequences","rearranging-formulas":"Algebra & Sequences",
  "sequences":"Algebra & Sequences","simultaneous-equations":"Algebra & Sequences",
  "further-graphs":"Coordinate Geometry & Graphs","linear-graphs":"Coordinate Geometry & Graphs",
  "real-life-graphs":"Coordinate Geometry & Graphs",
  "angles-in-polygons-parallel-lines":"Geometry","basic-angle-properties":"Geometry",
  "bearings-constructions-scale-drawings":"Geometry","circle-theorems":"Geometry",
  "symmetry-shapes":"Geometry",
  "area-perimeter":"Lengths, Areas & Volumes","circles-arcs-sectors":"Lengths, Areas & Volumes",
  "congruence-similarity":"Lengths, Areas & Volumes","volume-surface-area":"Lengths, Areas & Volumes",
  "pythagoras":"Pythagoras & Trigonometry","trigonometry":"Pythagoras & Trigonometry",
  "transformations":"Transformations",
  "basic-probability":"Probability","set-notation-probability-diagrams":"Probability",
  "averages-range":"Statistics","scatter-graphs-correlation":"Statistics","statistical-diagrams":"Statistics",
};

const DATA: Record<string, { board: string; code: string; name: string; icon: string; key: string; topics: Topic[] }> = {
  "caie-physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "caie-chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "caie-biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "caie-mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "edexcel-chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "edexcel-biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "edexcel-mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  // Old format aliases (without board prefix)
  "physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  // Short aliases (board-only, no code) — used by Subjects list page
  "caie-physics":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "caie-chemistry":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "caie-biology":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "caie-mathematics": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-physics":  { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "edexcel-chemistry":{ board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "edexcel-biology":  { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "edexcel-mathematics":{ board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
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

  const { board, code, name, icon, key } = data;

  // 服务端查 subject_id（Physics/Chemistry/Math is_published=true，anon key 可读）
  let subjectId: string | null = null;
  try {
    const supabase = createClient();
    const { data: subjectRow } = await supabase
      .from("subjects")
      .select("id")
      .eq("code", code)
      .single();
    subjectId = subjectRow?.id || null;
  } catch (e) {
    console.error("Subject lookup failed:", e);
    subjectId = null;
  }

  // For maths, fetch topics from DB (SME structure); for others, use hardcoded
  let topics: Topic[] = data.topics;
  let topicSections: TopicSection[] = [];
  if (key === "maths" && subjectId) {
    try {
      const supabase = createClient();
      const { data: dbTopics } = await supabase
        .from("topics")
        .select("name, slug, sort_order")
        .eq("subject_id", subjectId)
        .order("sort_order");
      if (dbTopics && dbTopics.length > 0) {
        // Group by extracting SME topic slug (last segment of DB slug like "caie-mathematics-0580-types-of-numbers")
        const grouped = new Map<string, Topic[]>();
        const added = new Set<string>();
        for (const t of dbTopics) {
          const smeSlug = t.slug.split("-").slice(3).join("-") || t.slug;
          const sectionName = SME_SECTION_MAP[smeSlug] || "Other";
          if (!grouped.has(sectionName)) grouped.set(sectionName, []);
          if (!added.has(smeSlug)) {
            added.add(smeSlug);
            grouped.get(sectionName)!.push({
              name: sectionName,
              displayName: t.name,
              slug: smeSlug,
              sort: t.sort_order,
            });
          }
        }
        topicSections = Array.from(grouped.entries()).map(([section, topics]) => ({
          section,
          topics,
        }));
        // Also provide flat topics for non-section rendering if needed
        topics = topicSections.flatMap(s => s.topics);
      }
    } catch (e) {
      console.error("Topic DB fetch failed:", e);
      // Fall back to hardcoded
      topics = data.topics;
    }
  }

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
          {topicSections.length > 0 ? (
            // Math: grouped by SME section
            <div className="space-y-8">
              {topicSections.map((sec) => (
                <div key={sec.section}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">
                    {sec.section}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.topics.map((topic) => (
                      <Link key={topic.slug} href={`/subjects/${slug}/topics/${topic.slug}`}
                        className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm hover:border-accent-300 transition-all group flex items-center gap-3">
                        <span className="text-accent-500 font-bold text-sm shrink-0 w-6">{topic.sort}</span>
                        <h3 className="font-medium text-sm text-primary-900 group-hover:text-accent-500 transition leading-snug">
                          {topic.displayName}
                        </h3>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Other subjects: flat grid
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
          )}
        </section>
      )}

      {/* Past Papers tab */}
      {tab === "past-papers" && (
        <PastPapersTab subjectId={subjectId} slug={slug} board={board} name={name} code={code} icon={icon} subjectKey={key} />
      )}

      {/* Mock Exams tab */}
      {tab === "mock-exams" && (
        <MockExamsTab subjectKey={key} subjectSlug={slug} board={board} />
      )}
    </div>
  );
}

