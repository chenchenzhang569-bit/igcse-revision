import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";
import { createClient } from "@supabase/supabase-js";
import { TopicTabs } from "../TopicTabs";

export const dynamic = "force-dynamic";

const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
);

const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics", "physics-0625": "physics",
  "caie-chemistry-0620": "chemistry", "chemistry-0620": "chemistry",
  "caie-biology-0610": "biology", "biology-0610": "biology",
  "caie-mathematics-0580": "mathematics", "mathematics-0580": "mathematics",
  "edexcel-physics-4ph1": "physics", "physics-4ph1": "physics",
  "edexcel-chemistry-4ch1": "chemistry", "chemistry-4ch1": "chemistry",
  "edexcel-biology-4bi1": "biology", "biology-4bi1": "biology",
  "edexcel-mathematics-4ma1": "mathematics", "mathematics-4ma1": "mathematics",
  // Short aliases (board-only, no code)
  "caie-physics": "physics", "caie-chemistry": "chemistry",
  "caie-biology": "biology", "caie-mathematics": "mathematics",
  "edexcel-physics": "physics", "edexcel-chemistry": "chemistry",
  "edexcel-biology": "biology", "edexcel-mathematics": "mathematics",
};

const TOPIC_DISPLAY: Record<string, string> = {
  "motion-forces-energy": "Motion, Forces & Energy",
  "thermal-physics": "Thermal Physics",
  "waves": "Waves",
  "electricity-magnetism": "Electricity & Magnetism",
  "nuclear-physics": "Nuclear Physics",
  "space-physics": "Space Physics",
};

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const subtopic = getSubtopic(subjectKey, topicSlug, subtopicSlug);
  const topicDisplay = TOPIC_DISPLAY[topicSlug] || topicSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  if (!subtopic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subtopic not found</p>
        <p className="text-xs text-gray-400 mt-1">subjectKey={subjectKey} topicSlug={topicSlug} subtopicSlug={subtopicSlug}</p>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="text-primary-600 mt-4 inline-block font-semibold">
          ← Back to Topic
        </Link>
      </div>
    );
  }

  // Fetch content from Supabase
  let notes: any[] = [];
  let mcqs: any[] = [];
  let structuredQuestions: any[] = [];
  let mcqPairs: any[] = [];
  let structPairs: any[] = [];

  try {
    // Get topic ID from DB
    const { data: topicRow } = await supabase
      .from("topics").select("id").eq("slug", topicSlug).single();

    if (topicRow) {
      // Notes
      const { data: dbNotes } = await supabase
        .from("notes").select("*").eq("topic_id", topicRow.id).order("sort_order").limit(20);
      notes = dbNotes || [];

      // MCQ questions
      const { data: dbMcqs } = await supabase
        .from("questions").select("*").eq("topic_id", topicRow.id).eq("question_type", "mcq").order("sort_order").limit(30);
      mcqs = dbMcqs || [];

      // Structured / essay questions
      const { data: dbStructured } = await supabase
        .from("questions").select("*").eq("topic_id", topicRow.id).in("question_type", ["structured", "essay"]).order("sort_order").limit(20);
      structuredQuestions = dbStructured || [];
    }
  } catch {
    // DB unavailable — show empty content gracefully
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="hover:text-primary-600">
          {topicDisplay}
        </Link>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">
        <span className="text-primary-600 mr-2">{subtopic.pmtCode}</span>
        {subtopic.displayName}
      </h1>

      <TopicTabs
        notes={notes}
        mcqs={mcqs}
        mcqPairs={mcqPairs as any}
        pairedPapers={structPairs as any}
        structuredQuestions={structuredQuestions}
      />
    </div>
  );
}
