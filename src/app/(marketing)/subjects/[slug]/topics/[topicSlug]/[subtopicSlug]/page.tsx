// force-redeploy-v33-no-tabs
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const API_ROOT = `${SUPABASE_URL}/rest/v1`;
const H = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics", "physics-0625": "physics",
  "caie-chemistry-0620": "chemistry", "caie-biology-0610": "biology",
  "caie-mathematics-0580": "mathematics",
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
        <p className="text-gray-400 text-lg">Subtopic not found: {topicSlug}/{subtopicSlug}</p>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="text-primary-600 mt-4 inline-block font-semibold">
          ← Back to Topic
        </Link>
      </div>
    );
  }

  // Minimal: just fetch topic ID to verify DB works
  const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
  let topicId: string | null = null;
  let dbError: string | null = null;

  try {
    const tRes = await fetch(`${API_ROOT}/topics?select=id&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers: H, cache: "no-store" });
    const tData = await tRes.json();
    topicId = Array.isArray(tData) && tData.length > 0 ? tData[0].id : null;
  } catch (e: any) {
    dbError = e.message;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="hover:text-primary-600">{topicDisplay}</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-900 mt-4">
        <span className="text-primary-600 mr-2">{subtopic.pmtCode}</span>
        {subtopic.displayName}
      </h1>

      {/* Diagnostic info */}
      <div className="mt-8 p-4 bg-gray-50 border rounded-lg text-sm font-mono space-y-1">
        <p>✅ Page rendered (v33-no-tabs)</p>
        <p>slug: {slug}</p>
        <p>topicSlug: {topicSlug} (dbSlug: {dbSlug})</p>
        <p>subtopicSlug: {subtopicSlug}</p>
        <p>subjectKey: {subjectKey}</p>
        <p>pmtCode: {subtopic.pmtCode}</p>
        <p>topicId from DB: {topicId || "NOT FOUND"}</p>
        {dbError && <p className="text-red-600">DB ERROR: {dbError}</p>}
      </div>

      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-700 font-medium">✅ No TopicTabs rendered — if you see this, the error is in TopicTabs</p>
      </div>
    </div>
  );
}
