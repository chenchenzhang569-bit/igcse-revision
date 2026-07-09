// force-redeploy-v8-0606-mock
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PastPapersTab } from "./PastPapersTab";
import { MockExamsTab } from "./MockExamsTab";
import { SubjectSearchBox } from "./SubjectSearchBox";

export const dynamic = "force-dynamic";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

interface Topic { name: string; displayName: string; slug: string; sort: number }
interface TopicSection { section: string; topics: Topic[]; subtopicCount?: number }

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
const ADDITIONAL_MATHEMATICS: Topic[] = [
  { name: "Algebra & Functions", displayName: "Algebra & Functions", slug: "algebra-functions", sort: 1 },
  { name: "Coordinate Geometry", displayName: "Coordinate Geometry", slug: "coordinate-geometry", sort: 2 },
  { name: "Trigonometry", displayName: "Trigonometry", slug: "trigonometry", sort: 3 },
  { name: "Sequences & Series", displayName: "Sequences & Series", slug: "sequences-series", sort: 4 },
  { name: "Vectors", displayName: "Vectors", slug: "vectors", sort: 5 },
  { name: "Calculus", displayName: "Calculus", slug: "calculus", sort: 6 },
];
const ECONOMICS: Topic[] = [
  { name: "1. The Basic Economic Problem", displayName: "The Basic Economic Problem", slug: "1-the-basic-economic-problem", sort: 1 },
  { name: "2. The Allocation of Resources", displayName: "The Allocation of Resources", slug: "2-the-allocation-of-resources", sort: 2 },
  { name: "3. Microeconomic Decision-Makers", displayName: "Microeconomic Decision-Makers", slug: "3-microeconomic-decision-makers", sort: 3 },
  { name: "4. Government & the Macroeconomy", displayName: "Government & the Macroeconomy", slug: "4-government-and-the-macroeconomy", sort: 4 },
  { name: "5. Economic Development", displayName: "Economic Development", slug: "5-economic-development", sort: 5 },
  { name: "6. International Trade & Globalisation", displayName: "International Trade & Globalisation", slug: "6-international-trade-and-globalisation", sort: 6 },
];

const COMPUTER_SCIENCE: Topic[] = [
  { name: "1. Data Representation", displayName: "Data Representation", slug: "data-representation", sort: 1 },
  { name: "2. Data Transmission", displayName: "Data Transmission", slug: "data-transmission", sort: 2 },
  { name: "3. Hardware", displayName: "Hardware", slug: "hardware", sort: 3 },
  { name: "4. Software", displayName: "Software", slug: "software", sort: 4 },
  { name: "5. The Internet & its Uses", displayName: "The Internet & its Uses", slug: "the-internet-its-uses", sort: 5 },
  { name: "6. Automated & Emerging Technologies", displayName: "Automated & Emerging Technologies", slug: "automated-emerging-technologies", sort: 6 },
  { name: "7. Algorithm Design & Problem-Solving", displayName: "Algorithm Design & Problem-Solving", slug: "algorithm-design-problem-solving", sort: 7 },
  { name: "8. Programming", displayName: "Programming", slug: "programming", sort: 8 },
  { name: "9. Databases", displayName: "Databases", slug: "databases", sort: 9 },
  { name: "10. Boolean Logic", displayName: "Boolean Logic", slug: "boolean-logic", sort: 10 },
];

// SME math section mapping (slug → section name)
const SME_SECTION_MAP: Record<string, string> = {
  // Parent topic slugs (new structure)
  "section-number":"Number","section-algebra-and-sequences":"Algebra & Sequences",
  "section-coordinate-geometry-and-graphs":"Coordinate Geometry & Graphs",
  "section-geometry":"Geometry","section-lengths-areas-and-volumes":"Lengths, Areas & Volumes",
  "section-pythagoras-and-trigonometry":"Pythagoras & Trigonometry",
  "section-transformations":"Transformations","section-probability":"Probability",
  "section-statistics":"Statistics",
  // 0606 Additional Mathematics sections
  "algebra-functions":"Algebra & Functions","coordinate-geometry":"Coordinate Geometry",
  "trigonometry":"Trigonometry","sequences-series":"Sequences & Series",
  "vectors":"Vectors","calculus":"Calculus",
  // 0455 Economics sections
  "1-the-basic-economic-problem":"1. The Basic Economic Problem",
  "2-the-allocation-of-resources":"2. The Allocation of Resources",
  "3-microeconomic-decision-makers":"3. Microeconomic Decision-Makers",
  "4-government-and-the-macroeconomy":"4. Government & the Macroeconomy",
  "5-economic-development":"5. Economic Development",
  "6-international-trade-and-globalisation":"6. International Trade & Globalisation",
  // 0478 Computer Science
  "data-representation":"1. Data Representation",
  "data-transmission":"2. Data Transmission",
  "hardware":"3. Hardware",
  "software":"4. Software",
  "the-internet-its-uses":"5. The Internet & its Uses",
  "automated-emerging-technologies":"6. Automated & Emerging Technologies",
  "algorithm-design-problem-solving":"7. Algorithm Design & Problem-Solving",
  "programming":"8. Programming",
  "databases":"9. Databases",
  "boolean-logic":"10. Boolean Logic",
  // 4GE1 Geography sections
  "1-river-environments":"River Environments",
  "2-coastal-environments":"Coastal Environments",
  "3-hazardous-environments":"Hazardous Environments",
  "4-economic-activity-and-energy":"Economic Activity & Energy",
  "5-rural-environments":"Rural Environments",
  "6-urban-environments":"Urban Environments",
  "7-fragile-environments-and-climate-change":"Fragile Environments & Climate Change",
  "8-globalisation-and-migration":"Globalisation & Migration",
  "9-development-and-human-welfare":"Development & Human Welfare",
  "10-river-fieldwork":"River Fieldwork",
  "11-coastal-fieldwork":"Coastal Fieldwork",
  "12-hazardous-fieldwork":"Hazardous Fieldwork",
  "13-economic-activity-and-energy-fieldwork":"Economic Activity & Energy Fieldwork",
  "14-rural-fieldwork":"Rural Fieldwork",
  "15-urban-fieldwork":"Urban Fieldwork",
  "16-general-fieldwork-skills":"General Fieldwork Skills",
  "17-extended-response-questions":"Extended Response Questions",
  // slice(3) partials for 3+ word names
  "and-graphs":"Coordinate Geometry & Graphs","and-volumes":"Lengths, Areas & Volumes",
  // Legacy subtopic slugs (backward compat)
  "types-of-numbers":"Number","compound-measures":"Number","fractions-decimals-and-percentages":"Number",
  "introduction-to-fractions":"Number","money-calculations":"Number","operations-with-fractions":"Number",
  "operations-with-numbers-and-decimals":"Number","percentages":"Number","powers-roots-and-standard-form":"Number",
  "prime-factors-hcf-and-lcm":"Number","ratio-and-proportion":"Number","reading-and-ordering-numbers":"Number",
  "rounding-estimation-and-bounds":"Number","simple-and-compound-interest":"Number","time-currency-and-conversions":"Number",
  "using-a-calculator":"Number",
  "algebraic-roots-and-indices":"Algebra & Sequences","expanding-and-factorising-brackets":"Algebra & Sequences",
  "inequalities":"Algebra & Sequences","introduction-to-algebra":"Algebra & Sequences",
  "linear-equations":"Algebra & Sequences","rearranging-formulas":"Algebra & Sequences",
  "sequences":"Algebra & Sequences","simultaneous-equations":"Algebra & Sequences",
  "further-graphs":"Coordinate Geometry & Graphs","linear-graphs":"Coordinate Geometry & Graphs",
  "real-life-graphs":"Coordinate Geometry & Graphs",
  "angles-in-polygons-and-parallel-lines":"Geometry","basic-angle-properties":"Geometry",
  "bearings-constructions-and-scale-drawings":"Geometry","circle-theorems":"Geometry",
  "symmetry-and-shapes":"Geometry",
  "area-and-perimeter":"Lengths, Areas & Volumes","circles-arcs-and-sectors":"Lengths, Areas & Volumes",
  "congruence-and-similarity":"Lengths, Areas & Volumes","volume-and-surface-area":"Lengths, Areas & Volumes",
  "pythagoras":"Pythagoras & Trigonometry","trigonometry":"Pythagoras & Trigonometry",
  "transformations":"Transformations",
  "basic-probability":"Probability","set-notation-and-probability-diagrams":"Probability",
  "averages-and-range":"Statistics","scatter-graphs-and-correlation":"Statistics","statistical-diagrams":"Statistics",
};

const SME_SECTION_ORDER = [
  "Number",
  "Algebra & Sequences",
  "Coordinate Geometry & Graphs",
  "Geometry",
  "Lengths, Areas & Volumes",
  "Pythagoras & Trigonometry",
  "Transformations",
  "Probability",
  "Statistics",
];

const DATA: Record<string, { board: string; code: string; name: string; icon: string; key: string; topics: Topic[] }> = {
  "caie-physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "caie-chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "caie-biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "caie-mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "edexcel-chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "edexcel-biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "edexcel-mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics A (F)", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-mathematics-higher-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics (H)", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-further-maths-4pm1":  { board: "Edexcel", code: "4PM1", name: "Further Pure Mathematics 4PM1", icon: "🔢", key: "further-maths", topics: [] },
  "edexcel-business-4bs1":       { board: "Edexcel", code: "4BS1", name: "Business Studies 4BS1", icon: "📊", key: "business", topics: [] },
  "edexcel-economics-4ec1":      { board: "Edexcel", code: "4EC1", name: "Economics 4EC1", icon: "📈", key: "economics", topics: [] },
  "edexcel-geography-4ge1":      { board: "Edexcel", code: "4GE1", name: "Geography 4GE1", icon: "🌍", key: "geography", topics: [] },
  "edexcel-statistics-1st0":     { board: "Edexcel", code: "1ST0", name: "Statistics 1ST0", icon: "📊", key: "statistics", topics: [] },
  "caie-additional-mathematics-0606": { board: "CAIE", code: "0606", name: "Additional Mathematics", icon: "🧮", key: "0606", topics: ADDITIONAL_MATHEMATICS },
  "caie-economics-0455":            { board: "CAIE", code: "0455", name: "Economics",            icon: "📊", key: "economics", topics: ECONOMICS },
  "caie-computer-science-0478":     { board: "CAIE", code: "0478", name: "Computer Science",   icon: "💻", key: "computer-science", topics: COMPUTER_SCIENCE },
  // Old format aliases (without board prefix)
  "physics-0625":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "chemistry-0620":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "biology-0610":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "mathematics-0580": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "physics-4ph1":     { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "chemistry-4ch1":   { board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "biology-4bi1":     { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "mathematics-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics A (F)", icon: "📐", key: "maths", topics: MATHEMATICS },
  "mathematics-higher-4ma1": { board: "Edexcel", code: "4MA1", name: "Mathematics (H)", icon: "📐", key: "maths", topics: MATHEMATICS },
  "further-maths-4pm1": { board: "Edexcel", code: "4PM1", name: "Further Pure Mathematics", icon: "🔢", key: "further-maths", topics: [] },
  "business-4bs1":     { board: "Edexcel", code: "4BS1", name: "Business Studies", icon: "📊", key: "business", topics: [] },
  "economics-4ec1":    { board: "Edexcel", code: "4EC1", name: "Economics", icon: "📈", key: "economics", topics: [] },
  "geography-4ge1":    { board: "Edexcel", code: "4GE1", name: "Geography", icon: "🌍", key: "geography", topics: [] },
  "statistics-1st0":   { board: "Edexcel", code: "1ST0", name: "Statistics", icon: "📊", key: "statistics", topics: [] },
  // Short aliases (board-only, no code) — used by Subjects list page
  "caie-physics":     { board: "CAIE", code: "0625", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "caie-chemistry":   { board: "CAIE", code: "0620", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "caie-biology":     { board: "CAIE", code: "0610", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "caie-mathematics": { board: "CAIE", code: "0580", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-physics":  { board: "Edexcel", code: "4PH1", name: "Physics",     icon: "⚛️", key: "physics", topics: PHYSICS },
  "edexcel-chemistry":{ board: "Edexcel", code: "4CH1", name: "Chemistry",   icon: "🧪", key: "chemistry", topics: CHEMISTRY },
  "edexcel-biology":  { board: "Edexcel", code: "4BI1", name: "Biology",     icon: "🧬", key: "biology", topics: BIOLOGY },
  "edexcel-mathematics":{ board: "Edexcel", code: "4MA1", name: "Mathematics", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-mathematics-higher":{ board: "Edexcel", code: "4MA1", name: "Mathematics (H)", icon: "📐", key: "maths", topics: MATHEMATICS },
  "edexcel-further-maths":{ board: "Edexcel", code: "4PM1", name: "Further Pure Mathematics", icon: "🔢", key: "further-maths", topics: [] },
  "edexcel-business":   { board: "Edexcel", code: "4BS1", name: "Business Studies", icon: "📊", key: "business", topics: [] },
  "edexcel-economics":  { board: "Edexcel", code: "4EC1", name: "Economics", icon: "📈", key: "economics", topics: [] },
  "edexcel-geography":  { board: "Edexcel", code: "4GE1", name: "Geography", icon: "🌍", key: "geography", topics: [] },
  "edexcel-statistics": { board: "Edexcel", code: "1ST0", name: "Statistics", icon: "📊", key: "statistics", topics: [] },
  "economics-0455":   { board: "CAIE", code: "0455", name: "Economics", icon: "📊", key: "economics", topics: ECONOMICS },
  "caie-economics":   { board: "CAIE", code: "0455", name: "Economics", icon: "📊", key: "economics", topics: ECONOMICS },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = DATA[slug] ?? null;

  if (!data) {
    return {
      title: "Subject",
      description: "IGCSE revision resources for this subject.",
    };
  }

  const subjectName = `${data.board} ${data.name} (${data.code})`;
  const description = `Free IGCSE ${data.name} (${data.code}) revision resources — topic questions, past papers, revision notes, and mock exams for ${data.board}. Practice with detailed answer keys and improve your grade.`;
  const cnDescription = `${data.board} IGCSE ${data.name}（${data.code}）备考资源 — 历年真题、分类练习、复习笔记、模拟考试，含详细答案解析，助你冲刺 A*。`;
  const keywords = [
    `IGCSE ${data.name}`,
    `${data.board} ${data.code}`,
    `${data.name} ${data.code}`,
    `IGCSE ${data.name} past papers`,
    `IGCSE ${data.name} revision notes`,
    `${data.board} IGCSE ${data.name}`,
    `IGCSE ${data.code}`,
    `${data.name} revision`,
    // Chinese long-tail keywords
    `${data.code} 真题`,
    `${data.code} past paper`,
    `IGCSE ${data.name} 真题`,
    `IGCSE ${data.name} 备考`,
    `${data.board} ${data.code} past paper`,
    `IGCSE ${data.code} past paper`,
  ];

  return {
    title: subjectName,
    description,
    keywords,
    openGraph: {
      title: `${subjectName} | IGMaster`,
      description,
      url: `https://igmaster.org/subjects/${slug}`,
    },
    alternates: {
      canonical: `https://igmaster.org/subjects/${slug}`,
      languages: {
        zh: `https://igmaster.org/subjects/${slug}`,
      },
    },
    other: {
      "description:zh": cnDescription,
    },
  };
}

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  let data = DATA[slug];

  // If slug not found in static map, try DB lookup to resolve
  if (!data) {
    try {
      const supabase = createClient();
      // Try matching DB subjects.slug or subject code
      const parts = slug.split("-");
      const maybeCode = parts[parts.length - 1]?.toUpperCase();
      const { data: subjects } = await supabase
        .from("subjects")
        .select("slug, code, name")
        .or(`slug.eq.${slug},code.eq.${maybeCode}`)
        .limit(5);

      if (subjects && subjects.length > 0) {
        // Try to build matching key for DATA map
        for (const subj of subjects) {
          const { data: boards } = await supabase
            .from("exam_boards")
            .select("slug")
            .eq("id", (subj as any).exam_board_id)
            .single();

          const boardSlug = boards?.slug || "caie";
          const fullKey = `${boardSlug}-${subj.slug}-${subj.code}`;
          if (DATA[fullKey]) { data = DATA[fullKey]; break; }
          // Try without code
          const noCodeKey = `${boardSlug}-${subj.slug}`;
          if (DATA[noCodeKey]) { data = DATA[noCodeKey]; break; }
        }
      }
    } catch (e) {
      // fall through to "not found"
    }
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">Browse all subjects →</Link>
      </div>
    );
  }

  const { board, code, name, icon, key } = data;

  // 并行查 subjectId + 用户
  let subjectId: string | null = null;
  let currentUser: any = null;
  try {
    const supabase = createClient();
    const [subjectRes, userRes] = await Promise.all([
      supabase.from("subjects").select("id").eq("slug", slug).maybeSingle(),
      supabase.auth.getUser(),
    ]);
    subjectId = subjectRes.data?.id || null;
    currentUser = userRes.data?.user || null;
  } catch (e) {
    console.error("Initial fetch failed:", e);
  }

  // 购买校验（需要 subjectId + userId）
  let hasAccess = false;
  if (currentUser && subjectId) {
    try {
      const supabase = createClient();
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, subject_id, status, expires_at")
        .eq("user_id", currentUser.id)
        .in("status", ["paid", "trial"]);
      if (purchases && purchases.length > 0) {
        const now = new Date();
        // all-subjects plan covers everything
        if (purchases.some(p => !p.subject_id && (!p.expires_at || new Date(p.expires_at) > now))) {
          hasAccess = true;
        } else {
          // check specific subject purchase
          hasAccess = purchases.some(p =>
            p.subject_id === subjectId &&
            (!p.expires_at || new Date(p.expires_at) > now)
          );
        }
      }
    } catch (e) {
      console.error("Purchase check failed:", e);
    }
  }

  if (!hasAccess) {
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
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Subscribe to Access</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get full access to notes, questions, past papers, and mock exams for {board} {name} {code}
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
          >
            View Plans →
          </Link>
          <p className="text-xs text-gray-400 mt-4">Starting from ¥50 per subject</p>
        </div>
      </div>
    );
  }

  // For maths, fetch topics from DB (SME structure); for others, use hardcoded
  let topics: Topic[] = data.topics;
  let topicSections: TopicSection[] = [];
  const useDbTopics = (key === "maths" || key === "0606" || key === "economics" || key === "computer-science" || key === "further-maths" || key === "business" || key === "geography" || key === "statistics") && subjectId;
  if (useDbTopics) {
    try {
      const supabase = createClient();
      const { data: dbTopics } = await supabase
        .from("topics")
        .select("id, name, slug, sort_order")
        .eq("subject_id", subjectId)
        .order("sort_order");
      if (dbTopics && dbTopics.length > 0) {
        // Edexcel subjects: flat topic list from DB, no SME section grouping
        if (data.board === "Edexcel") {
          const topicSubCounts = new Map<string, number>();
          try {
            const topicIds = dbTopics.map(t => t.id);
            const subRes = await fetch(
              `${API}/subtopics?select=topic_id&topic_id=in.(${topicIds.join(",")})`,
              { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
            );
            if (subRes.ok) {
              const subData = await subRes.json();
              if (Array.isArray(subData)) {
                for (const sub of subData) {
                  topicSubCounts.set(sub.topic_id, (topicSubCounts.get(sub.topic_id) || 0) + 1);
                }
              }
            }
          } catch (_) { /* keep zeros */ }
          topics = dbTopics.map(t => ({
            name: t.name.replace(/^\d+\.\s+/, ''),
            displayName: t.name.replace(/^\d+\.\s+/, ''),
            slug: t.slug,
            sort: t.sort_order,
            subtopicCount: topicSubCounts.get(t.id) || 0,
          }));
          topicSections = [];
        } else {
        const slugSplitIndex = key === "0606" || key === "computer-science" ? 4 : 3;
        // Build parent topic id → section name map
        const topicIdToSection = new Map<string, string>();
        for (const t of dbTopics) {
          const smeSlug = t.slug.split("-").slice(slugSplitIndex).join("-") || t.slug;
          topicIdToSection.set(t.id, SME_SECTION_MAP[smeSlug] || "Other");
        }
        // Count subtopics per section from subtopics table (single batch query)
        const sectionSubCounts = new Map<string, number>();
        for (const secName of new Set<string>(topicIdToSection.values())) sectionSubCounts.set(secName, 0);
        try {
          const topicIds = Array.from(topicIdToSection.keys());
          const subRes = await fetch(
            `${API}/subtopics?select=topic_id&topic_id=in.(${topicIds.join(",")})`,
            { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
          );
          if (subRes.ok) {
            const subData = await subRes.json();
            if (Array.isArray(subData)) {
              for (const sub of subData) {
                const sec = topicIdToSection.get(sub.topic_id);
                if (sec) sectionSubCounts.set(sec, (sectionSubCounts.get(sec) || 0) + 1);
              }
            }
          }
        } catch (_) { /* keep zeros */ }

        // Group parent topics by section
        const grouped = new Map<string, Topic[]>();
        const added = new Set<string>();
        for (const t of dbTopics) {
          const smeSlug = t.slug.split("-").slice(slugSplitIndex).join("-") || t.slug;
          const sectionName = SME_SECTION_MAP[smeSlug] || "Other";
          if (!grouped.has(sectionName)) grouped.set(sectionName, []);
          if (!added.has(smeSlug)) {
            added.add(smeSlug);
            // Strip leading number prefix like "1. " from DB name for display
            const cleanName = t.name.replace(/^\d+\.\s+/, '');
            grouped.get(sectionName)!.push({
              name: sectionName,
              displayName: cleanName,
              slug: smeSlug,
              sort: t.sort_order,
            });
          }
        }
        topicSections = Array.from(grouped.entries()).map(([section, topics]) => ({
          section,
          topics,
          subtopicCount: sectionSubCounts.get(section) || 0,
        }));
        // Sort sections by SME_SECTION_ORDER for maths
        if (key === "maths") {
          const orderIndex = new Map(SME_SECTION_ORDER.map((s, i) => [s, i]));
          topicSections.sort((a, b) => {
            const ai = orderIndex.get(a.section) ?? 999;
            const bi = orderIndex.get(b.section) ?? 999;
            return ai - bi;
          });
        }
          // Also provide flat topics for non-section rendering; attach subtopicCount for non-math subjects
          topics = topicSections.flatMap(s => s.topics.map(t => ({...t, subtopicCount: s.subtopicCount})));
        } // end if (data.board !== "Edexcel")
      }
    } catch (e) {
      console.error("Topic DB fetch failed:", e);
      // Fall back to hardcoded
      topics = data.topics;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://igmaster.org" },
              { "@type": "ListItem", position: 2, name: "Subjects", item: "https://igmaster.org/subjects" },
              { "@type": "ListItem", position: 3, name: `${board} IGCSE ${name}`, item: `https://igmaster.org/subjects/${slug}` },
            ],
          }),
        }}
      />
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">← Back to Home</Link>

      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">{board} IGCSE {name}</h1>
          <p className="text-gray-500 mt-1">Code: {code}</p>
        </div>
      </div>

      {/* Subject intro for SEO */}
      {!tab && (
        <>
          <p className="text-gray-600 mt-6 leading-relaxed">
            Free IGCSE {name} ({code}) revision resources for {board}. 
            Practice with topic questions, past papers, revision notes, and mock exams. 
            Track your progress and improve your exam performance with detailed answer keys.
          </p>
          <p className="text-gray-500 mt-3 leading-relaxed text-sm">
            {board} IGCSE {name}（{code}）备考资料汇总：历年真题（past papers）+ 分类练习题（topic questions）+ 复习笔记（revision notes）+ 模拟考试（mock exams），全部含详细答案解析。在线刷题、错题回顾、学习进度追踪，助你冲刺 A*。
          </p>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mt-8 border-b">
        <Link href={`/subjects/${slug}`} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${!tab || tab === "topics" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📚 Topics</Link>
        <Link href={`/subjects/${slug}?tab=past-papers`} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${tab === "past-papers" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📄 Past Papers</Link>
        <Link href={`/subjects/${slug}?tab=mock-exams`} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${tab === "mock-exams" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📝 Mock Exams</Link>
      </div>

      {/* Topics tab */}
      {(!tab || tab === "topics") && (
        <SubjectSearchBox
          topicSections={topicSections}
          topics={topics}
          slug={slug}
          isMath={key === "maths" && !slug.startsWith("edexcel")}
        />
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

