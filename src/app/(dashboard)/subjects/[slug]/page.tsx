import Link from "next/link";

// Full static subject data — no DB dependency
const SUBJECTS: Record<string, {
  board: string;
  subject: string;
  code: string;
  displayName: string;
  icon: string;
}> = {
  physics:     { board: "CAIE", subject: "Physics",     code: "0625", displayName: "Physics",     icon: "⚛️" },
  chemistry:   { board: "CAIE", subject: "Chemistry",   code: "0620", displayName: "Chemistry",   icon: "🧪" },
  biology:     { board: "CAIE", subject: "Biology",     code: "0610", displayName: "Biology",     icon: "🧬" },
  mathematics: { board: "CAIE", subject: "Mathematics", code: "0580", displayName: "Mathematics", icon: "📐" },
};

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ board?: string }>;
}) {
  const { slug } = await params;
  const { board: boardParam } = await searchParams;

  // Try DB, fallback to static
  let subjectFromDB: any = null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("subjects")
      .select("id, name, display_name, code, slug, icon, price_cny")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    subjectFromDB = data;
  } catch {
    // DB unreachable — use static
  }

  const staticData = SUBJECTS[slug];
  const board = boardParam || (subjectFromDB ? "CAIE" : staticData?.board || "CAIE");
  const subjectName = subjectFromDB?.display_name || staticData?.displayName || slug;
  const subjectCode = subjectFromDB?.code || staticData?.code || "";
  const subjectIcon = subjectFromDB?.icon || staticData?.icon || "📚";
  const subjectDesc = subjectFromDB?.name || staticData?.subject || slug;

  if (!subjectFromDB && !staticData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/subjects" className="text-primary-600 mt-4 inline-block font-semibold">
          Browse all subjects →
        </Link>
      </div>
    );
  }

  // Fetch topics if DB subject exists
  let topics: any[] | null = null;
  if (subjectFromDB?.id) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data } = await supabase
        .from("topics")
        .select("name, display_name, slug, description, sort_order")
        .eq("subject_id", subjectFromDB.id)
        .order("sort_order");
      topics = data;
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/subjects" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">
        ← All Subjects
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-5xl">{subjectIcon}</span>
        <div>
          <h1 className="text-3xl font-bold text-primary-900">
            {board} IGCSE {subjectName}
          </h1>
          <p className="text-gray-500 mt-1">
            {subjectDesc}{subjectCode ? ` (${subjectCode})` : ""}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap mt-8">
        <Link
          href={`/past-papers/${slug}`}
          className="bg-gray-100 text-primary-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
        >
          📄 Past Papers
        </Link>
        <Link
          href={`/subjects?board=${board}`}
          className="bg-gray-100 text-primary-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
        >
          📚 {board} Subjects
        </Link>
      </div>

      {/* Topics from DB */}
      {topics && topics.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-primary-900 mb-4">Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((topic: any) => (
              <Link
                key={topic.slug}
                href={`/subjects/${slug}/topics/${topic.slug}`}
                className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all group"
              >
                <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                  {topic.sort_order}. {topic.display_name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">{topic.name}</p>
                {topic.description && (
                  <p className="text-sm text-gray-500 mt-2">{topic.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Static fallback content */}
      {(!topics || topics.length === 0) && (
        <div className="mt-8 p-8 bg-gray-50 rounded-xl text-center">
          <p className="text-gray-500 mb-2 font-semibold">Content is being prepared</p>
          <p className="text-gray-400 text-sm mb-4">
            Past papers, topic questions, and mock exams for {board} IGCSE {subjectName} are coming soon.
          </p>
          <Link
            href={`/subjects?board=${board}`}
            className="inline-block bg-primary-900 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-800 transition"
          >
            Browse {board} Subjects →
          </Link>
        </div>
      )}
    </div>
  );
}
