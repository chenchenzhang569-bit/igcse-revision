import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TopicTabs } from "./TopicTabs";

type PastPaper = {
  id: string;
  title: string;
  file_url: string;
  paper_type: string;
};

type Question = {
  id: string;
  question_text: string;
  answer_text: string;
  difficulty: string;
  marks: number;
  sort_order: number;
};

type Note = {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  is_free_preview: boolean;
};

function pairPapers(papers: PastPaper[]) {
  // Group QP and MS by the filename before _QP or _MS
  const qpMap = new Map<string, PastPaper>();
  const msMap = new Map<string, PastPaper>();

  for (const p of papers) {
    const fname = p.file_url.split("/").pop() || "";
    // Derive base key: remove _QP or _MS suffix
    const base = fname.replace(/_(QP|MS)\.pdf$/i, "");
    if (fname.includes("_MS")) {
      msMap.set(base, p);
    } else {
      qpMap.set(base, p);
    }
  }

  // Pair them
  const pairs: { qp: PastPaper; ms?: PastPaper }[] = [];
  for (const [base, qp] of qpMap) {
    pairs.push({ qp, ms: msMap.get(base) });
  }
  // Also include unpaired MS
  for (const [base, ms] of msMap) {
    if (!qpMap.has(base)) {
      pairs.push({ qp: ms, ms: ms });
    }
  }

  return pairs;
}

export default async function TopicPage({
  params,
}: {
  params: { slug: string; topicSlug: string };
}) {
  const supabase = createClient();

  // Fetch topic
  const { data: topic } = await supabase
    .from("topics")
    .select("id, display_name, slug, subject_id")
    .eq("slug", params.topicSlug)
    .single();

  if (!topic) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">主题不存在</p>
        <Link href="/dashboard" className="text-primary-600 mt-4 inline-block">
          ← 返回仪表盘
        </Link>
      </div>
    );
  }

  // Fetch notes
  const { data: notes = [] } = await supabase
    .from("notes")
    .select("*")
    .eq("topic_id", topic.id)
    .order("sort_order");

  // Fetch MCQs
  const { data: mcqs = [] } = await supabase
    .from("questions")
    .select("*")
    .eq("topic_id", topic.id)
    .order("sort_order");

  // Fetch structured question PDFs (QP + MS)
  const { data: structPapers = [] } = await supabase
    .from("past_papers")
    .select("id, title, file_url, paper_type")
    .eq("topic_id", topic.id)
    .order("title");

  const pairedPapers = pairPapers(structPapers);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">
          仪表盘
        </Link>
        {" / "}
        <Link href={`/subjects/${params.slug}`} className="hover:text-primary-600">
          {params.slug}
        </Link>
        {" / "}
        <span className="text-gray-700">{topic.display_name}</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">{topic.display_name}</h1>

      <TopicTabs
        notes={notes}
        mcqs={mcqs}
        pairedPapers={pairedPapers}
      />
    </div>
  );
}
