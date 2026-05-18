import Link from "next/link";
import TopicQuestionsClient from "./TopicQuestionsClient";
import { getSubtopics } from "@/lib/subtopic-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TopicSearchBox } from "./TopicSearchBox";


// Subject key lookup from composite slug
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

const TOPIC_DISPLAY: Record<string, string> = {
  "motion-forces-energy": "Motion, Forces & Energy",
  "thermal-physics": "Thermal Physics", "waves": "Waves",
  "electricity-magnetism": "Electricity & Magnetism",
  "nuclear-physics": "Nuclear Physics", "space-physics": "Space Physics",
  "practical-skills-physics": "Practical Skills",
  "practical-skills-chemistry": "Practical Skills",
  "practical-skills-biology": "Practical Skills",
  "states-of-matter": "States of Matter",
  "atoms-elements-compounds": "Atoms, Elements & Compounds",
  "stoichiometry": "Stoichiometry", "electrochemistry": "Electrochemistry",
  "chemical-energetics": "Chemical Energetics",
  "chemical-reactions": "Chemical Reactions",
  "acids-bases-salts": "Acids, Bases & Salts",
  "periodic-table": "The Periodic Table", "metals": "Metals",
  "chemistry-environment": "Chemistry of the Environment",
  "organic-chemistry": "Organic Chemistry",
  "experimental-techniques": "Experimental Techniques",
  "characteristics-living-organisms": "Characteristics of Living Organisms",
  "organisation-organism": "Organisation of the Organism",
  "movement-cells": "Movement In & Out of Cells",
  "biological-molecules": "Biological Molecules", "enzymes": "Enzymes",
  "plant-nutrition": "Plant Nutrition", "human-nutrition": "Human Nutrition",
  "transport-plants": "Transport in Plants",
  "transport-animals": "Transport in Animals",
  "diseases-immunity": "Diseases & Immunity",
  "gas-exchange-humans": "Gas Exchange in Humans",
  "respiration": "Respiration", "excretion-humans": "Excretion in Humans",
  "coordination-response": "Coordination & Response", "drugs": "Drugs",
  "reproduction": "Reproduction", "inheritance": "Inheritance",
  "variation-selection": "Variation & Selection",
  "organisms-environment": "Organisms & Their Environment",
  "human-influences-ecosystems": "Human Influences on Ecosystems",
  "biotechnology": "Biotechnology & Genetic Modification",
  "number": "Number", "algebra-graphs": "Algebra & Graphs",
  "coordinate-geometry": "Coordinate Geometry", "geometry": "Geometry",
  "mensuration": "Mensuration", "trigonometry": "Trigonometry",
  "vectors-transformations": "Vectors & Transformations",
  "probability": "Probability", "statistics": "Statistics",
};

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const baseHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug, topicSlug } = await params;
  const { tab } = await searchParams;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  let displayName = TOPIC_DISPLAY[topicSlug] || topicSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isMaths = subjectKey === "maths" || subjectKey === "mathematics";
  const subtopics = isMaths ? [] : getSubtopics(subjectKey, topicSlug);
  // Math: default to notes tab; others: no tabs, show subtopics directly
  const activeTab = isMaths ? (tab || "notes") : "subtopics";

  // Fetch topic ID (needed for notes and questions)
  let topicId: string | null = null;
  let notes: any[] = [];
  let questions: any[] = [];
  try {
    const tRes = await fetch(
      `${API}/topics?slug=ilike.*${encodeURIComponent(topicSlug)}&select=id,name&limit=1`,
      { headers: baseHeaders, cache: "no-store" }
    );
    const topics = await tRes.json();
    if (topics?.[0]?.id) {
      topicId = topics[0].id;
      if (!displayName || displayName === topicSlug.replace(/-/g, " ")) {
        displayName = topics[0].name || displayName;
      }
      // Fetch notes
      const nRes = await fetch(
        `${API}/notes?select=*&topic_id=eq.${topicId}&order=sort_order&limit=50`,
        { headers: baseHeaders, cache: "no-store" }
      );
      notes = await nRes.json();
      // Fetch questions
      const qRes = await fetch(
        `${API}/questions?select=*&topic_id=eq.${topicId}&order=sort_order`,
        { headers: baseHeaders, cache: "no-store" }
      );
      questions = await qRes.json();
    }
  } catch (e) {
    console.error("DB fetch failed:", e);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <span className="text-gray-600">{displayName}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">{displayName}</h1>
        {isMaths && <TopicSearchBox subjectKey={subjectKey} topicSlug={topicSlug} />}
      </div>

      {/* Tabs: only for Math */}
      {isMaths && (
      <div className="flex gap-1 mt-8 border-b">
        <Link
          href={`/subjects/${slug}/topics/${topicSlug}?tab=notes`}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "notes" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📖 Notes
        </Link>
        <Link
          href={`/subjects/${slug}/topics/${topicSlug}?tab=questions`}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "questions" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          ✏️ Questions
        </Link>
        {subtopics.length > 0 && (
          <Link
            href={`/subjects/${slug}/topics/${topicSlug}?tab=subtopics`}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === "subtopics" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            📂 Subtopics ({subtopics.length})
          </Link>
        )}
      </div>
      )}

      {/* Notes tab */}
      {activeTab === "notes" && (
        <div className="mt-6 space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No notes yet</p>
              <p className="text-sm mt-2">Study notes are being prepared</p>
            </div>
          ) : (
            notes.map((note: any) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  {note.is_free_preview ? (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Free Preview</span>
                  ) : (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Premium</span>
                  )}
                  {note.source && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        note.source === "PMT" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {note.source}
                    </span>
                  )}
                </div>
                {note.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                )}
                {note.file_url && (
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    📥 {note.source ? `[${note.source}] ` : ""}{note.file_name || "Download"}
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Questions tab */}
      {activeTab === "questions" && topicId && (
        <TopicQuestionsClient topicId={topicId} preloadedQuestions={questions} />
      )}
      {activeTab === "questions" && !topicId && (
        <div className="mt-6 text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Topic not found</p>
        </div>
      )}

      {/* Subtopics tab */}
      {activeTab === "subtopics" && (
        <div className="mt-6">
          <p className="text-gray-500 mt-1">{subtopics.length} subtopics</p>
          <div className="mt-4 space-y-3">
            {subtopics.map((st) => (
              <Link
                key={st.slug}
                href={`/subjects/${slug}/topics/${topicSlug}/${st.slug}`}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group flex items-center gap-4"
              >
                <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">{st.pmtCode}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                    {st.displayName}
                  </h3>
                </div>
                <span className="text-gray-300 group-hover:text-accent-500 transition">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
