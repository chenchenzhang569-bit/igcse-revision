import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TopicTabs } from "../TopicTabs";

type PastPaper = {
  id: string;
  title: string;
  file_url: string;
  paper_type: string;
};

function pairPapers(papers: PastPaper[]) {
  const qpMap = new Map<string, PastPaper>();
  const msMap = new Map<string, PastPaper>();

  for (const p of papers) {
    const fname = p.file_url.split("/").pop() || "";
    const base = fname.replace(/_(QP|MS|Question Paper|Mark Scheme)\.pdf$/i, "").replace(/\.pdf$/i, "");
    if (p.paper_type?.includes("Mark Scheme") || fname.includes("_MS")) {
      msMap.set(base, p);
    } else {
      qpMap.set(base, p);
    }
  }

  const pairs: { qp: PastPaper; ms?: PastPaper }[] = [];
  for (const [base, qp] of qpMap) {
    pairs.push({ qp, ms: msMap.get(base) });
  }
  for (const [base, ms] of msMap) {
    if (!qpMap.has(base)) {
      pairs.push({ qp: ms, ms: undefined });
    }
  }

  return pairs;
}

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  const supabase = createClient();

  // Fetch subtopic
  const { data: subtopic, error: subError } = await supabase
    .from("subtopics")
    .select("id, pmt_code, display_name, name, slug, topic_id")
    .eq("slug", subtopicSlug)
    .single();

  if (!subtopic || subError) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Subtopic not found</p>
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="text-primary-600 mt-4 inline-block">
          ← Back to Topic
        </Link>
      </div>
    );
  }

  // Fetch topic separately
  const { data: topic } = await supabase
    .from("topics")
    .select("id, display_name, slug, sort_order")
    .eq("id", subtopic.topic_id)
    .single();

  const topicDisplay = topic || { display_name: "Unknown Topic", sort_order: 0, slug: topicSlug };

  // Fetch notes
  const { data: notes = [] } = await supabase
    .from("notes")
    .select("*")
    .eq("subtopic_id", subtopic.id)
    .order("sort_order");

  // Also fetch notes by topic_id (for fallback)
  const { data: topicNotes = [] } = await supabase
    .from("notes")
    .select("*")
    .eq("topic_id", subtopic.topic_id)
    .is("subtopic_id", null)
    .order("sort_order");

  const allNotes = [...notes, ...topicNotes];

  // Fetch online MCQs (deduplicate: keep version with image)
  const { data: mcqsRaw = [] } = await supabase
    .from("questions")
    .select("*")
    .eq("subtopic_id", subtopic.id)
    .order("sort_order");

  // Deduplicate: prefer question with image ![ if same text
  const groupMap = new Map<string, any>();
  for (const q of mcqsRaw) {
    const key = q.question_text.replace(/!\[.*?\]\(.*?\)/g, "").trim();
    const existing = groupMap.get(key);
    if (!existing) {
      groupMap.set(key, q);
    } else {
      const hasImg = (q2: any) => /!\[/.test(q2.question_text);
      const newHasImg = hasImg(q);
      const oldHasImg = hasImg(existing);
      if (newHasImg && !oldHasImg) groupMap.set(key, q);
      // if both have or neither has, keep first (existing)
    }
  }
  const mcqs = Array.from(groupMap.values());

  // Fetch all papers by subtopic_id
  const { data: subPapers = [] } = await supabase
    .from("past_papers")
    .select("id, title, file_url, paper_type")
    .eq("subtopic_id", subtopic.id)
    .order("title");

  // Also fetch papers by topic_id (for papers without subtopic assignment)
  const { data: topicPapers = [] } = await supabase
    .from("past_papers")
    .select("id, title, file_url, paper_type")
    .eq("topic_id", subtopic.topic_id)
    .is("subtopic_id", null)
    .order("title");

  const allPapers = [...subPapers, ...topicPapers];

  const mcqPapers = allPapers.filter((p: any) =>
    p.paper_type?.includes("MCQ")
  );
  const structPapers = allPapers.filter((p: any) =>
    !p.paper_type?.includes("MCQ")
  );

  const mcqPairs = pairPapers(mcqPapers);
  const structPairs = pairPapers(structPapers);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        {" / "}
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        {" / "}
        <Link href={`/subjects/${slug}/topics/${topicSlug}`} className="hover:text-primary-600">
          {topicDisplay.sort_order}. {topicDisplay.display_name}
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">
        <span className="text-primary-600 font-poppins mr-2">{subtopic.pmt_code}</span>
        {subtopic.name}
      </h1>

      <TopicTabs
        notes={allNotes}
        mcqs={mcqs}
        mcqPairs={mcqPairs}
        pairedPapers={structPairs}
      />
    </div>
  );
}
