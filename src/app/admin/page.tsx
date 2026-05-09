import Link from "next/link";

export default function AdminDashboard() {
  const stats = [
    { label: "科目总数", value: "10", href: "/admin/subjects" },
    { label: "主题总数", value: "24", href: "/admin/topics" },
    { label: "笔记总数", value: "5", href: "/admin/notes" },
    { label: "注册用户", value: "—", href: "#" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
        <p className="text-gray-500 mt-1">内容管理与数据概览</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border rounded-xl p-6 hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-primary-600">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/subjects"
            className="border rounded-lg p-4 text-center hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <p className="text-2xl mb-1">📚</p>
            <p className="font-medium text-gray-900">管理科目</p>
            <p className="text-sm text-gray-400 mt-1">添加/编辑/发布</p>
          </Link>
          <Link
            href="/admin/notes"
            className="border rounded-lg p-4 text-center hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <p className="text-2xl mb-1">📝</p>
            <p className="font-medium text-gray-900">编辑笔记</p>
            <p className="text-sm text-gray-400 mt-1">Markdown 格式</p>
          </Link>
          <Link
            href="/admin/topics"
            className="border rounded-lg p-4 text-center hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <p className="text-2xl mb-1">📂</p>
            <p className="font-medium text-gray-900">管理主题</p>
            <p className="text-sm text-gray-400 mt-1">排序/分组</p>
          </Link>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
        💡 提示：管理员需在 Supabase Dashboard 中将用户角色设为 admin 或在数据库层面控制权限。
        上线前需为管理后台添加完整的认证保护。
      </div>
    </div>
  );
}
