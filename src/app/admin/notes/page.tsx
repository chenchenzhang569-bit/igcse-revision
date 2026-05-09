const notes = [
  { id: "1", title: "一次函数 (Linear Functions)", topic: "代数与图像", subject: "数学", isFree: true, words: 180, updated: "2026-05-08" },
  { id: "2", title: "二次函数 (Quadratic Functions)", topic: "代数与图像", subject: "数学", isFree: true, words: 220, updated: "2026-05-08" },
  { id: "3", title: "解二次方程", topic: "代数与图像", subject: "数学", isFree: false, words: 150, updated: "2026-05-08" },
  { id: "4", title: "运动学 (Kinematics)", topic: "普通物理", subject: "物理", isFree: true, words: 200, updated: "2026-05-08" },
  { id: "5", title: "速度-时间图", topic: "普通物理", subject: "物理", isFree: false, words: 120, updated: "2026-05-08" },
];

export default function AdminNotes() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">笔记管理</h1>
          <p className="text-gray-500 mt-1">Markdown 格式编辑，支持数学公式</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          + 新增笔记
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-4 font-medium text-gray-500">标题</th>
              <th className="text-left p-4 font-medium text-gray-500">科目</th>
              <th className="text-left p-4 font-medium text-gray-500">主题</th>
              <th className="text-left p-4 font-medium text-gray-500">预览</th>
              <th className="text-left p-4 font-medium text-gray-500">字数</th>
              <th className="text-left p-4 font-medium text-gray-500">更新</th>
              <th className="text-right p-4 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{n.title}</td>
                <td className="p-4 text-gray-600">{n.subject}</td>
                <td className="p-4 text-gray-600">{n.topic}</td>
                <td className="p-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      n.isFree
                        ? "bg-green-50 text-green-600"
                        : "bg-yellow-50 text-yellow-600"
                    }`}
                  >
                    {n.isFree ? "免费" : "付费"}
                  </span>
                </td>
                <td className="p-4 text-gray-400">{n.words}</td>
                <td className="p-4 text-gray-400">{n.updated}</td>
                <td className="p-4 text-right">
                  <button className="text-primary-600 hover:text-primary-700 font-medium mr-3">编辑</button>
                  <button className="text-gray-400 hover:text-red-500 font-medium">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
