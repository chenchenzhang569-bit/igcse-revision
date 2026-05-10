import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
}) {
  const { slug, topicSlug } = await params;
  const supabase = createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("id, display_name, slug, sort_order")
    .eq("slug", topicSlug)
    .single();

  if (!topic) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Topic not found</p>
        <Link href="/dashboard" className="text-primary-600 mt-4 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // Get subtopics with counts
  const { data: subtopics = [] } = await supabase
    .from("subtopics")
    .select("id, pmt_code, name, display_name, slug, sort_order")
    .eq("topic_id", topic.id)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        {" / "}
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">
          Subject
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">
        {topic.sort_order}. {topic.display_name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subtopics.map((st: any) => (
          <Link
            key={st.id}
            href={`/subjects/${slug}/topics/${topicSlug}/${st.slug}`}
            className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-poppins font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                {st.pmt_code}
              </span>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {st.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {subtopics.length === 0 && (
        <p className="text-gray-400 text-center py-12">No subtopics yet</p>
      )}
    </div>
  );
}
