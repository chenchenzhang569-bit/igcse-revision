import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("name, display_name, code, slug, icon, price_cny, exam_boards!inner(name)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!subject) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">科目不存在</p>
        <Link href="/dashboard" className="text-primary-600 mt-4 inline-block">返回仪表盘 →</Link>
      </div>
    );
  }

  // Fetch topics for this subject
  const { data: topics } = await supabase
    .from("topics")
    .select("name, display_name, slug, description")
    .eq("subject_id", (subject as any).id)
    .order("sort_order");

  const board = (subject as any).exam_boards?.name || "CAIE";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-primary-600 transition mb-2 inline-block">
          ← 返回仪表盘
        </Link>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-5xl">{(subject as any).icon || "📚"}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{(subject as any).display_name}</h1>
            <p className="text-gray-500 mt-1">
              {board} IGCSE {(subject as any).name} ({(subject as any).code})
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
                {topic.display_name}
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
