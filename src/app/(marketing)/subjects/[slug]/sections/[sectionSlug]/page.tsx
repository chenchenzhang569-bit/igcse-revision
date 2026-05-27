import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";

const supabase = getSupabaseClient();

const SLUG_TO_SECTION: Record<string, string> = {
  "number": "Number",
  "algebra-sequences": "Algebra & Sequences",
  "coordinate-geometry-graphs": "Coordinate Geometry & Graphs",
  "geometry": "Geometry",
  "lengths-areas-volumes": "Lengths, Areas & Volumes",
  "pythagoras-trigonometry": "Pythagoras & Trigonometry",
  "transformations": "Transformations",
  "probability": "Probability",
  "statistics": "Statistics",
};

const SME_SECTION_MAP: Record<string, string> = {
  // Parent topic slugs (new structure)
  "section-number":"Number","section-algebra-and-sequences":"Algebra & Sequences",
  "section-coordinate-geometry-and-graphs":"Coordinate Geometry & Graphs",
  "section-geometry":"Geometry","section-lengths-areas-and-volumes":"Lengths, Areas & Volumes",
  "section-pythagoras-and-trigonometry":"Pythagoras & Trigonometry",
  "section-transformations":"Transformations","section-probability":"Probability",
  "section-statistics":"Statistics",
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

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string; sectionSlug: string }>;
}) {
  const { slug, sectionSlug } = await params;
  const sectionName = SLUG_TO_SECTION[sectionSlug];
  
  if (!sectionName) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Section not found</p>
        <Link href={`/subjects/${slug}`} className="text-primary-600 mt-4 inline-block">← Back</Link>
      </div>
    );
  }

  // Fetch topics for this section from DB
  let topics: { name: string; slug: string }[] = [];
  try {
    // Find maths subject
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id")
      .eq("code", "0580")
      .single();
    
    if (subjects) {
      const { data: dbTopics } = await supabase
        .from("topics")
        .select("name, slug, sort_order")
        .eq("subject_id", subjects.id)
        .order("sort_order");

      if (dbTopics) {
        for (const t of dbTopics) {
          const smeSlug = t.slug.split("-").slice(3).join("-") || t.slug;
          if (SME_SECTION_MAP[smeSlug] === sectionName) {
            topics.push({ name: t.name, slug: smeSlug });
          }
        }
      }
    }
  } catch (e) {
    console.error("Section fetch failed:", e);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <span className="text-gray-600">{sectionName}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">{sectionName}</h1>
      <p className="text-gray-500 mt-1">{topics.length} topics</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topics.map((topic, i) => (
          <Link
            key={topic.slug}
            href={`/subjects/${slug}/topics/${topic.slug}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-accent-300 transition-all group flex items-center gap-4"
          >
            <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">{i + 1}</span>
            <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
              {topic.name}
            </h3>
            <span className="text-gray-300 group-hover:text-primary-500 ml-auto">→</span>
          </Link>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="mt-8 bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">No topics found in this section</p>
        </div>
      )}
    </div>
  );
}
