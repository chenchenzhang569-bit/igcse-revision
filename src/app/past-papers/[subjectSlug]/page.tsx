import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PastPapersPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">← Back to Home</Link>

      <h1 className="text-2xl font-bold text-primary-900">📄 Past Papers</h1>
      <p className="text-gray-500 mt-2">Slug: <code className="bg-gray-100 px-2 py-0.5 rounded">{subjectSlug}</code></p>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-blue-800 font-semibold">Route is working! ✅</p>
        <p className="text-blue-600 text-sm mt-1">This confirms the past-papers page renders correctly.</p>
      </div>

      <div className="mt-4">
        <Link href={`/subjects/${subjectSlug}`} className="text-accent-500 font-semibold">
          ← Back to {subjectSlug}
        </Link>
      </div>
    </div>
  );
}
