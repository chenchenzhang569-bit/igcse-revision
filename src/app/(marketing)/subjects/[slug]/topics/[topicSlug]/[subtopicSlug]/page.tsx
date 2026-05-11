import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";
import { FALLBACK_DATA } from "@/lib/fallback-content";
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
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="text-primary-600 mt-4 inline-block font-semibold">
          ← Back to Topic
        </Link>
      </div>
    );
  }

  let notes: any[] = [];
  let mcqs: any[] = [];
  let structuredQuestions: any[] = [];
  let mcqPairs: any[] = [];
  let structPairs: any[] = [];

  // Try Supabase first
  // Try Supabase — fall back to old DB slug if new slug doesn't match
  const dbSlug = (TOPIC_SLUG_TO_DB as any)[topicSlug] || topicSlug;
  try {
    let topicRow = null;
    let { data } = await supabase.from("topics").select("id").eq("slug", topicSlug).single();
    topicRow = data;
    if (!topicRow && dbSlug !== topicSlug) {
      const { data: data2 } = await supabase.from("topics").select("id").eq("slug", dbSlug).single();
      topicRow = data2;
    }

    if (topicRow) {
      const { data: dbNotes } = await supabase
        .from("notes").select("*").eq("topic_id", topicRow.id).order("sort_order").limit(20);
      notes = dbNotes || [];

      const { data: dbMcqs } = await supabase
        .from("questions").select("*").eq("topic_id", topicRow.id).eq("question_type", "mcq").order("sort_order").limit(30);
      mcqs = dbMcqs || [];

      const { data: dbStructured } = await supabase
        .from("questions").select("*").eq("topic_id", topicRow.id).in("question_type", ["structured", "essay"]).order("sort_order").limit(20);
      structuredQuestions = dbStructured || [];
    }
  } catch {
    // DB unavailable
  }

  // Fallback: built-in content, matched by SUBTOPIC slug
  const fallback = FALLBACK_DATA[subjectKey]?.[topicSlug]?.[subtopicSlug];
  if (fallback && notes.length === 0 && mcqs.length === 0 && structuredQuestions.length === 0) {
    notes = fallback.notes.map((n, i) => ({
      id: `fb-note-${i}`,
      title: n.title,
      content: n.content,
      is_free_preview: n.is_free_preview,
      file_url: n.file_url || null,
      file_name: n.file_name || null,
      source: n.source || null,
    }));

    mcqs = fallback.mcqs.map((q, i) => ({
      id: `fb-mcq-${i}`,
      question_text: q.question_text,
      answer_text: q.answer_text,
      options: q.options,
      correct_answer: q.answer_text,
      explanation: q.explanation,
      difficulty: q.difficulty,
      marks: 1,
      sort_order: i + 1,
    }));

    structuredQuestions = fallback.structured.map((q, i) => ({
      id: `fb-struct-${i}`,
      question_text: q.question_text,
      answer_text: q.answer_text,
      difficulty: q.difficulty,
      marks: q.marks,
      sort_order: i + 1,
    }));
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
