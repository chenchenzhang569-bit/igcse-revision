export const dynamic = "force-dynamic";

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1 style={{ color: "green" }}>✅ PAGE RENDERED</h1>
      <p>slug: {slug}</p>
      <p>topicSlug: {topicSlug}</p>
      <p>subtopicSlug: {subtopicSlug}</p>
    </div>
  );
}
