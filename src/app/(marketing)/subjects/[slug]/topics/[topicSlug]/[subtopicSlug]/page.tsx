// step4: add Tailwind + breadcrumb + fallback
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";
import { FALLBACK_DATA } from "@/lib/fallback-content";
import { TopicTabs } from "../TopicTabs";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics",
};

const TOPIC_SLUG_TO_DB: Record<string, string> = {
  "motion-forces-energy": "general-physics",
  "thermal-physics": "physics-0625-thermal-physics",
  "waves": "physics-0625-properties-of-waves",
  "electricity-magnetism": "physics-0625-electricity-and-magnetism",
  "nuclear-physics": "physics-0625-atomic-physics",
  "space-physics": "physics-0625-space-physics",
};

const TOPIC_DISPLAY: Record<string, string> = {
  "motion-forces-energy": "Motion, Forces & Energy",
  "thermal-physics": "Thermal Physics", "waves": "Waves",
  "electricity-magnetism": "Electricity & Magnetism",
  "nuclear-physics": "Nuclear Physics", "space-physics": "Space Physics",
};

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const subtopic = getSubtopic(subjectKey, topicSlug, subtopicSlug);
  const topicDisplay = TOPIC_DISPLAY[topicSlug] || topicSlug;

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
  let structuredQs: any[] = [];
  let mcqPairs: any[] = [];
  let structPairs: any[] = [];

  try {
    const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
    let topicRow: any = null;
    
    const tRes = await fetch(`${API}/topics?select=id&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers: H, cache: "no-store" });
    const tData = await tRes.json();
    topicRow = Array.isArray(tData) && tData.length > 0 ? tData[0] : null;
    
    if (!topicRow && dbSlug !== topicSlug) {
      const tRes2 = await fetch(`${API}/topics?select=id&slug=eq.${encodeURIComponent(dbSlug)}&limit=1`, { headers: H, cache: "no-store" });
      const tData2 = await tRes2.json();
      topicRow = Array.isArray(tData2) && tData2.length > 0 ? tData2[0] : null;
    }

    if (topicRow) {
      const nRes = await fetch(`${API}/notes?select=*&topic_id=eq.${topicRow.id}&order=sort_order&limit=20`, { headers: H, cache: "no-store" });
      notes = await nRes.json();
      notes = Array.isArray(notes) ? notes : [];

      const qRes = await fetch(`${API}/questions?select=*&topic_id=eq.${topicRow.id}&order=sort_order&limit=100`, { headers: H, cache: "no-store" });
      const allQs = await qRes.json();
      if (Array.isArray(allQs)) {
        for (const q of allQs) {
          const txt = q.question_text || "";
          const hasAbcd = /[A-D][.)\s:]|\([A-D]\)|\[[A-D]\]/.test(txt);
          const ansIsLetter = /^[A-D]$/i.test((q.answer_text || "").trim());
          if (hasAbcd || ansIsLetter) {
            mcqs.push({ ...q, correct_answer: q.correct_answer || q.answer_text });
          } else {
            structuredQs.push(q);
          }
        }
      }
    }
  } catch {}

  // Fallback
  const fallback = FALLBACK_DATA[subjectKey]?.[topicSlug]?.[subtopicSlug];
  if (fallback && notes.length === 0 && mcqs.length === 0 && structuredQs.length === 0) {
    notes = fallback.notes?.map((n: any, i: number) => ({
      id: `fb-${i}`, title: n.title, content: n.content, file_url: n.file_url || null,
      file_name: n.file_name || null, is_free_preview: n.is_free_preview,
    })) || [];
    mcqs = fallback.mcqs?.map((q: any, i: number) => ({
      id: `fb-${i}`, question_text: q.question_text, answer_text: q.answer_text,
      options: q.options, correct_answer: q.answer_text, difficulty: q.difficulty,
      marks: 1, sort_order: i + 1,
    })) || [];
    structuredQs = fallback.structured?.map((q: any, i: number) => ({
      id: `fb-${i}`, question_text: q.question_text, answer_text: q.answer_text,
      difficulty: q.difficulty, marks: q.marks, sort_order: i + 1,
    })) || [];
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
      <TopicTabs
        notes={notes}
        mcqs={mcqs}
        mcqPairs={mcqPairs as any}
        pairedPapers={structPairs as any}
        structuredQuestions={structuredQs}
        pmtCode={subtopic.pmtCode}
        displayName={subtopic.displayName}
        subtopicId={null}
      />
    </div>
  );
}
