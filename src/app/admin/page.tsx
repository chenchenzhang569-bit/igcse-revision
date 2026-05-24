export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📊 Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "总题目数", value: "—" },
          { label: "注册用户", value: "—" },
          { label: "付费用户", value: "—" },
          { label: "近30天收入", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-primary-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-gray-400 text-sm">统计数据将在后续版本接入真实数据。</p>
    </div>
  );
}
