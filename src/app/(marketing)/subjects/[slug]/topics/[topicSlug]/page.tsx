import Link from "next/link";
import { getSubtopics } from "@/lib/subtopic-data";

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
  "physics-0625": "physics",
  "chemistry-0620": "chemistry",
  "biology-0610": "biology",
  "mathematics-0580": "mathematics",
};

// Display names for topic slugs
const TOPIC_DISPLAY: Record<string, string> = {
  "motion-forces-energy": "Motion, Forces & Energy",
  "thermal-physics": "Thermal Physics",
  "waves": "Waves",
  "electricity-magnetism": "Electricity & Magnetism",
  "nuclear-physics": "Nuclear Physics",
  "space-physics": "Space Physics",
  "states-of-matter": "States of Matter",
  "atoms-elements-compounds": "Atoms, Elements & Compounds",
  "stoichiometry": "Stoichiometry",
  "electrochemistry": "Electrochemistry",
  "chemical-energetics": "Chemical Energetics",
  "chemical-reactions": "Chemical Reactions",
  "acids-bases-salts": "Acids, Bases & Salts",
  "periodic-table": "The Periodic Table",
  "metals": "Metals",
  "chemistry-environment": "Chemistry of the Environment",
  "organic-chemistry": "Organic Chemistry",
  "experimental-techniques": "Experimental Techniques",
  "characteristics-living-organisms": "Characteristics of Living Organisms",
  "organisation-organism": "Organisation of the Organism",
  "movement-cells": "Movement In & Out of Cells",
  "biological-molecules": "Biological Molecules",
  "enzymes": "Enzymes",
  "plant-nutrition": "Plant Nutrition",
  "human-nutrition": "Human Nutrition",
  "transport-plants": "Transport in Plants",
  "transport-animals": "Transport in Animals",
  "diseases-immunity": "Diseases & Immunity",
  "gas-exchange-humans": "Gas Exchange in Humans",
  "respiration": "Respiration",
  "excretion-humans": "Excretion in Humans",
  "coordination-response": "Coordination & Response",
  "drugs": "Drugs",
  "reproduction": "Reproduction",
  "inheritance": "Inheritance",
  "variation-selection": "Variation & Selection",
  "organisms-environment": "Organisms & Their Environment",
  "human-influences-ecosystems": "Human Influences on Ecosystems",
  "biotechnology": "Biotechnology & Genetic Modification",
  "number": "Number",
  "algebra-graphs": "Algebra & Graphs",
  "coordinate-geometry": "Coordinate Geometry",
  "geometry": "Geometry",
  "mensuration": "Mensuration",
  "trigonometry": "Trigonometry",
  "vectors-transformations": "Vectors & Transformations",
  "probability": "Probability",
  "statistics": "Statistics",
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
}) {
  const { slug, topicSlug } = await params;
  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  const displayName = TOPIC_DISPLAY[topicSlug] || topicSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const subtopics = getSubtopics(subjectKey, topicSlug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-sm text-gray-400 mb-2 space-x-1">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/subjects/${slug}`} className="hover:text-primary-600">Subject</Link>
        <span>/</span>
        <span className="text-gray-600">{displayName}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">{displayName}</h1>
      <p className="text-gray-500 mt-1">{subtopics.length} subtopics</p>

      {/* Subtopics */}
      {subtopics.length > 0 ? (
        <div className="mt-8 space-y-3">
          {subtopics.map((st) => (
            <Link
              key={st.slug}
              href={`/subjects/${slug}/topics/${topicSlug}/${st.slug}`}
              className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group flex items-center gap-4"
            >
              <span className="text-accent-500 font-extrabold text-lg shrink-0 w-8">
                {st.pmtCode}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                  {st.displayName}
                </h3>
              </div>
              <span className="text-gray-300 group-hover:text-accent-500 transition">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">No subtopics found</p>
          <p className="text-sm mt-1">Topic slug: {topicSlug} (subject: {subjectKey})</p>
        </div>
      )}
    </div>
  );
}
