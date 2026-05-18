"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SUBTOPIC_DATA, type SubtopicDef } from "@/lib/subtopic-data";

interface Topic {
  name: string;
  displayName: string;
  slug: string;
  sort: number;
}

interface TopicSection {
  section: string;
  topics: Topic[];
}

// Section order for math
const SME_SECTION_ORDER = [
  "Number",
  "Algebra & Sequences",
  "Coordinate Geometry & Graphs",
  "Geometry",
  "Lengths, Areas & Volumes",
  "Pythagoras & Trigonometry",
  "Transformations",
  "Probability",
  "Statistics",
];

// Map composite slug → subject key (same as topic page)
const SLUG_TO_KEY: Record<string, string> = {
  "caie-physics-0625": "physics",
  "caie-chemistry-0620": "chemistry",
  "caie-biology-0610": "biology",
  "caie-mathematics-0580": "mathematics",
  "edexcel-physics-4ph1": "physics",
  "edexcel-chemistry-4ch1": "chemistry",
  "edexcel-biology-4bi1": "biology",
  "edexcel-mathematics-4ma1": "mathematics",
  "physics-0625": "physics", "chemistry-0620": "chemistry",
  "biology-0610": "biology", "mathematics-0580": "mathematics",
  "physics-4ph1": "physics", "chemistry-4ch1": "chemistry",
  "biology-4bi1": "biology", "mathematics-4ma1": "mathematics",
  "caie-physics": "physics", "caie-chemistry": "chemistry",
  "caie-biology": "biology", "caie-mathematics": "mathematics",
  "edexcel-physics": "physics", "edexcel-chemistry": "chemistry",
  "edexcel-biology": "biology", "edexcel-mathematics": "mathematics",
};

export function SubjectSearchBox({
  topicSections,
  topics,
  slug,
  isMath,
}: {
  topicSections: TopicSection[];
  topics: Topic[];
  slug: string;
  isMath: boolean;
}) {
  const [query, setQuery] = useState("");
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const subtopicData = SUBTOPIC_DATA[subjectKey] || {};

  // Build flat subtopic list for search: { subtopic, topicSlug, topicDisplay }
  const allSubtopics = useMemo(() => {
    if (isMath) return [];
    const result: { subtopic: SubtopicDef; topicSlug: string; topicDisplay: string }[] = [];
    for (const [topicSlug, subs] of Object.entries(subtopicData)) {
      for (const st of subs) {
        result.push({ subtopic: st, topicSlug, topicDisplay: topicSlug.replace(/-/g, " ") });
      }
    }
    return result;
  }, [subtopicData, isMath]);

  // Search results: subtopics matching query
  const matchedSubtopics = useMemo(() => {
    if (!query.trim() || isMath) return [];
    const q = query.toLowerCase();
    return allSubtopics.filter(
      (s) =>
        s.subtopic.name.toLowerCase().includes(q) ||
        s.subtopic.displayName.toLowerCase().includes(q) ||
        s.topicSlug.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allSubtopics, isMath]);

  const filteredSections = useMemo(() => {
    if (!query.trim()) return topicSections;
    const q = query.toLowerCase();

    if (isMath) {
      return topicSections
        .map((sec) => ({
          ...sec,
          topics: sec.topics.filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.displayName.toLowerCase().includes(q) ||
              t.slug.toLowerCase().includes(q)
          ),
        }))
        .filter((sec) => {
          const secMatch = sec.section.toLowerCase().includes(q);
          return secMatch || sec.topics.length > 0;
        });
    }
    return topicSections;
  }, [query, topicSections, isMath]);

  const filteredTopics = useMemo(() => {
    if (!query.trim() || isMath) return topics;
    const q = query.toLowerCase();
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.displayName.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
    );
  }, [query, topics, isMath]);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-primary-900">Topics</h2>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search topics..."
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-300 w-56 sm:w-64"
          />
          {/* Subtopic search dropdown */}
          {query && matchedSubtopics.length > 0 && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-white border rounded-lg shadow-lg w-72 max-h-64 overflow-y-auto">
              {matchedSubtopics.map((s) => (
                <Link
                  key={`${s.topicSlug}-${s.subtopic.slug}`}
                  href={`/subjects/${slug}/topics/${s.topicSlug}/${s.subtopic.slug}`}
                  onClick={() => setQuery("")}
                  className="block px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="text-primary-600 font-medium">{s.subtopic.pmtCode}</span>{" "}
                  <span className="text-gray-700">{s.subtopic.displayName}</span>
                  <span className="text-gray-400 text-xs ml-2">in {s.topicDisplay}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {isMath ? (
        <div className="space-y-3">
          {SME_SECTION_ORDER.map((secName) => {
            const sec = filteredSections.find((s) => s.section === secName);
            if (!sec) return null;
            const sectionSlug = secName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/-+$/, "");
            return (
              <Link
                key={secName}
                href={`/subjects/${slug}/sections/${sectionSlug}`}
                className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all group flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-primary-900 group-hover:text-primary-600 transition text-lg">
                    {secName}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {sec.topics.length} topics
                  </p>
                </div>
                <span className="text-gray-300 group-hover:text-primary-500 text-xl transition">
                  →
                </span>
              </Link>
            );
          })}
          {filteredSections.length === 0 && query && (
            <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-400">
              No topics match &quot;{query}&quot;
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTopics.map((topic) => (
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
                    <p className="text-sm text-gray-400 mt-0.5">
                      {topic.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {filteredTopics.length === 0 && query && matchedSubtopics.length === 0 && (
            <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-400">
              No topics match &quot;{query}&quot;
            </div>
          )}
        </>
      )}
    </section>
  );
}
