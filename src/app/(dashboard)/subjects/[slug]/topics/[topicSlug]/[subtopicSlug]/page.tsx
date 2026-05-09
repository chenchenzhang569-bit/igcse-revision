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
  params: { slug: string; topicSlug: string; subtopicSlug: string };
}) {
  const supabase = createClient();

  const { data: subtopic } = await supabase
    .from("subtopics")
    .select("id, pmt_code, display_name, name, slug, topic_id, topics!inner(id, display_name, slug, sort_order, subjects!inner(slug))")
    .eq("slug", params.subtopicSlug)
    .single();

  if (!subtopic) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">小主题不存在</p>
        <Link href={`/subjects/${params.slug}/topics/${params.topicSlug}`} className="text-primary-600 mt-4 inline-block">
          ← 返回主题
        </Link>
      </div>
    );
  }

  const topic = (subtopic as any).topics;

  // Fetch notes
  const { data: notes = [] } = await supabase
    .from("notes")
    .select("*")
    .eq("subtopic_id", subtopic.id)
    .order("sort_order");

  // Fetch online MCQs
  const { data: mcqs = [] } = await supabase
    .from("questions")
    .select("*")
    .eq("subtopic_id", subtopic.id)
    .order("sort_order");

  // Fetch all papers, then split MCQ vs Structured
  const { data: allPapers = [] } = await supabase
    .from("past_papers")
    .select("id, title, file_url, paper_type")
    .eq("subtopic_id", subtopic.id)
    .order("title");

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
        <Link href="/dashboard" className="hover:text-primary-600">仪表盘</Link>
        {" / "}
        <Link href={`/subjects/${params.slug}`} className="hover:text-primary-600">科目</Link>
        {" / "}
        <Link href={`/subjects/${params.slug}/topics/${params.topicSlug}`} className="hover:text-primary-600">
          {topic.sort_order}. {topic.display_name}
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">
        <span className="text-primary-600 font-mono mr-2">{subtopic.pmt_code}</span>
        {subtopic.name}
      </h1>

      <TopicTabs
        notes={notes}
        mcqs={mcqs}
        mcqPairs={mcqPairs}
        pairedPapers={structPairs}
      />
    </div>
  );
}
