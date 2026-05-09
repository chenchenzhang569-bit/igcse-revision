import Link from "next/link";

const subjects = [
  { id: "1", name: "数学", code: "0580", board: "CAIE", icon: "📐", price: 299, published: true, topics: 9 },
  { id: "2", name: "物理", code: "0625", board: "CAIE", icon: "⚛️", price: 299, published: true, topics: 5 },
  { id: "3", name: "化学", code: "0620", board: "CAIE", icon: "🧪", price: 299, published: true, topics: 10 },
  { id: "4", name: "生物", code: "0610", board: "CAIE", icon: "🧬", price: 299, published: false, topics: 0 },
];

export default function AdminSubjects() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">科目管理</h1>
          <p className="text-gray-500 mt-1">管理考试科目及其定价</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          + 新增科目
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-4 font-medium text-gray-500">科目</th>
              <th className="text-left p-4 font-medium text-gray-500">考试局</th>
              <th className="text-left p-4 font-medium text-gray-500">代码</th>
              <th className="text-left p-4 font-medium text-gray-500">价格</th>
              <th className="text-left p-4 font-medium text-gray-500">主题数</th>
              <th className="text-left p-4 font-medium text-gray-500">状态</th>
              <th className="text-right p-4 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span>{s.icon}</span>
                    <span className="font-medium text-gray-900">{s.name}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{s.board}</td>
                <td className="p-4 text-gray-600">{s.code}</td>
                <td className="p-4 font-medium">¥{s.price}</td>
                <td className="p-4 text-gray-600">{s.topics}</td>
                <td className="p-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.published
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {s.published ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-primary-600 hover:text-primary-700 font-medium mr-3">
                    编辑
                  </button>
                  <button className="text-gray-400 hover:text-red-500 font-medium">
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
