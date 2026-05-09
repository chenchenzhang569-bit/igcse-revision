import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          欢迎回来，{user?.email?.split("@")[0]}
        </h1>
        <p className="text-gray-500 mt-1">选择科目开始复习</p>
      </div>

      {/* Purchase prompt */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">开始你的 IGCSE 复习之旅</h2>
        <p className="text-primary-100 mb-4">
          浏览我们的科目库，选择你需要复习的科目
        </p>
        <Link
          href="/subjects"
          className="inline-block bg-white text-primary-600 px-5 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          浏览科目 →
        </Link>
      </div>
    </div>
  );
}
