import Link from "next/link";

// Static subject + topic data — no DB dependency
interface TopicItem {
  name: string;
  displayName: string;
  slug: string;
  sort: number;
}

const SUBJECT_DATA: Record<string, {
  board: string;
  subject: string;
  code: string;
  displayName: string;
  icon: string;
  topics: TopicItem[];
}> = {
  physics: {
    board: "CAIE", subject: "Physics", code: "0625", displayName: "Physics", icon: "⚛️",
    topics: [
      { name: "Motion, forces and energy", displayName: "Motion, Forces & Energy", slug: "motion-forces-energy", sort: 1 },
      { name: "Thermal physics", displayName: "Thermal Physics", slug: "thermal-physics", sort: 2 },
      { name: "Waves", displayName: "Waves", slug: "waves", sort: 3 },
      { name: "Electricity and magnetism", displayName: "Electricity & Magnetism", slug: "electricity-magnetism", sort: 4 },
      { name: "Nuclear physics", displayName: "Nuclear Physics", slug: "nuclear-physics", sort: 5 },
      { name: "Space physics", displayName: "Space Physics", slug: "space-physics", sort: 6 },
    ],
  },
  chemistry: {
    board: "CAIE", subject: "Chemistry", code: "0620", displayName: "Chemistry", icon: "🧪",
    topics: [
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
    ],
  },
  biology: {
    board: "CAIE", subject: "Biology", code: "0610", displayName: "Biology", icon: "🧬",
    topics: [
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
    ],
  },
  mathematics: {
    board: "CAIE", subject: "Mathematics", code: "0580", displayName: "Mathematics", icon: "📐",
    topics: [
      { name: "Number", displayName: "Number", slug: "number", sort: 1 },
      { name: "Algebra and graphs", displayName: "Algebra & Graphs", slug: "algebra-graphs", sort: 2 },
      { name: "Coordinate geometry", displayName: "Coordinate Geometry", slug: "coordinate-geometry", sort: 3 },
      { name: "Geometry", displayName: "Geometry", slug: "geometry", sort: 4 },
      { name: "Mensuration", displayName: "Mensuration", slug: "mensuration", sort: 5 },
      { name: "Trigonometry", displayName: "Trigonometry", slug: "trigonometry", sort: 6 },
      { name: "Vectors and transformations", displayName: "Vectors & Transformations", slug: "vectors-transformations", sort: 7 },
      { name: "Probability", displayName: "Probability", slug: "probability", sort: 8 },
      { name: "Statistics", displayName: "Statistics", slug: "statistics", sort: 9 },
    ],
  },
};

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ board?: string }>;
}) {
  const { slug } = await params;
  const { board: boardParam } = await searchParams;

  // Try DB, fallback to static
  let subjectFromDB: any = null;
  let dbTopics: any[] | null = null;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("subjects")
      .select("id, name, display_name, code, slug, icon, price_cny")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    subjectFromDB = data;

    if (subjectFromDB?.id) {
      const { data: topicsData } = await supabase
        .from("topics")
        .select("name, display_name, slug, description, sort_order")
        .eq("subject_id", subjectFromDB.id)
        .order("sort_order");
      dbTopics = topicsData;
    }
  } catch {}

  const staticData = SUBJECT_DATA[slug];
  const board = boardParam || staticData?.board || "CAIE";

  if (!subjectFromDB && !staticData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/subjects" className="text-primary-600 mt-4 inline-block font-semibold">
          Browse all subjects →
        </Link>
      </div>
    );
  }

  const subjectName = subjectFromDB?.display_name || staticData?.displayName || slug;
  const subjectCode = subjectFromDB?.code || staticData?.code || "";
  const subjectIcon = subjectFromDB?.icon || staticData?.icon || "📚";
  const subjectDesc = subjectFromDB?.name || staticData?.subject || subjectName;

  // Use DB topics if available, otherwise static
  const topicsList = (dbTopics && dbTopics.length > 0) ? dbTopics : (staticData?.topics || []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/subjects" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
        ← All Subjects
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{subjectIcon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">
            {board} IGCSE {subjectName}
          </h1>
          <p className="text-gray-500 mt-1">
            {subjectDesc}{subjectCode ? ` (${subjectCode})` : ""}
          </p>
        </div>
      </div>

      {/* Topic list */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topicsList.map((topic: any) => (
            <Link
              key={topic.slug || topic.name}
              href={`/subjects/${slug}/topics/${topic.slug}`}
              className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">
                  {topic.sort_order || topic.sort || "•"}
                </span>
                <div>
                  <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                    {topic.display_name || topic.displayName}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">{topic.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap mt-8 pt-6 border-t">
        <Link
          href={`/past-papers/${slug}`}
          className="bg-primary-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-800 transition"
        >
          📄 Past Papers
        </Link>
        <Link
          href={`/subjects?board=${board}`}
          className="bg-gray-100 text-primary-900 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
        >
          📚 All {board} Subjects
        </Link>
      </div>
    </div>
  );
}
