// step1: add getSubtopic + Link
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSubtopic } from "@/lib/subtopic-data";

const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics",
};

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string; subtopicSlug: string }>;
}) {
  const { slug, topicSlug, subtopicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const subtopic = getSubtopic(subjectKey, topicSlug, subtopicSlug);

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1 style={{ color: "green" }}>✅ STEP1: getSubtopic + Link OK</h1>
      <p>slug: {slug}</p>
      <p>topicSlug: {topicSlug}</p>
      <p>subtopicSlug: {subtopicSlug}</p>
      <p>subtopic found: {subtopic ? `YES (${subtopic.displayName})` : "NO"}</p>
      <p>pmtCode: {subtopic?.pmtCode || "N/A"}</p>
      <Link href="/">← Home</Link>
    </div>
  );
}
