import Link from "next/link";

const subjectNames: Record<string, string> = {
  "caie-mathematics-0580": "数学",
  "caie-physics-0625": "物理",
  "caie-chemistry-0620": "化学",
};

const mockPapers = [
  { year: 2024, season: "夏季 (May/Jun)", papers: [
    { num: 1, type: "试卷", label: "Paper 1 (Core)" },
    { num: 2, type: "试卷", label: "Paper 2 (Extended)" },
    { num: 3, type: "试卷", label: "Paper 3 (Core)" },
    { num: 4, type: "试卷", label: "Paper 4 (Extended)" },
    { num: 1, type: "评分标准", label: "Paper 1 Mark Scheme" },
    { num: 2, type: "评分标准", label: "Paper 2 Mark Scheme" },
  ]},
  { year: 2023, season: "冬季 (Oct/Nov)", papers: [
    { num: 1, type: "试卷", label: "Paper 1 (Core)" },
    { num: 2, type: "试卷", label: "Paper 2 (Extended)" },
    { num: 3, type: "试卷", label: "Paper 3 (Core)" },
    { num: 4, type: "试卷", label: "Paper 4 (Extended)" },
  ]},
  { year: 2023, season: "夏季 (May/Jun)", papers: [
    { num: 1, type: "试卷", label: "Paper 1 (Core)" },
    { num: 2, type: "试卷", label: "Paper 2 (Extended)" },
  ]},
];

export default async function PastPapersPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const subjectName = subjectNames[subjectSlug] || subjectSlug;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/subjects/${subjectSlug}`} className="text-sm text-gray-400 hover:text-primary-600 transition">
          ← 返回{subjectName}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">📄 {subjectName} 历年真题</h1>
        <p className="text-gray-500 mt-1">CAIE IGCSE 历年考试真题</p>
      </div>

      <div className="space-y-8">
        {mockPapers.map((yearGroup, i) => (
          <div key={i}>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {yearGroup.year} · {yearGroup.season}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {yearGroup.papers.map((paper, j) => (
                <div
                  key={j}
                  className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{paper.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{paper.type}</p>
                  </div>
                  <button className="text-primary-600 text-sm font-medium hover:text-primary-700 transition">
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upload notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
        💡 真题文件需上传至 Supabase Storage 后方可下载。
        请在管理后台「真题管理」中上传 PDF 文件。
      </div>
    </div>
  );
}
