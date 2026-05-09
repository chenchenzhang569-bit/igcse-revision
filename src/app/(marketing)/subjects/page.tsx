import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SubjectsPage() {
  const supabase = createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("name, display_name, code, slug, icon, price_cny, exam_boards!inner(name)")
    .eq("is_published", true)
    .order("sort_order");

  const allSubjects = (subjects || []).map((s: any) => ({
    ...s,
    board: s.exam_boards?.name || "CAIE",
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">全部科目</h1>
        <p className="text-gray-500 text-lg">选择你的考试局和科目，开始精准复习</p>
      </div>

      {/* Board tabs */}
      <div className="flex justify-center gap-4 mb-12">
        {["CAIE", "Edexcel"].map((board) => (
          <button
            key={board}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              board === "CAIE"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {board}
          </button>
        ))}
      </div>

      {/* Subject grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allSubjects.map((s: any) => (
          <Link
            key={s.slug}
            href={`/subjects/${s.slug}`}
            className="group bg-white border rounded-xl p-6 hover:shadow-lg hover:border-primary-300 transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{s.icon || "📚"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                    {s.board}
                  </span>
                  <span className="text-xs text-gray-400">{s.code}</span>
                </div>
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition">
                  {s.display_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{s.name}</p>
                <p className="text-primary-600 font-bold mt-3">¥{(s.price_cny / 100).toFixed(0)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-16 pt-12 border-t">
        <p className="text-gray-500 mb-4">覆盖 CAIE 与 Edexcel 全部 IGCSE 科目</p>
        <Link
          href="/register"
          className="inline-block bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
        >
          注册解锁全部科目 →
        </Link>
      </div>
    </div>
  );
}
