// step3: add TopicTabs
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";
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

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const subtopic = getSubtopic(subjectKey, topicSlug, subtopicSlug);

  if (!subtopic) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Subtopic not found</h1>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`}>← Back</Link>
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

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1 style={{ color: "green" }}>✅ STEP3: TopicTabs renders below</h1>
      <p>notes: {notes.length} | mcqs: {mcqs.length} | structured: {structuredQs.length}</p>
      <hr style={{ margin: "20px 0" }} />
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
