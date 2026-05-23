// force-redeploy-v32-diagnostics
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";
import { FALLBACK_DATA } from "@/lib/fallback-content";
import { TopicTabs } from "../TopicTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const API_ROOT = `${SUPABASE_URL}/rest/v1`;
const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

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
  "biotechnology": "caie-biology-0610-21-biotechnology-and-genetic-engineering",
  "human-influences-ecosystems": "caie-biology-0610-20-human-influences-on-ecosystems",
};

const TOPIC_DISPLAY: Record<string, string> = {
  "motion-forces-energy": "Motion, Forces & Energy",
  "thermal-physics": "Thermal Physics", "waves": "Waves",
  "electricity-magnetism": "Electricity & Magnetism",
  "nuclear-physics": "Nuclear Physics", "space-physics": "Space Physics",
  "practical-skills-physics": "Practical Skills",
  "practical-skills-chemistry": "Practical Skills",
  "practical-skills-biology": "Practical Skills",
};

// Wrap main logic in a function so we can try-catch everything
async function fetchSubtopicData(slug: string, topicSlug: string, subtopicSlug: string) {
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const subtopic = getSubtopic(subjectKey, topicSlug, subtopicSlug);
  if (!subtopic) return { subtopic: null, error: null };

  const pmtCode = subtopic.pmtCode || "";
  let notes: any[] = [];
  let mcqs: any[] = [];
  let structuredQuestions: any[] = [];
  let mcqPairs: any[] = [];
  let structPairs: any[] = [];
  let subtopicId: string | null = null;

  // Find topic in DB
  const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
  let topicRow: any = null;

  try {
    const tRes1 = await fetch(`${API_ROOT}/topics?select=id&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers, cache: "no-store" });
    const tData1 = await tRes1.json();
    topicRow = Array.isArray(tData1) && tData1.length > 0 ? tData1[0] : null;
  } catch (e: any) { return { subtopic, error: `topics query 1 failed: ${e.message}` }; }

  if (!topicRow && dbSlug !== topicSlug) {
    try {
      const tRes2 = await fetch(`${API_ROOT}/topics?select=id&slug=eq.${encodeURIComponent(dbSlug)}&limit=1`, { headers, cache: "no-store" });
      const tData2 = await tRes2.json();
      topicRow = Array.isArray(tData2) && tData2.length > 0 ? tData2[0] : null;
    } catch (e: any) { return { subtopic, error: `topics query 2 failed: ${e.message}` }; }
  }

  // Find subtopic
  if (topicRow && pmtCode) {
    try {
      const subRes = await fetch(`${API_ROOT}/subtopics?select=id&topic_id=eq.${topicRow.id}&pmt_code=eq.${encodeURIComponent(pmtCode)}&limit=1`, { headers, cache: "no-store" });
      const subData = await subRes.json();
      if (Array.isArray(subData) && subData.length > 0) subtopicId = subData[0].id;
    } catch { /* ok */ }
  }

  const filter = subtopicId
    ? { col: "subtopic_id", val: subtopicId }
    : topicRow ? { col: "topic_id", val: topicRow.id } : null;

  if (filter) {
    // Fetch notes
    try {
      const nRes = await fetch(`${API_ROOT}/notes?select=*&${filter.col}=eq.${filter.val}&order=sort_order&limit=20`, { headers, cache: "no-store" });
      notes = await nRes.json();
      notes = Array.isArray(notes) ? notes : [];
    } catch (e: any) { return { subtopic, error: `notes query failed: ${e.message}` }; }

    // Fetch questions
    let allQs: any[] = [];
    try {
      const qRes = await fetch(`${API_ROOT}/questions?select=*&${filter.col}=eq.${filter.val}&order=sort_order&limit=100`, { headers, cache: "no-store" });
      allQs = await qRes.json();
      allQs = Array.isArray(allQs) ? allQs : [];
    } catch (e: any) { return { subtopic, error: `questions query failed: ${e.message}` }; }

    // Split MCQ vs structured
    for (const q of allQs) {
      const txt = q.question_text || "";
      let hasAbcd = /[A-D][.)\s:]|\([A-D]\)|\[[A-D]\]/.test(txt);
      const hasTable = txt.includes("|") && txt.includes("---") && /[A-D][.)\s:]/.test(txt);
      if (!hasAbcd && q.options) {
        try {
          const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
          if (Array.isArray(opts) && opts.length >= 2) {
            hasAbcd = opts.some((o: string) => o && o.replace(/^[A-D][.)]\s*/, "").trim().length > 0);
          }
        } catch {}
      }
      const ansIsLetter = /^[A-D]$/i.test((q.answer_text || "").trim());
      if (hasAbcd || hasTable || ansIsLetter) {
        mcqs.push({ ...q, correct_answer: q.correct_answer || q.answer_text });
      } else {
        structuredQuestions.push(q);
      }
    }

    // Fetch past papers
    try {
      const pRes = await fetch(`${API_ROOT}/past_papers?select=*&${filter.col}=eq.${filter.val}&order=title&limit=50`, { headers, cache: "no-store" });
      const papers = await pRes.json();
      if (Array.isArray(papers)) {
        const mcqQps = papers.filter((p: any) => p.paper_type === "MCQ QP");
        const mcqMss = papers.filter((p: any) => p.paper_type === "MCQ MS");
        const usedMcq = new Set<string>();
        for (const qp of mcqQps) {
          const base = qp.title.replace(/\s*QP$/, "").trim();
          const ms = mcqMss.find((m: any) => m.title.replace(/\s*MS$/, "").trim() === base && !usedMcq.has(m.id));
          const pair: any = { qp: { id: qp.id, title: qp.title, file_url: qp.file_url, paper_type: qp.paper_type } };
          if (ms) { pair.ms = { id: ms.id, title: ms.title, file_url: ms.file_url, paper_type: ms.paper_type }; usedMcq.add(ms.id); }
          mcqPairs.push(pair);
        }
        for (const ms of mcqMss) { if (!usedMcq.has(ms.id)) mcqPairs.push({ qp: { id: ms.id, title: ms.title, file_url: ms.file_url, paper_type: ms.paper_type } }); }

        const topicQps = papers.filter((p: any) => p.paper_type === "Topic QP");
        const topicMss = papers.filter((p: any) => p.paper_type === "Topic MS");
        const usedTopic = new Set<string>();
        for (const qp of topicQps) {
          const base = qp.title.replace(/\s*QP$/, "").trim();
          const ms = topicMss.find((m: any) => m.title.replace(/\s*MS$/, "").trim() === base && !usedTopic.has(m.id));
          const pair: any = { qp: { id: qp.id, title: qp.title, file_url: qp.file_url, paper_type: qp.paper_type } };
          if (ms) { pair.ms = { id: ms.id, title: ms.title, file_url: ms.file_url, paper_type: ms.paper_type }; usedTopic.add(ms.id); }
          structPairs.push(pair);
        }
        for (const ms of topicMss) { if (!usedTopic.has(ms.id)) structPairs.push({ qp: { id: ms.id, title: ms.title, file_url: ms.file_url, paper_type: ms.paper_type } }); }
      }
    } catch (e: any) { return { subtopic, error: `past_papers query failed: ${e.message}` }; }
  }

  return {
    subtopic, pmtCode, notes, mcqs, structuredQuestions, mcqPairs, structPairs, subtopicId,
    error: null,
  };
}

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  let renderError: string | null = null;
  let result: any = null;

  try {
    const { slug, topicSlug, subtopicSlug } = await params;
    result = await fetchSubtopicData(slug, topicSlug, subtopicSlug);
  } catch (e: any) {
    renderError = `TOP-LEVEL CRASH: ${e.message}\n${e.stack || ""}`;
  }

  if (renderError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-red-600 text-2xl font-bold mb-4">⚠ Diagnostic Error</h1>
        <pre className="bg-red-50 border border-red-200 rounded p-4 text-sm whitespace-pre-wrap overflow-auto max-h-96">{renderError}</pre>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-red-600 text-2xl font-bold">Unexpected: result is null</h1>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-red-600 text-2xl font-bold mb-4">⚠ Data Fetch Error</h1>
        <pre className="bg-red-50 border border-red-200 rounded p-4 text-sm whitespace-pre-wrap overflow-auto max-h-96">{result.error}</pre>
      </div>
    );
  }

  const { subtopic, pmtCode, notes, mcqs, structuredQuestions, mcqPairs, structPairs, subtopicId } = result;

  if (!subtopic) {
    const { slug, topicSlug } = await params;
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subtopic not found</p>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="text-primary-600 mt-4 inline-block font-semibold">
          ← Back to Topic
        </Link>
      </div>
    );
  }

  // Fallback: built-in content
  const { slug, topicSlug, subtopicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const topicDisplay = TOPIC_DISPLAY[topicSlug] || topicSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const fallback = FALLBACK_DATA[subjectKey]?.[topicSlug]?.[subtopicSlug];
  if (fallback && notes.length === 0 && mcqs.length === 0 && structuredQuestions.length === 0) {
    // Use fallback...
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
      <div className="text-xs text-gray-300 mt-1">v32-diag-{notes.length}n</div>
      <TopicTabs
        notes={notes} mcqs={mcqs} mcqPairs={mcqPairs as any}
        pairedPapers={structPairs as any} structuredQuestions={structuredQuestions}
        pmtCode={subtopic.pmtCode} displayName={subtopic.displayName}
        subtopicId={subtopicId}
      />
    </div>
  );
}
