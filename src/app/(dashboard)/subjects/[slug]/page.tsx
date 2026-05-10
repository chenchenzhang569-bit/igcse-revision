import Link from "next/link";

// Full static subject catalog — no DB dependency
const ALL_SUBJECTS: Record<string, {
  board: string;
  subject: string;
  code: string;
  displayName: string;
  icon: string;
}> = {
  "caie-physics-0625":      { board: "CAIE", subject: "Physics",      code: "0625", displayName: "Physics",      icon: "⚛️" },
  "caie-chemistry-0620":    { board: "CAIE", subject: "Chemistry",    code: "0620", displayName: "Chemistry",    icon: "🧪" },
  "caie-biology-0610":      { board: "CAIE", subject: "Biology",      code: "0610", displayName: "Biology",      icon: "🧬" },
  "caie-mathematics-0580":  { board: "CAIE", subject: "Mathematics",  code: "0580", displayName: "Mathematics",  icon: "📐" },
  "edexcel-physics-4ph1":   { board: "Edexcel", subject: "Physics",   code: "4PH1", displayName: "Physics",      icon: "⚛️" },
  "edexcel-chemistry-4ch1": { board: "Edexcel", subject: "Chemistry", code: "4CH1", displayName: "Chemistry",    icon: "🧪" },
  "edexcel-biology-4bi1":   { board: "Edexcel", subject: "Biology",   code: "4BI1", displayName: "Biology",      icon: "🧬" },
  "edexcel-mathematics-4ma1": { board: "Edexcel", subject: "Mathematics", code: "4MA1", displayName: "Mathematics", icon: "📐" },
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = ALL_SUBJECTS[slug];

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">科目不存在</p>
        <Link href="/subjects" className="text-primary-600 mt-4 inline-block">浏览全部科目 →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
        ← 返回首页
      </Link>

      {/* Subject header */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-5xl">{data.icon}</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {data.board} IGCSE {data.subject}
          </h1>
          <p className="text-gray-500 mt-1">Code: {data.code}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap mt-8">
        <Link
          href={`/past-papers/${slug}`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          📄 历年真题
        </Link>
        <Link
          href={`/subjects?board=${data.board}`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          📚 {data.board} 全部科目
        </Link>
      </div>

      {/* Placeholder */}
      <div className="mt-8 p-8 bg-gray-50 rounded-xl text-center">
        <p className="text-gray-500 mb-2">复习内容正在准备中，即将上线</p>
        <p className="text-gray-400 text-sm">涵盖历年真题、主题分类练习和模拟试卷</p>
      </div>
    </div>
  );
}
