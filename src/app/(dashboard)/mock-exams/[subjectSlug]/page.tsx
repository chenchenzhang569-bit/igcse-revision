import Link from "next/link";

const subjectNames: Record<string, string> = {
  "caie-mathematics-0580": "数学",
  "caie-physics-0625": "物理",
  "caie-chemistry-0620": "化学",
};

const mockExams = [
  {
    title: "模拟卷 1 — 混合题型",
    desc: "覆盖全部主题，难度等同真题",
    duration: 120,
    marks: 100,
    hasAnswer: true,
  },
  {
    title: "模拟卷 2 — 选择题专练",
    desc: "40 道选择题，45 分钟限时",
    duration: 45,
    marks: 40,
    hasAnswer: true,
  },
  {
    title: "模拟卷 3 — 大题专练",
    desc: "重点考察解题步骤和论证能力",
    duration: 90,
    marks: 60,
    hasAnswer: true,
  },
];

export default async function MockExamsPage({
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
        <h1 className="text-3xl font-bold text-gray-900 mt-2">📝 {subjectName} 模拟试卷</h1>
        <p className="text-gray-500 mt-1">自测模拟，查漏补缺</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockExams.map((exam, i) => (
          <div key={i} className="bg-white border rounded-xl p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">{exam.desc}</p>
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <span>⏱ {exam.duration} 分钟</span>
              <span>📊 {exam.marks} 分</span>
              <span>{exam.hasAnswer ? "✅ 含答案" : "⏳ 答案待发布"}</span>
            </div>
            <div className="flex gap-3">
              <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                下载试卷
              </button>
              {exam.hasAnswer && (
                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                  下载答案
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
