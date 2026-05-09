import Link from "next/link";

const subjects = [
  { name: "数学", code: "0580", board: "CAIE", icon: "📐", slug: "caie-mathematics-0580", desc: "数系、代数、几何、三角学、概率统计" },
  { name: "物理", code: "0625", board: "CAIE", icon: "⚛️", slug: "caie-physics-0625", desc: "力学、热学、波动、电磁学、原子物理" },
  { name: "化学", code: "0620", board: "CAIE", icon: "🧪", slug: "caie-chemistry-0620", desc: "物质状态、化学计量、电化学、有机化学" },
  { name: "生物", code: "0610", board: "CAIE", icon: "🧬", slug: "caie-biology-0610", desc: "细胞、遗传、生态、人体生理" },
  { name: "附加数学", code: "0606", board: "CAIE", icon: "🔢", slug: "caie-additional-mathematics-0606", desc: "函数、微积分、向量、排列组合" },
  { name: "经济学", code: "0455", board: "CAIE", icon: "📈", slug: "caie-economics-0455", desc: "微观经济、宏观经济、国际贸易" },
  { name: "计算机科学", code: "0478", board: "CAIE", icon: "💻", slug: "caie-computer-science-0478", desc: "算法、编程、数据表示、网络" },
  { name: "数学A", code: "4MA1", board: "Edexcel", icon: "📐", slug: "edexcel-mathematics-a-4ma1", desc: "数系、代数、几何、统计" },
  { name: "物理", code: "4PH1", board: "Edexcel", icon: "⚛️", slug: "edexcel-physics-4ph1", desc: "力学、波动、电学、原子物理" },
  { name: "化学", code: "4CH1", board: "Edexcel", icon: "🧪", slug: "edexcel-chemistry-4ch1", desc: "原子结构、周期表、化学反应、有机化学" },
];

export default function SubjectsPage() {
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
        {subjects.map((s) => (
          <Link
            key={s.slug}
            href={`/subjects/${s.slug}`}
            className="group bg-white border rounded-xl p-6 hover:shadow-lg hover:border-primary-300 transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{s.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                    {s.board}
                  </span>
                  <span className="text-xs text-gray-400">{s.code}</span>
                </div>
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition">
                  {s.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
                <p className="text-primary-600 font-bold mt-3">¥299</p>
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
