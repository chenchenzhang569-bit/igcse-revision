// fix: anon-key subtopic filtering + all subjects
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSubtopic, getSubtopics } from "@/lib/subtopic-data";
import { TopicTabs } from "../TopicTabs";
import AdditionalMathsTabs from "../AdditionalMathsTabs";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics", "physics-0625": "physics",
  "caie-chemistry-0620": "chemistry", "chemistry-0620": "chemistry",
  "caie-biology-0610": "biology", "biology-0610": "biology",
  "caie-mathematics-0580": "mathematics", "mathematics-0580": "mathematics",
  "edexcel-physics-4ph1": "physics", "physics-4ph1": "physics",
  "edexcel-chemistry-4ch1": "chemistry", "chemistry-4ch1": "chemistry",
  "edexcel-biology-4bi1": "biology", "biology-4bi1": "biology",
  "edexcel-mathematics-4ma1": "mathematics", "mathematics-4ma1": "mathematics",
  "caie-additional-mathematics-0606": "additional-maths",
  "caie-economics-0455": "economics",
  "caie-physics": "physics", "caie-chemistry": "chemistry",
  "caie-biology": "biology", "caie-mathematics": "mathematics",
  "edexcel-physics": "physics", "edexcel-chemistry": "chemistry",
  "edexcel-biology": "biology", "edexcel-mathematics": "mathematics",
};

const TOPIC_SLUG_TO_DB: Record<string, string> = {
  "motion-forces-energy": "general-physics",
  "thermal-physics": "physics-0625-thermal-physics",
  "waves": "physics-0625-properties-of-waves",
  "electricity-magnetism": "physics-0625-electricity-and-magnetism",
  "nuclear-physics": "physics-0625-atomic-physics",
  "space-physics": "physics-0625-space-physics",
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
  "states-of-matter": "States of Matter",
  "atoms-elements-compounds": "Atoms, Elements & Compounds",
  "stoichiometry": "Stoichiometry", "electrochemistry": "Electrochemistry",
  "chemical-energetics": "Chemical Energetics",
  "chemical-reactions": "Chemical Reactions",
  "acids-bases-salts": "Acids, Bases & Salts",
  "periodic-table": "The Periodic Table", "metals": "Metals",
  "chemistry-environment": "Chemistry of the Environment",
  "organic-chemistry": "Organic Chemistry",
  "experimental-techniques": "Experimental Techniques",
  "characteristics-living-organisms": "Characteristics of Living Organisms",
  "organisation-organism": "Organisation of the Organism",
  "movement-cells": "Movement In & Out of Cells",
  "biological-molecules": "Biological Molecules", "enzymes": "Enzymes",
  "plant-nutrition": "Plant Nutrition", "human-nutrition": "Human Nutrition",
  "transport-plants": "Transport in Plants",
  "transport-animals": "Transport in Animals",
  "diseases-immunity": "Diseases & Immunity",
  "gas-exchange-humans": "Gas Exchange in Humans",
  "respiration": "Respiration", "excretion-humans": "Excretion in Humans",
  "coordination-response": "Coordination & Response", "drugs": "Drugs",
  "reproduction": "Reproduction", "inheritance": "Inheritance",
  "variation-selection": "Variation & Selection",
  "organisms-environment": "Organisms & Their Environment",
  "human-influences-ecosystems": "Human Influences on Ecosystems",
  "biotechnology": "Biotechnology & Genetic Modification",
  "number": "Number", "algebra-graphs": "Algebra & Graphs",
  "coordinate-geometry": "Coordinate Geometry", "geometry": "Geometry",
  "mensuration": "Mensuration", "trigonometry": "Trigonometry",
  "vectors-transformations": "Vectors & Transformations",
  "probability": "Probability", "statistics": "Statistics",
  // 0455 Economics topics
  "1-the-basic-economic-problem": "1. The Basic Economic Problem",
  "2-the-allocation-of-resources": "2. The Allocation of Resources",
  "3-microeconomic-decision-makers": "3. Microeconomic Decision-Makers",
  "4-government-and-the-macroeconomy": "4. Government & the Macroeconomy",
  "5-economic-development": "5. Economic Development",
  "6-international-trade-and-globalisation": "6. International Trade & Globalisation",
};

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  let subtopic = getSubtopic(subjectKey, topicSlug, subtopicSlug);
  // For additional-maths/economics: subtopic slugs ARE the DB slugs, bypass hardcoded lookup
  if (subjectKey === "additional-maths" || subjectKey === "economics") {
    subtopic = { name: subtopicSlug, displayName: subtopicSlug, slug: subtopicSlug, pmtCode: "" };
    // Fetch real display_name from DB
    try {
      const subRes = await fetch(`${API}/subtopics?select=display_name,slug&slug=eq.${subtopicSlug}&limit=1`, { headers: H, cache: "no-store" });
      const subData = await subRes.json();
      if (Array.isArray(subData) && subData[0]?.display_name) {
        subtopic.displayName = subData[0].display_name;
      }
    } catch {}
  }
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
  let subtopicId: string | null = null;

  try {
    const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
    let topicRow: any = null;
    const pmtCode = subtopic?.pmtCode || "";
    
    const topicSearchPat = subjectKey === "additional-maths"
      ? `*0606-${encodeURIComponent(topicSlug)}`
      : subjectKey === "economics"
      ? `*0455-${encodeURIComponent(topicSlug)}`
      : `*${encodeURIComponent(topicSlug)}`;
    const tRes = await fetch(`${API}/topics?select=id,sort_order&slug=ilike.${topicSearchPat}&limit=1`, { headers: H, cache: "no-store" });
    const tData = await tRes.json();
    topicRow = Array.isArray(tData) && tData.length > 0 ? tData[0] : null;
    
    if (!topicRow && dbSlug !== topicSlug) {
      const tRes2 = await fetch(`${API}/topics?select=id&slug=eq.${encodeURIComponent(dbSlug)}&limit=1`, { headers: H, cache: "no-store" });
      const tData2 = await tRes2.json();
      topicRow = Array.isArray(tData2) && tData2.length > 0 ? tData2[0] : null;
    }

    if (topicRow && pmtCode) {
      try {
        const subRes = await fetch(`${API}/subtopics?select=id&topic_id=eq.${topicRow.id}&pmt_code=eq.${encodeURIComponent(pmtCode)}&limit=1`, { headers: H, cache: "no-store" });
        const subData = await subRes.json();
        if (Array.isArray(subData) && subData.length > 0) subtopicId = subData[0].id;
      } catch {}
    }
    // Fallback for additional-maths/economics: lookup by subtopic slug
    if (!subtopicId && topicRow && (subjectKey === "additional-maths" || subjectKey === "economics")) {
      try {
        const subRes = await fetch(`${API}/subtopics?select=id,sort_order,display_name&topic_id=eq.${topicRow.id}&slug=eq.${encodeURIComponent(subtopicSlug)}&limit=1`, { headers: H, cache: "no-store" });
        const subData = await subRes.json();
        if (Array.isArray(subData) && subData.length > 0) {
          subtopicId = subData[0].id;
          subtopic.pmtCode = `${topicRow.sort_order || 1}.${subData[0].sort_order || 1}`;
          // Strip section number from displayName (already shown as pmtCode)
          const fullName = subData[0].display_name || subtopic.displayName;
          const match = fullName.match(/^\d+\.\d+\s+(.*)/);
          if (match) subtopic.displayName = match[1];
        }
      } catch {}
    }

    const filterCol = subtopicId ? "subtopic_id" : "topic_id";
    const filterVal = subtopicId || topicRow?.id;

    if (filterVal) {
      const nRes = await fetch(`${API}/notes?select=*&${filterCol}=eq.${filterVal}&order=sort_order&limit=20`, { headers: H, cache: "no-store" });
      notes = await nRes.json();
      notes = Array.isArray(notes) ? notes : [];

      const qRes = await fetch(`${API}/questions?select=*&${filterCol}=eq.${filterVal}&order=sort_order&limit=100`, { headers: H, cache: "no-store" });
      const allQs = await qRes.json();
      if (Array.isArray(allQs)) {
        for (const q of allQs) {
          const txt = q.question_text || "";
          const hasAbcd = /\b[A-D]\b[.):]|\([A-D]\)|\[[A-D]\]/.test(txt);
          const ansIsLetter = /^[A-D]$/i.test((q.answer_text || "").trim());
          if (hasAbcd || ansIsLetter) {
            mcqs.push({ ...q, correct_answer: q.correct_answer || q.answer_text });
          } else {
            structuredQs.push(q);
          }
        }
      }

      const pRes = await fetch(`${API}/past_papers?select=*&${filterCol}=eq.${filterVal}&order=title&limit=50`, { headers: H, cache: "no-store" });
      const papers = await pRes.json();
      if (Array.isArray(papers) && papers.length > 0) {
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
    }
  } catch {}

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
      {(subjectKey === "additional-maths" || subjectKey === "economics") ? (
        <AdditionalMathsTabs
          notes={notes}
          structuredQuestions={structuredQs}
          subtopicId={subtopicId}
          subtopicName={subtopic.displayName}
          slug={slug}
          topicSlug={topicSlug}
        />
      ) : (
        <TopicTabs
          notes={notes}
          mcqs={mcqs}
          mcqPairs={mcqPairs as any}
          pairedPapers={structPairs as any}
          structuredQuestions={structuredQs}
          pmtCode={subtopic.pmtCode}
          displayName={subtopic.displayName}
          subtopicId={subtopicId}
          subjectSlug={slug}
          topicSlug={topicSlug}
        />
      )}

      {/* Back/Next Navigation — within same Topic */}
      {(() => {
        const allSubs = getSubtopics(subjectKey, topicSlug);
        const currentIdx = allSubs.findIndex(s => s.slug === subtopicSlug);
        const prevSub = currentIdx > 0 ? allSubs[currentIdx - 1] : null;
        const nextSub = currentIdx < allSubs.length - 1 ? allSubs[currentIdx + 1] : null;

        if (!prevSub && !nextSub) return null;

        return (
          <div className="mt-10 flex justify-between items-start gap-4">
            {prevSub ? (
              <div className="flex flex-col items-start gap-1.5">
                <Link
                  href={`/subjects/${slug}/topics/${topicSlug}/${prevSub.slug}`}
                  className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg px-4 py-2 transition group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform">←</span>
                  <span className="text-sm font-bold">Previous</span>
                </Link>
                <span className="text-xs font-medium text-[#001C71]">{prevSub.pmtCode} {prevSub.displayName}</span>
              </div>
            ) : <div />}

            {nextSub ? (
              <div className="flex flex-col items-end gap-1.5">
                <Link
                  href={`/subjects/${slug}/topics/${topicSlug}/${nextSub.slug}`}
                  className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg px-4 py-2 transition group"
                >
                  <span className="text-sm font-bold">Next</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <span className="text-xs font-medium text-[#001C71] text-right">{nextSub.pmtCode} {nextSub.displayName}</span>
              </div>
            ) : <div />}
          </div>
        );
      })()}
    </div>
  );
}
