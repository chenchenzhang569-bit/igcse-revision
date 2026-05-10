import Link from "next/link";
import { parseSlug, TOPICS, SUBJECT_NAMES } from "@/lib/topics-data";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = parseSlug(slug);

  if (!parsed) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">
          Browse all subjects →
        </Link>
      </div>
    );
  }

  const { board, subjectSlug, code } = parsed;
  const topics = TOPICS[subjectSlug] || [];
  const info = SUBJECT_NAMES[subjectSlug] || { displayName: subjectSlug, icon: "📚" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
        ← Back to Home
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-4xl sm:text-5xl">{info.icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">
            {board} IGCSE {info.displayName} <span className="text-xs text-gray-300 font-normal">v3</span>
          </h1>
          <p className="text-gray-500 mt-1">Code: {code}</p>
        </div>
      </div>

      {/* Topics — always render section */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-primary-900 mb-4">
          Topics ({topics.length})
        </h2>
        {topics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/subjects/${slug}/topics/${topic.slug}`}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">
                    {topic.sort}
                  </span>
                  <div>
                    <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                      {topic.displayName}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">{topic.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {topics.length === 0 && (
          <p className="text-gray-400 text-sm">No topics found for: {subjectSlug}</p>
        )}
      </section>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap mt-8 pt-6 border-t">
        <Link
          href={`/past-papers/${slug}`}
          className="bg-primary-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-800 transition"
        >
          📄 Past Papers
        </Link>
        <Link
          href={`/mock-exams/${slug}`}
          className="bg-accent-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-600 transition"
        >
          📝 Mock Exams
        </Link>
        <Link
          href={`/subjects?board=${board}`}
          className="bg-gray-100 text-primary-900 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
        >
          📚 All {board} Subjects
        </Link>
      </div>
    </div>
  );
}
