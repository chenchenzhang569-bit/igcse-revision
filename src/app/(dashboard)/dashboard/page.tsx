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
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-gray-500 mt-1">Pick a subject to start revising</p>
      </div>

      <div className="bg-primary-900 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">Start Your IGCSE Journey</h2>
        <p className="text-white/70 mb-4">
          Browse our subject library and find everything you need to ace your exams.
        </p>
        <Link
          href="/subjects"
          className="inline-block bg-accent-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-accent-600 transition"
        >
          Browse Subjects →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/my-bank"
          className="bg-white border rounded-xl p-5 hover:shadow-md transition group"
        >
          <p className="text-3xl mb-2">💾</p>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
            My Question Bank
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your saved questions
          </p>
        </Link>
      </div>
    </div>
  );
}
