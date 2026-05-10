import { parseSlug, TOPICS, SUBJECT_NAMES, type Topic } from "@/lib/topics-data";
import Link from "next/link";

export default async function MockExamsPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const parsed = parseSlug(subjectSlug);
  const subjectKey = parsed?.subjectSlug || subjectSlug;
  const board = parsed?.board || "";
  const code = parsed?.code || "";
  const topics: Topic[] = TOPICS[subjectKey] || [];
  const info = SUBJECT_NAMES[subjectKey] || { displayName: subjectKey, icon: "📚" };

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
            📝 {board} {info.displayName} Mock Exams
          </h1>
          {code && <p className="text-gray-500 mt-1">Code: {code}</p>}
        </div>
      </div>

      {/* Topics grid — always shown */}
      {topics.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/subjects/${subjectSlug}/topics/${topic.slug}`}
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
        </div>
      )}

      {/* Mock exam placeholder */}
      <div className="mt-8 pt-6 border-t">
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">
          <p className="font-medium mb-1">Mock exams coming soon</p>
          <p className="text-sm">Our team is preparing timed mock exams for each topic. Check back soon!</p>
        </div>
      </div>

      {topics.length === 0 && (
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600 mt-8">
          No content available for this subject yet
        </div>
      )}
    </div>
  );
}
