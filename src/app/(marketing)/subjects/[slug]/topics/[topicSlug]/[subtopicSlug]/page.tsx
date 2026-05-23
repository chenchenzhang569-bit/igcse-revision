export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";
import { TopicTabs } from "../TopicTabs";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Minimal mapping for physics only
const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics", "physics-0625": "physics",
  "caie-physics": "physics",
};

const TOPIC_SLUG_TO_DB: Record<string, string> = {
  "motion-forces-energy": "general-physics",
};

const TOPIC_DISPLAY: Record<string, string> = {
  "motion-forces-energy": "Motion, Forces & Energy",
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

  // Data fetching (same as debug page - verified working)
  const dbSlug = TOPIC_SLUG_TO_DB[topicSlug] || topicSlug;
  const tRes = await fetch(`${API}/topics?select=id&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers: H, cache: "no-store" });
  const tData = await tRes.json();
  let topicRow = Array.isArray(tData) && tData.length > 0 ? tData[0] : null;

  if (!topicRow && dbSlug !== topicSlug) {
    const tRes2 = await fetch(`${API}/topics?select=id&slug=eq.${encodeURIComponent(dbSlug)}&limit=1`, { headers: H, cache: "no-store" });
    const tData2 = await tRes2.json();
    topicRow = Array.isArray(tData2) && tData2.length > 0 ? tData2[0] : null;
  }

  const pmtCode = subtopic?.pmtCode || "";
  if (topicRow && pmtCode) {
    try {
      const subRes = await fetch(`${API}/subtopics?select=id&topic_id=eq.${topicRow.id}&pmt_code=eq.${encodeURIComponent(pmtCode)}&limit=1`, { headers: H, cache: "no-store" });
      const subData = await subRes.json();
      if (Array.isArray(subData) && subData.length > 0) subtopicId = subData[0].id;
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
        const hasAbcd = /[A-D][.)\s:]|\([A-D]\)|\[[A-D]\]/.test(txt);
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

  // STEP 1: Just breadcrumbs + title + TopicTabs
  // If this crashes → TopicTabs is the problem
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="hover:text-primary-600">Motion, Forces & Energy</Link>
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
        subtopicId={subtopicId}
      />
    </div>
  );
}
