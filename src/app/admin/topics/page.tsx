const topics = [
  { id: "1", subject: "数学 (0580)", name: "代数与图像", slug: "algebra-and-graphs", sort: 2, notes: 3, questions: 3 },
  { id: "2", subject: "数学 (0580)", name: "数与数系", slug: "number", sort: 1, notes: 0, questions: 0 },
  { id: "3", subject: "物理 (0625)", name: "普通物理", slug: "general-physics", sort: 1, notes: 2, questions: 2 },
  { id: "4", subject: "物理 (0625)", name: "热物理", slug: "thermal-physics", sort: 2, notes: 0, questions: 0 },
];

export default function AdminTopics() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">主题管理</h1>
          <p className="text-gray-500 mt-1">管理各科目下的学习主题</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          + 新增主题
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-4 font-medium text-gray-500">主题</th>
              <th className="text-left p-4 font-medium text-gray-500">所属科目</th>
              <th className="text-left p-4 font-medium text-gray-500">Slug</th>
              <th className="text-left p-4 font-medium text-gray-500">排序</th>
              <th className="text-left p-4 font-medium text-gray-500">笔记数</th>
              <th className="text-left p-4 font-medium text-gray-500">试题数</th>
              <th className="text-right p-4 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{t.name}</td>
                <td className="p-4 text-gray-600">{t.subject}</td>
                <td className="p-4 text-gray-400 font-mono text-xs">{t.slug}</td>
                <td className="p-4 text-gray-600">#{t.sort}</td>
                <td className="p-4 text-gray-600">{t.notes}</td>
                <td className="p-4 text-gray-600">{t.questions}</td>
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
