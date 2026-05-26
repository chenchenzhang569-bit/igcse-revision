import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";

const supabase = getSupabaseClient();

// Section slug → section name (from SubjectSearchBox sectionSlug generation)
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

// Section name → parent topic DB slug
const SECTION_TO_PARENT_SLUG: Record<string, string> = {
  "Number": "caie-mathematics-0580-section-number",
  "Algebra & Sequences": "caie-mathematics-0580-section-algebra-and-sequences",
  "Coordinate Geometry & Graphs": "caie-mathematics-0580-section-coordinate-geometry-and-graphs",
  "Geometry": "caie-mathematics-0580-section-geometry",
  "Lengths, Areas & Volumes": "caie-mathematics-0580-section-lengths-areas-and-volumes",
  "Pythagoras & Trigonometry": "caie-mathematics-0580-section-pythagoras-and-trigonometry",
  "Transformations": "caie-mathematics-0580-section-transformations",
  "Probability": "caie-mathematics-0580-section-probability",
  "Statistics": "caie-mathematics-0580-section-statistics",
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

  // Fetch subtopics for this section from DB
  let subtopics: { id: string; display_name: string; pmt_code: string; sort_order: number }[] = [];
  let topicSlug = "";
  
  try {
    const parentSlug = SECTION_TO_PARENT_SLUG[sectionName];
    
    // Find parent topic
    const { data: parentTopics } = await supabase
      .from("topics")
      .select("id, slug, name")
      .eq("slug", parentSlug)
      .limit(1);
    
    if (parentTopics && parentTopics.length > 0) {
      const parentTopic = parentTopics[0];
      topicSlug = parentTopic.slug.split("-").slice(3).join("-") || parentTopic.slug;
      // Remove "section-" prefix from the last part
      topicSlug = topicSlug.replace(/^section-/, "");
      
      // Fetch subtopics under this parent
      const { data: subs } = await supabase
        .from("subtopics")
        .select("id, display_name, pmt_code, sort_order")
        .eq("topic_id", parentTopic.id)
        .order("sort_order");
      
      if (subs) subtopics = subs;
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
      <p className="text-gray-500 mt-1">{subtopics.length} subtopics</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subtopics.map((st, i) => {
          // Build subtopic slug from pmt_code + display_name
          const subSlug = st.display_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-+$/, "");
          
          return (
            <Link
              key={st.id}
              href={`/subjects/${slug}/topics/${topicSlug}/${subSlug}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-accent-300 transition-all group flex items-center gap-4"
            >
              <span className="text-accent-500 font-extrabold text-sm shrink-0 w-10">{st.pmt_code}</span>
              <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition text-sm">
                {st.display_name}
              </h3>
              <span className="text-gray-300 group-hover:text-primary-500 ml-auto">→</span>
            </Link>
          );
        })}
      </div>

      {subtopics.length === 0 && (
        <div className="mt-8 bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">No subtopics found in this section</p>
        </div>
      )}
    </div>
  );
}
