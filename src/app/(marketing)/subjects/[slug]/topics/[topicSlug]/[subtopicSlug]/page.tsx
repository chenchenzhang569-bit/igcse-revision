import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { TopicTabs } from "../TopicTabs";

export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type PastPaper = { id: string; title: string; file_url: string; paper_type: string };

function pairPapers(papers: PastPaper[]) {
  const qpMap = new Map<string, PastPaper>();
  const msMap = new Map<string, PastPaper>();
  for (const p of papers) {
    const fname = p.file_url.split("/").pop() || "";
    const base = fname.replace(/_(QP|MS|Question Paper|Mark Scheme)\.pdf$/i, "").replace(/\.pdf$/i, "");
    if (p.paper_type?.includes("Mark Scheme") || fname.includes("_MS")) msMap.set(base, p);
    else qpMap.set(base, p);
  }
  const pairs: { qp: PastPaper; ms?: PastPaper }[] = [];
  for (const [base, qp] of qpMap) pairs.push({ qp, ms: msMap.get(base) });
  for (const [base, ms] of msMap) { if (!qpMap.has(base)) pairs.push({ qp: ms, ms: undefined }); }
  return pairs;
}

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;

  // Fetch subtopic
  const { data: subtopic, error: subError } = await supabase
    .from("subtopics").select("id, pmt_code, display_name, name, slug, topic_id")
    .eq("slug", subtopicSlug).single();

  if (!subtopic || subError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subtopic not found</p>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="text-primary-600 mt-4 inline-block font-semibold">
          ← Back to Topic
        </Link>
      </div>
    );
  }

  // Fetch topic for display
  const { data: topic } = await supabase
    .from("topics").select("id, display_name, slug, sort_order")
    .eq("id", (subtopic as any).topic_id).single();
  const topicDisplay = topic || { display_name: "Unknown", sort_order: 0, slug: topicSlug };

  // Fetch notes
  const { data: notes = [] } = await supabase
    .from("notes").select("*").eq("subtopic_id", (subtopic as any).id).order("sort_order");
  const { data: topicNotes = [] } = await supabase
    .from("notes").select("*").eq("topic_id", (subtopic as any).topic_id).is("subtopic_id", null).order("sort_order");
  const allNotes = [...notes, ...topicNotes];

  // Fetch online MCQs (deduplicate)
  const { data: mcqsRaw = [] } = await supabase
    .from("questions").select("*").eq("subtopic_id", (subtopic as any).id).order("sort_order");
  const groupMap = new Map<string, any>();
  for (const q of mcqsRaw) {
    const key = q.question_text.replace(/!\[.*?\]\(.*?\)/g, "").trim();
    const existing = groupMap.get(key);
    if (!existing) { groupMap.set(key, q); }
    else {
      const newHasImg = /!\[/.test(q.question_text);
      const oldHasImg = /!\[/.test(existing.question_text);
      if (newHasImg && !oldHasImg) groupMap.set(key, q);
    }
  }
  const mcqs = Array.from(groupMap.values());

  // Fetch papers
  const { data: subPapers = [] } = await supabase
    .from("past_papers").select("id, title, file_url, paper_type")
    .eq("subtopic_id", (subtopic as any).id).order("title");
  const { data: topicPapers = [] } = await supabase
    .from("past_papers").select("id, title, file_url, paper_type")
    .eq("topic_id", (subtopic as any).topic_id).is("subtopic_id", null).order("title");
  const allPapers = [...subPapers, ...topicPapers];
  const mcqPapers = allPapers.filter((p: any) => p.paper_type?.includes("MCQ"));
  const structPapers = allPapers.filter((p: any) => !p.paper_type?.includes("MCQ"));
  const mcqPairs = pairPapers(mcqPapers);
  const structPairs = pairPapers(structPapers);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="hover:text-primary-600">
          {(topicDisplay as any).sort_order}. {(topicDisplay as any).display_name}
        </Link>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">
        <span className="text-primary-600 mr-2">{(subtopic as any).pmt_code}</span>
        {(subtopic as any).name || (subtopic as any).display_name}
      </h1>

      <TopicTabs
        notes={allNotes as any}
        mcqs={mcqs as any}
        mcqPairs={mcqPairs as any}
        pairedPapers={structPairs as any}
      />
    </div>
  );
}
