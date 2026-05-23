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
    return <div style={{padding:40}}><h1>❌ Subtopic not found</h1><p>slug={slug} topicSlug={topicSlug} subtopicSlug={subtopicSlug}</p></div>;
  }

  const debug: string[] = [];
  debug.push(`URL: slug=${slug}, topicSlug=${topicSlug}, subtopicSlug=${subtopicSlug}`);
  debug.push(`subjectKey=${subjectKey}`);
  debug.push(`pmtCode=${subtopic.pmtCode}`);

  const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
  
  // Step 1: Find topic
  const tRes = await fetch(`${API}/topics?select=id,slug,name&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers: H, cache: "no-store" });
  const tData = await tRes.json();
  let topicRow = Array.isArray(tData) && tData.length > 0 ? tData[0] : null;
  debug.push(`Step1 (slug=${topicSlug}): ${topicRow ? `FOUND id=${topicRow.id}` : "NOT FOUND"}`);

  if (!topicRow && dbSlug !== topicSlug) {
    const tRes2 = await fetch(`${API}/topics?select=id,slug,name&slug=eq.${encodeURIComponent(dbSlug)}&limit=1`, { headers: H, cache: "no-store" });
    const tData2 = await tRes2.json();
    topicRow = Array.isArray(tData2) && tData2.length > 0 ? tData2[0] : null;
    debug.push(`Step1-fallback (slug=${dbSlug}): ${topicRow ? `FOUND id=${topicRow.id}` : "NOT FOUND"}`);
  }

  // Step 2: Find subtopic
  let subtopicId: string | null = null;
  if (topicRow && subtopic.pmtCode) {
    try {
      const subRes = await fetch(`${API}/subtopics?select=id,pmt_code&topic_id=eq.${topicRow.id}&pmt_code=eq.${encodeURIComponent(subtopic.pmtCode)}&limit=1`, { headers: H, cache: "no-store" });
      const subData = await subRes.json();
      if (Array.isArray(subData) && subData.length > 0) {
        subtopicId = subData[0].id;
        debug.push(`Step2: FOUND subtopicId=${subtopicId}, pmt_code=${subData[0].pmt_code}`);
      } else {
        debug.push(`Step2: NOT FOUND. Response: ${JSON.stringify(subData)}`);
      }
    } catch (e: any) {
      debug.push(`Step2: ERROR: ${e.message || String(e)}`);
    }
  } else {
    debug.push(`Step2: SKIPPED (topicRow=${!!topicRow}, pmtCode=${subtopic.pmtCode})`);
  }

  // Step 3: Count with subtopic vs topic filter
  const filterCol = subtopicId ? "subtopic_id" : "topic_id";
  const filterVal = subtopicId || topicRow?.id;
  debug.push(`Step3: filterCol=${filterCol}, filterVal=${filterVal}`);

  let noteCount = 0;
  let questionCount = 0;
  let paperCount = 0;

  if (filterVal) {
    const nRes = await fetch(`${API}/notes?select=id&${filterCol}=eq.${filterVal}&limit=100`, { headers: H, cache: "no-store" });
    const notes = await nRes.json();
    noteCount = Array.isArray(notes) ? notes.length : -1;
    
    const qRes = await fetch(`${API}/questions?select=id&${filterCol}=eq.${filterVal}&limit=200`, { headers: H, cache: "no-store" });
    const questions = await qRes.json();
    questionCount = Array.isArray(questions) ? questions.length : -1;
    
    const pRes = await fetch(`${API}/past_papers?select=id&${filterCol}=eq.${filterVal}&limit=100`, { headers: H, cache: "no-store" });
    const papers = await pRes.json();
    paperCount = Array.isArray(papers) ? papers.length : -1;
  }
  debug.push(`Step3-results: notes=${noteCount}, questions=${questionCount}, papers=${paperCount}`);

  return (
    <div style={{padding:40, fontFamily:"monospace", fontSize:14, lineHeight:1.8, background:"#f5f5f5"}}>
      <h1 style={{color:"#001C71"}}>🔍 Debug: {subtopic.pmtCode} {subtopic.displayName}</h1>
      <pre style={{background:"white", padding:20, borderRadius:8, border:"1px solid #ddd"}}>
        {debug.join("\n")}
      </pre>
      <p style={{marginTop:20}}><Link href={`/subjects/${slug}/topics/${topicSlug}`}>← Back to Topic</Link></p>
    </div>
  );
}
