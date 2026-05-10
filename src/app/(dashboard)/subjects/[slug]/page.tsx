import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// Fallback static subjects when DB is empty
const STATIC_SUBJECTS: Record<string, { name: string; display_name: string; board: string }> = {
  physics:     { name: "Physics",     display_name: "Physics",     board: "CAIE" },
  chemistry:   { name: "Chemistry",   display_name: "Chemistry",   board: "CAIE" },
  biology:     { name: "Biology",     display_name: "Biology",     board: "CAIE" },
  mathematics: { name: "Mathematics", display_name: "Mathematics", board: "CAIE" },
};

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ board?: string }>;
}) {
  const { slug } = await params;
  const { board: boardParam } = await searchParams;
  const supabase = createClient();

  // Try DB first
  let query = supabase
    .from("subjects")
    .select("id, name, display_name, code, slug, icon, price_cny")
    .eq("slug", slug)
    .eq("is_published", true);

  const { data: subjects } = await query;
  const subject = subjects?.[0] || null;

  if (!subject) {
    // Fallback: use static data
    const fallback = STATIC_SUBJECTS[slug];
    if (!fallback) {
      return (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">科目不存在</p>
          <Link href="/subjects" className="text-primary-600 mt-4 inline-block">浏览全部科目 →</Link>
        </div>
      );
    }

    const displayBoard = boardParam || fallback.board;

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/subjects" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
          ← 全部科目
        </Link>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-5xl">📚</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {displayBoard} IGCSE {fallback.display_name}
            </h1>
            <p className="text-gray-500 mt-1">{fallback.name}</p>
          </div>
        </div>
        <div className="mt-8 p-8 bg-gray-50 rounded-xl text-center">
          <p className="text-gray-500 mb-4">内容正在准备中，即将上线</p>
          <Link
            href={`/subjects?board=${displayBoard}`}
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            浏览 {displayBoard} 全部科目 →
          </Link>
        </div>
      </div>
    );
  }

  // Fetch topics
  const { data: topics } = await supabase
    .from("topics")
    .select("name, display_name, slug, description, sort_order")
    .eq("subject_id", subject.id)
    .order("sort_order");

  const board = boardParam || "CAIE";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/subjects" className="text-sm text-gray-400 hover:text-primary-600 transition mb-2 inline-block">
          ← 全部科目
        </Link>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-5xl">{subject.icon || "📚"}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{subject.display_name}</h1>
            <p className="text-gray-500 mt-1">
              {board} IGCSE {subject.name} {subject.code ? `(${subject.code})` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/past-papers/${slug}`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          📄 历年真题
        </Link>
        <Link
          href={`/mock-exams/${slug}`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          📝 模拟试卷
        </Link>
      </div>

      {/* Topics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">主题列表</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(topics || []).map((topic: any) => (
            <Link
              key={topic.slug}
              href={`/subjects/${slug}/topics/${topic.slug}`}
              className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {topic.sort_order}. {topic.display_name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{topic.name}</p>
              {topic.description && (
                <p className="text-sm text-gray-500 mt-2">{topic.description}</p>
              )}
            </Link>
          ))}
        </div>
        {(!topics || topics.length === 0) && (
          <p className="text-gray-400 text-center py-8">暂无主题</p>
        )}
      </div>
    </div>
  );
}
