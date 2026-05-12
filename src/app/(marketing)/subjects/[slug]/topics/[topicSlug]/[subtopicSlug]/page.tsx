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

const TOPIC_SLUG_TO_DB: Record<string, string> = {
  // Physics CAIE
  "motion-forces-energy": "general-physics",
  "thermal-physics": "physics-0625-thermal-physics",
  "waves": "physics-0625-properties-of-waves",
  "electricity-magnetism": "physics-0625-electricity-and-magnetism",
  "nuclear-physics": "physics-0625-atomic-physics",
  "space-physics": "physics-0625-space-physics",
  // Chemistry CAIE
  "states-of-matter": "caie-chemistry-0620-1-states-of-matter",
  "atoms-elements-compounds": "caie-chemistry-0620-2-atoms-elements-and-compounds",
  "stoichiometry": "caie-chemistry-0620-3-stoichiometry",
  "electrochemistry": "caie-chemistry-0620-4-electrochemistry",
  "chemical-energetics": "caie-chemistry-0620-5-chemical-energetics",
  "chemical-reactions": "caie-chemistry-0620-6-chemical-reactions",
  "acids-bases-salts": "caie-chemistry-0620-7-acids-bases-and-salts",
  "periodic-table": "caie-chemistry-0620-8-the-periodic-table",
  "metals": "caie-chemistry-0620-9-metals",
  "chemistry-environment": "caie-chemistry-0620-10-chemistry-of-the-environment",
  "organic-chemistry": "caie-chemistry-0620-11-organic-chemistry",
  "experimental-techniques": "caie-chemistry-0620-12-experimental-techniques",
  // Biology CAIE
  "characteristics-living-organisms": "caie-biology-0610-1-characteristics-and-classification-of-living-organ",
  "organisation-organism": "caie-biology-0610-2-organisation-of-the-organism",
  "movement-cells": "caie-biology-0610-3-movement-into-and-out-of-cells",
  "biological-molecules": "caie-biology-0610-4-biological-molecules",
  "enzymes": "caie-biology-0610-5-enzymes",
  "plant-nutrition": "caie-biology-0610-6-plant-nutrition",
  "human-nutrition": "caie-biology-0610-7-human-nutrition",
  "transport-plants": "caie-biology-0610-8-transport-in-plants",
  "transport-animals": "caie-biology-0610-9-transport-in-animals",
  "diseases-immunity": "caie-biology-0610-10-diseases-and-immunity",
  "gas-exchange-humans": "caie-biology-0610-11-gas-exchange-in-humans",
  "respiration": "caie-biology-0610-12-respiration",
  "excretion-humans": "caie-biology-0610-13-excretion-in-humans",
  "coordination-response": "caie-biology-0610-14-coordination-and-response",
  "drugs": "caie-biology-0610-15-drugs",
  "reproduction": "caie-biology-0610-16-reproduction",
  "inheritance": "caie-biology-0610-17-inheritance",
  "variation-selection": "caie-biology-0610-18-variation-and-selection",
  "organisms-environment": "caie-biology-0610-19-organisms-and-their-environment",
  "biotechnology": "caie-biology-0610-20-biotechnology-and-genetic-engineering",
  "human-influences-ecosystems": "caie-biology-0610-21-human-influences-on-ecosystems",
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
  const pmtCode = subtopic?.pmtCode || "";

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

  try {
    // Find topic in DB
    const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
    let topicRow = null;
    let { data } = await supabase.from("topics").select("id").eq("slug", topicSlug).single();
    topicRow = data;
    if (!topicRow && dbSlug !== topicSlug) {
      const { data: data2 } = await supabase.from("topics").select("id").eq("slug", dbSlug).single();
      topicRow = data2;
    }

    // Find subtopic by pmt_code + topic_id
    let subtopicId: string | null = null;
    if (topicRow && pmtCode) {
      const { data: subs } = await supabase
        .from("subtopics").select("id").eq("topic_id", topicRow.id).eq("pmt_code", pmtCode).limit(1);
      if (subs && subs.length > 0) subtopicId = subs[0].id;
    }

    // Query with subtopic_id if found, otherwise topic_id
    const filter = subtopicId 
      ? { col: "subtopic_id", val: subtopicId }
      : topicRow ? { col: "topic_id", val: topicRow.id } : null;

    if (filter) {
      const { data: dbNotes } = await supabase
        .from("notes").select("*").eq(filter.col, filter.val).order("sort_order").limit(20);
      notes = dbNotes || [];

      // Get ALL questions — SME data uses "structured" type for MCQs
      const { data: allQs } = await supabase
        .from("questions").select("*").eq(filter.col, filter.val).order("sort_order").limit(100);
      
      if (allQs) {
        // Split by content: has A/B/C/D options or is a table question → MCQ tab
        for (const q of allQs) {
          const txt = q.question_text || "";
          // Detect MCQ: A/B/C/D followed by . ) : or space, or (A)/(B)/[A]/[B] format
          let hasAbcd = /[A-D][.)\s:]|\([A-D]\)|\[[A-D]\]/.test(txt);
          const hasTable = txt.includes("|") && txt.includes("---");
          // Also check options JSONB column
          if (!hasAbcd && q.options) {
            try {
              const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
              if (Array.isArray(opts) && opts.length >= 2) {
                hasAbcd = opts.some((o: string) => o && o.replace(/^[A-D][.)]\s*/, "").trim().length > 0);
              }
            } catch {}
          }
          // Also: if answer_text is a single letter A-D, it's definitely MCQ
          const ansIsLetter = /^[A-D]$/i.test((q.answer_text || "").trim());
          if (hasAbcd || hasTable || ansIsLetter) {
            // MCQ-style — use answer_text for correct answer (correct_answer may be null)
            mcqs.push({ ...q, correct_answer: q.correct_answer || q.answer_text });
          } else {
            structuredQuestions.push(q);
          }
        }
      }
    }
  } catch {
    // DB unavailable
  }

  // Fallback: built-in content
  const fallback = FALLBACK_DATA[subjectKey]?.[topicSlug]?.[subtopicSlug];
  if (fallback && notes.length === 0 && mcqs.length === 0 && structuredQuestions.length === 0) {
    notes = fallback.notes.map((n: any, i: number) => ({
      id: `fb-note-${i}`, title: n.title, content: n.content,
      is_free_preview: n.is_free_preview, file_url: n.file_url || null,
      file_name: n.file_name || null, source: n.source || null,
    }));
    mcqs = fallback.mcqs.map((q: any, i: number) => ({
      id: `fb-mcq-${i}`, question_text: q.question_text, answer_text: q.answer_text,
      options: q.options, correct_answer: q.answer_text, explanation: q.explanation,
      difficulty: q.difficulty, marks: 1, sort_order: i + 1,
    }));
    structuredQuestions = fallback.structured.map((q: any, i: number) => ({
      id: `fb-struct-${i}`, question_text: q.question_text, answer_text: q.answer_text,
      difficulty: q.difficulty, marks: q.marks, sort_order: i + 1,
    }));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="hover:text-primary-600">{topicDisplay}</Link>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">
        <span className="text-primary-600 mr-2">{subtopic.pmtCode}</span>
        {subtopic.displayName}
      </h1>
      <div className="text-xs text-gray-300 mt-1">v8 — 4-way fallback</div>
      <TopicTabs
        notes={notes} mcqs={mcqs} mcqPairs={mcqPairs as any}
        pairedPapers={structPairs as any} structuredQuestions={structuredQuestions}
      />
    </div>
  );
}
