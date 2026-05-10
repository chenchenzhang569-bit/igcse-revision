import Link from "next/link";
import { getSubjectData } from "@/lib/subject-data";

export default async function PastPapersPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const data = getSubjectData(subjectSlug);

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">
          Browse all subjects →
        </Link>
      </div>
    );
  }

  const { board, code, name, icon, topics } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
        ← Back to Home
      </Link>

      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">
            📄 {board} {name} Past Papers
          </h1>
          <p className="text-gray-500 mt-1">Code: {code}</p>
        </div>
      </div>

      {/* Topics */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/subjects/${subjectSlug}/topics/${topic.slug}`}
              className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">{topic.sort}</span>
                <div>
                  <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">{topic.displayName}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{topic.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Past papers coming soon */}
      <div className="mt-8 pt-6 border-t">
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">
          <p className="font-medium">Past papers by exam season coming soon</p>
          <p className="text-sm mt-1">Full past paper library is being organized by year and season.</p>
        </div>
      </div>
    </div>
  );
}
