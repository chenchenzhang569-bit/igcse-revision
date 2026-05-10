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
    </div>
  );
}
