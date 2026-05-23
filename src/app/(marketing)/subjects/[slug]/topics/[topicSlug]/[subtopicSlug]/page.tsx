// step2: add DB fetch
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";

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

  // DB fetch
  const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
  let topicId: string | null = null;
  let dbError: string | null = null;
  let notesCount = 0;
  let qCount = 0;
  let papersCount = 0;

  try {
    // Find topic
    const tRes = await fetch(`${API}/topics?select=id&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers: H, cache: "no-store" });
    const tData = await tRes.json();
    const topicRow = Array.isArray(tData) && tData.length > 0 ? tData[0] : null;
    topicId = topicRow?.id || null;

    if (topicId) {
      // Fetch notes
      const nRes = await fetch(`${API}/notes?select=id&topic_id=eq.${topicId}&limit=5`, { headers: H, cache: "no-store" });
      const nData = await nRes.json();
      notesCount = Array.isArray(nData) ? nData.length : 0;

      // Fetch questions
      const qRes = await fetch(`${API}/questions?select=id&topic_id=eq.${topicId}&limit=5`, { headers: H, cache: "no-store" });
      const qData = await qRes.json();
      qCount = Array.isArray(qData) ? qData.length : 0;

      // Fetch past papers
      const pRes = await fetch(`${API}/past_papers?select=id&topic_id=eq.${topicId}&limit=5`, { headers: H, cache: "no-store" });
      const pData = await pRes.json();
      papersCount = Array.isArray(pData) ? pData.length : 0;
    }
  } catch (e: any) {
    dbError = e.message;
  }

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1 style={{ color: "green" }}>✅ STEP2: DB Fetch OK</h1>
      <p>slug: {slug}</p>
      <p>topicSlug: {topicSlug} → dbSlug: {dbSlug}</p>
      <p>subtopicSlug: {subtopicSlug}</p>
      <p>subtopic: {subtopic ? `${subtopic.pmtCode} ${subtopic.displayName}` : "NOT FOUND"}</p>
      <p>topicId: {topicId || "NOT FOUND"}</p>
      <p>notes: {notesCount} | questions: {qCount} | papers: {papersCount}</p>
      {dbError && <p style={{ color: "red" }}>DB ERROR: {dbError}</p>}
      <Link href="/">← Home</Link>
    </div>
  );
}
