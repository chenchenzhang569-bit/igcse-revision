import Link from "next/link";

// Mock data — will be replaced by API call to getSubject(slug)
const subjectMap: Record<string, {
  name: string; displayName: string; code: string; board: string; icon: string;
  topics: { name: string; displayName: string; slug: string; desc: string }[];
}> = {
  "caie-mathematics-0580": {
    name: "Mathematics", displayName: "数学", code: "0580", board: "CAIE", icon: "📐",
    topics: [
      { name: "Number", displayName: "数与数系", slug: "number", desc: "整数、分数、小数、百分数、比率与比例" },
      { name: "Algebra & Graphs", displayName: "代数与图像", slug: "algebra-and-graphs", desc: "方程、不等式、函数图像、数列" },
      { name: "Coordinate Geometry", displayName: "坐标几何", slug: "coordinate-geometry", desc: "直线方程、距离公式、中点" },
      { name: "Geometry", displayName: "几何", slug: "geometry", desc: "角、三角形、圆、多边形" },
      { name: "Mensuration", displayName: "测量", slug: "mensuration", desc: "周长、面积、体积、表面积" },
      { name: "Trigonometry", displayName: "三角学", slug: "trigonometry", desc: "三角函数、正弦余弦定理" },
      { name: "Vectors & Transformations", displayName: "向量与变换", slug: "vectors-and-transformations", desc: "向量运算、平移旋转反射" },
      { name: "Probability", displayName: "概率", slug: "probability", desc: "概率计算、树状图、条件概率" },
      { name: "Statistics", displayName: "统计学", slug: "statistics", desc: "平均数、中位数、直方图、累积频率" },
    ],
  },
  "caie-physics-0625": {
    name: "Physics", displayName: "物理", code: "0625", board: "CAIE", icon: "⚛️",
    topics: [
      { name: "General Physics", displayName: "普通物理", slug: "general-physics", desc: "长度与时间、运动、质量与重量、密度、力" },
      { name: "Thermal Physics", displayName: "热物理", slug: "thermal-physics", desc: "物态变化、热传递、温度" },
      { name: "Properties of Waves", displayName: "波的性质", slug: "properties-of-waves", desc: "波的类型、光的反射折射、声波" },
      { name: "Electricity & Magnetism", displayName: "电磁学", slug: "electricity-and-magnetism", desc: "电路、电阻、电磁感应" },
      { name: "Atomic Physics", displayName: "原子物理", slug: "atomic-physics", desc: "放射性、原子结构、核物理" },
    ],
  },
  "caie-chemistry-0620": {
    name: "Chemistry", displayName: "化学", code: "0620", board: "CAIE", icon: "🧪",
    topics: [
      { name: "States of Matter", displayName: "物质状态", slug: "states-of-matter", desc: "固体、液体、气体、扩散" },
      { name: "Atoms, Elements & Compounds", displayName: "原子、元素和化合物", slug: "atoms-elements-compounds", desc: "原子结构、元素周期表基础、化学键" },
      { name: "Stoichiometry", displayName: "化学计量", slug: "stoichiometry", desc: "摩尔计算、化学方程式、产率" },
      { name: "Electrochemistry", displayName: "电化学", slug: "electrochemistry", desc: "电解、电镀、电池" },
      { name: "Chemical Energetics", displayName: "化学能量学", slug: "chemical-energetics", desc: "放热反应、吸热反应、键能" },
      { name: "Chemical Reactions", displayName: "化学反应", slug: "chemical-reactions", desc: "反应速率、平衡、氧化还原" },
      { name: "Acids, Bases & Salts", displayName: "酸碱盐", slug: "acids-bases-salts", desc: "pH、中和反应、盐的制备" },
      { name: "The Periodic Table", displayName: "元素周期表", slug: "the-periodic-table", desc: "周期趋势、族性质" },
      { name: "Metals", displayName: "金属", slug: "metals", desc: "金属性质、提取、合金" },
      { name: "Organic Chemistry", displayName: "有机化学", slug: "organic-chemistry", desc: "烷烃、烯烃、醇、羧酸、聚合物" },
    ],
  },
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subject = subjectMap[slug];

  if (!subject) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">科目不存在</p>
        <Link href="/dashboard" className="text-primary-600 mt-4 inline-block">返回仪表盘 →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-primary-600 transition mb-2 inline-block">
          ← 返回仪表盘
        </Link>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-5xl">{subject.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{subject.displayName}</h1>
            <p className="text-gray-500 mt-1">
              {subject.board} IGCSE {subject.name} ({subject.code})
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
          {subject.topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/subjects/${slug}/topics/${topic.slug}`}
              className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {topic.displayName}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{topic.name}</p>
              <p className="text-sm text-gray-500 mt-2">{topic.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
