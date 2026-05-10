import Link from "next/link";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

// ---- Inline DATA ----
interface Topic { name: string; displayName: string; slug: string; sort: number }
const TOPIC_DATA: Record<string, Topic[]> = {
  physics: [
    { name: "Motion, forces and energy", displayName: "Motion, Forces & Energy", slug: "motion-forces-energy", sort: 1 },
    { name: "Thermal physics", displayName: "Thermal Physics", slug: "thermal-physics", sort: 2 },
    { name: "Waves", displayName: "Waves", slug: "waves", sort: 3 },
    { name: "Electricity and magnetism", displayName: "Electricity & Magnetism", slug: "electricity-magnetism", sort: 4 },
    { name: "Nuclear physics", displayName: "Nuclear Physics", slug: "nuclear-physics", sort: 5 },
    { name: "Space physics", displayName: "Space Physics", slug: "space-physics", sort: 6 },
  ],
  chemistry: [
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
  biology: [
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
  mathematics: [
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
};

const DATA: Record<string, { board: string; code: string; name: string; icon: string; subjectKey: string; topics: Topic[] }> = {
  "caie-physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", subjectKey: "physics", topics: TOPIC_DATA.physics },
  "caie-chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", subjectKey: "chemistry", topics: TOPIC_DATA.chemistry },
  "caie-biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", subjectKey: "biology", topics: TOPIC_DATA.biology },
  "caie-mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", subjectKey: "mathematics", topics: TOPIC_DATA.mathematics },
  "edexcel-physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", subjectKey: "physics", topics: TOPIC_DATA.physics },
  "edexcel-chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", subjectKey: "chemistry", topics: TOPIC_DATA.chemistry },
  "edexcel-biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", subjectKey: "biology", topics: TOPIC_DATA.biology },
  "edexcel-mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐", subjectKey: "mathematics", topics: TOPIC_DATA.mathematics },
};

async function supabaseFetch(path: string) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return [];
    return (await res.json()) || [];
  } catch { return []; }
}

// ---- Page ----
export default async function PastPapersPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const data = DATA[subjectSlug];

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">Browse all subjects →</Link>
      </div>
    );
  }

  const { board, code, name, icon, topics, subjectKey } = data;

  // Query Supabase via REST API
  let papersBySeason: { key: string; year: number; season: string; count: number }[] = [];
  let debugInfo = "";

  try {
    // 1. Find subject
    const slugs = [subjectSlug, subjectKey, name.toLowerCase()];
    let subjectId: string | null = null;
    for (const s of slugs) {
      const results = await supabaseFetch(`subjects?select=id&slug=eq.${encodeURIComponent(s)}`);
      debugInfo += `slug=${s}: ${results && results.length > 0 ? "found" : "not found"} | `;
      if (results && results.length > 0) { subjectId = results[0].id; break; }
    }

    // Also try by code
    if (!subjectId && code) {
      const results = await supabaseFetch(`subjects?select=id&code=eq.${encodeURIComponent(code)}`);
      debugInfo += `code=${code}: ${results && results.length > 0 ? "found" : "not found"} | `;
      if (results && results.length > 0) subjectId = results[0].id;
    }

    // 2. Fetch papers
    if (subjectId) {
      debugInfo += `subjectId=${subjectId} | `;
      const papers = await supabaseFetch(`past_papers?select=year,season&subject_id=eq.${subjectId}&limit=5000`);
      debugInfo += `papers_count=${papers ? papers.length : 0}`;

      if (papers && papers.length > 0) {
        const groups: Record<string, { year: number; season: string; count: number }> = {};
        for (const p of papers) {
          const key = `${p.year}-${p.season.toLowerCase().replace(/[\/\s]+/g, "-")}`;
          if (!groups[key]) groups[key] = { year: p.year, season: p.season, count: 0 };
          groups[key].count++;
        }
        const seo = (s: string) => {
          if (s.includes("Mar") || s.includes("Feb")) return 1;
          if (s.includes("May") || s.includes("Jun")) return 2;
          if (s.includes("Oct") || s.includes("Nov")) return 3;
          return 9;
        };
        papersBySeason = Object.entries(groups)
          .sort((a, b) => b[1].year - a[1].year || seo(a[1].season) - seo(b[1].season))
          .map(([key, info]) => ({ key, ...info }));
      }
    }
  } catch (e: any) {
    debugInfo = "ERROR: " + (e?.message || String(e));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">← Back to Home</Link>

      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">📄 {board} {name} Past Papers</h1>
          <p className="text-gray-500 mt-1">Code: {code}</p>
        </div>
      </div>

      {/* Past papers by year-season */}
      {papersBySeason.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-primary-900 mb-4">Past Papers by Exam Season</h2>
          <div className="space-y-3">
            {(() => {
              let lastYear = -1;
              return papersBySeason.map((item) => {
                const showYear = item.year !== lastYear;
                lastYear = item.year;
                return (
                  <div key={item.key}>
                    {showYear && (
                      <h3 className="text-lg font-bold text-primary-900 mt-6 mb-3">
                        <span className="bg-primary-600 text-white text-sm px-3 py-0.5 rounded-full">{item.year}</span>
                      </h3>
                    )}
                    <Link
                      href={`/past-papers/${subjectSlug}/${item.key}`}
                      className="bg-white border rounded-xl p-4 hover:shadow-md hover:border-primary-300 transition-all flex items-center justify-between group"
                    >
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-primary-600">📅 {item.season}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.count} papers</span>
                        <span className="text-gray-300 group-hover:text-primary-500">→</span>
                      </div>
                    </Link>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-sm">
            <p className="font-semibold text-yellow-800 mb-2">No past papers found</p>
            <p className="text-yellow-700 break-all">Debug: {debugInfo || "no query attempted"}</p>
          </div>
        </section>
      )}

      {/* Topics */}
      <section className="mt-8 pt-6 border-t">
        <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics.map((topic) => (
            <Link key={topic.slug} href={`/subjects/${subjectSlug}/topics/${topic.slug}`}
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
    </div>
  );
}
