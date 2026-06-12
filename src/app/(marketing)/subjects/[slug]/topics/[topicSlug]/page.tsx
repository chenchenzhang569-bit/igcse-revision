import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TopicQuestionsClient from "./TopicQuestionsClient";
import { getSubtopics } from "@/lib/subtopic-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TopicSearchBox } from "./TopicSearchBox";

export const dynamic = "force-dynamic";

// Paywall component
function PaywallBanner({ subjectSlug }: { subjectSlug: string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-primary-900 mb-2">需要购买才能访问</h2>
      <p className="text-gray-500 mb-6">请先购买该科目以查看笔记和题目</p>
      <Link
        href={`/subjects/${subjectSlug}`}
        className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
      >
        查看科目详情
      </Link>
    </div>
  );
}

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
  "edexcel-mathematics-higher-4ma1": "mathematics",
  "edexcel-further-maths-4pm1": "mathematics",
  "edexcel-business-4bs1": "business",
  "edexcel-economics-4ec1": "economics",
  "edexcel-geography-4ge1": "geography",
  "caie-additional-mathematics-0606": "additional-maths",
  "caie-economics-0455": "economics",
  "caie-computer-science-0478": "computer-science",
  "physics-0625": "physics", "chemistry-0620": "chemistry",
  "biology-0610": "biology", "mathematics-0580": "mathematics",
  "physics-4ph1": "physics", "chemistry-4ch1": "chemistry",
  "biology-4bi1": "biology", "mathematics-4ma1": "mathematics",
  "caie-physics": "physics", "caie-chemistry": "chemistry",
  "caie-biology": "biology", "caie-mathematics": "mathematics",
  "edexcel-physics": "physics", "edexcel-chemistry": "chemistry",
  "edexcel-biology": "biology", "edexcel-mathematics": "mathematics",
  "edexcel-mathematics-higher": "mathematics",
  "edexcel-further-maths": "mathematics",
  "edexcel-business": "business",
  "edexcel-economics": "economics",
  "edexcel-geography": "geography",
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
  // New section slugs (math parent topics)
  "section-number": "Number", "section-algebra-and-sequences": "Algebra & Sequences",
  "section-coordinate-geometry-and-graphs": "Coordinate Geometry & Graphs",
  "section-geometry": "Geometry", "section-lengths-areas-and-volumes": "Lengths, Areas & Volumes",
  "section-pythagoras-and-trigonometry": "Pythagoras & Trigonometry",
  "section-transformations": "Transformations", "section-probability": "Probability",
  "section-statistics": "Statistics",
  // 0606 Additional Mathematics
  "algebra-functions": "Algebra & Functions",
  "coordinate-geometry": "Coordinate Geometry",
  "trigonometry": "Trigonometry",
  "sequences-series": "Sequences & Series",
  "vectors": "Vectors",
  "calculus": "Calculus",
  // 0455 Economics
  "1-the-basic-economic-problem": "1. The Basic Economic Problem",
  "2-the-allocation-of-resources": "2. The Allocation of Resources",
  "3-microeconomic-decision-makers": "3. Microeconomic Decision-Makers",
  "4-government-and-the-macroeconomy": "4. Government & the Macroeconomy",
  "5-economic-development": "5. Economic Development",
  "6-international-trade-and-globalisation": "6. International Trade & Globalisation",
  // 0478 Computer Science
  "data-representation": "Data Representation",
  "data-transmission": "Data Transmission",
  "hardware": "Hardware",
  "software": "Software",
  "the-internet-its-uses": "The Internet & its Uses",
  "automated-emerging-technologies": "Automated & Emerging Technologies",
  "algorithm-design-problem-solving": "Algorithm Design & Problem-Solving",
  "programming": "Programming",
  "databases": "Databases",
  "boolean-logic": "Boolean Logic",
};

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const baseHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
  searchParams: Promise<{ tab?: string; sub?: string }>;
}) {
  const { slug, topicSlug } = await params;
  const { tab, sub } = await searchParams;

  // Check purchase access
  let hasAccess = false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Find subject_id by slug
      const { data: subjectRow } = await supabase
        .from("subjects").select("id").eq("slug", slug).maybeSingle();
      if (subjectRow) {
        const now = new Date();
        const { data: purchases } = await supabase
          .from("purchases")
          .select("subject_id, expires_at")
          .eq("user_id", user.id)
          .in("status", ["paid", "trial"]);
        if (purchases && purchases.length > 0) {
          // All-subject purchase
          if (purchases.some(p => !p.subject_id && (!p.expires_at || new Date(p.expires_at) > now))) {
            hasAccess = true;
          } else {
            // Specific subject purchase
            hasAccess = purchases.some(p =>
              p.subject_id === subjectRow.id &&
              (!p.expires_at || new Date(p.expires_at) > now)
            );
          }
        }
      }
    }
  } catch { /* not authenticated */ }

  // Show paywall if no access
  if (!hasAccess) {
    return <PaywallBanner subjectSlug={slug} />;
  }

  const subjectKey = SLUG_TO_KEY[slug] || "physics";
  let displayName = TOPIC_DISPLAY[topicSlug] || topicSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isMaths = subjectKey === "maths" || subjectKey === "mathematics" || subjectKey === "additional-maths";
  const isSimpleSubject = subjectKey === "additional-maths" || subjectKey === "economics" || subjectKey === "computer-science" || subjectKey === "business" || subjectKey === "geography" || slug === "edexcel-further-maths-4pm1";
  const isDbDriven = isSimpleSubject || slug.startsWith("edexcel");
  let subtopics: any[] = isDbDriven && isSimpleSubject ? [] : getSubtopics(subjectKey, topicSlug);
  // For additional-maths/economics, fetch subtopics from DB
  // Math: default to notes tab; simple subjects default to subtopics; others: default to subtopics
  const isEdexcelMaths = slug.startsWith("edexcel-mathematics") && isMaths;
  const activeTab = tab || (isSimpleSubject || isEdexcelMaths ? "subtopics" : isMaths ? "notes" : "subtopics");

  // Build tab URL preserving ?sub= param
  const tabUrl = (tabName: string) => {
    const params = new URLSearchParams();
    params.set("tab", tabName);
    if (sub) params.set("sub", sub);
    return `?${params.toString()}`;
  };

  // Fetch topic ID (needed for notes and questions)
  let topicId: string | null = null;
  let notes: any[] = [];
  let questions: any[] = [];
  let subtopicNotes: any[] = [];
  let subtopicDisplay: string | null = null;
  try {
    const topicSearchPattern = slug.startsWith("edexcel") || (!isSimpleSubject)
      ? `*${encodeURIComponent(topicSlug)}`
      : `*${subjectKey === "additional-maths" ? "0606" : subjectKey === "computer-science" ? "0478" : "0455"}-${encodeURIComponent(topicSlug)}`;
    const tRes = await fetch(
      `${API}/topics?slug=ilike.${topicSearchPattern}&select=id,name,sort_order&limit=1`,
      { headers: baseHeaders, cache: "no-store" }
    );
    const topics = await tRes.json();
    if (topics?.[0]?.id) {
      topicId = topics[0].id;
      const topicSortOrder = topics[0].sort_order || 1;
      if (!displayName || displayName === topicSlug.replace(/-/g, " ")) {
        displayName = topics[0].name || displayName;
      }
      // For additional-maths/economics and edexcel maths: fetch subtopics from DB
      if (isSimpleSubject || isEdexcelMaths) {
        const stRes = await fetch(
          `${API}/subtopics?select=id,name,display_name,slug,sort_order&topic_id=eq.${topicId}&order=sort_order.asc`,
          { headers: baseHeaders, cache: "no-store" }
        );
        const stData = await stRes.json();
        if (Array.isArray(stData)) {
          subtopics = stData.map((s: any) => {
            const fullName = s.display_name || s.name;
            // Extract section number prefix like "1.1" from "1.1 The Nature..."
            const match = fullName.match(/^(\d+\.\d+)\s+(.*)/);
            return {
              slug: s.slug,
              displayName: match ? match[2] : fullName,
              pmtCode: subjectKey === "additional-maths" || slug === "edexcel-further-maths-4pm1" || slug === "edexcel-business-4bs1" || slug === "edexcel-economics-4ec1" || slug === "edexcel-geography-4ge1"
                ? `${topicSortOrder}.${s.sort_order}`
                : (match ? match[1] : undefined),
            };
          });
        }
      }
      // Fetch subtopic name if sub param present
      if (sub) {
        const stRes = await fetch(
          `${API}/subtopics?id=eq.${sub}&select=display_name&limit=1`,
          { headers: baseHeaders, cache: "force-cache" }
        );
        const stData = await stRes.json();
        if (stData?.[0]?.display_name) {
          subtopicDisplay = stData[0].display_name;
          displayName = subtopicDisplay;
        }
      }
      // Fetch notes
      const nUrl = sub
        ? `${API}/notes?select=*&subtopic_id=eq.${sub}&order=sort_order&limit=20`
        : `${API}/notes?select=*&topic_id=eq.${topicId}&order=sort_order&limit=50`;
      const nRes = await fetch(
        nUrl,
        { headers: baseHeaders, cache: "force-cache" }
      );
      notes = await nRes.json();
      // Fetch subtopic-specific notes (ZNotes summaries etc.)
      if (sub) {
        const snRes = await fetch(
          `${API}/notes?select=*&subtopic_id=eq.${sub}&order=sort_order&limit=20`,
          { headers: baseHeaders, cache: "force-cache" }
        );
        subtopicNotes = await snRes.json();
      }
      // Fetch questions
      const qUrl = sub
        ? `${API}/questions?select=*&subtopic_id=eq.${sub}&order=sort_order`
        : `${API}/questions?select=*&topic_id=eq.${topicId}&order=sort_order`;
      const qRes = await fetch(qUrl, { headers: baseHeaders, cache: "no-store" });
      questions = await qRes.json();
    }
    // Fallback: Edexcel subjects where topic slug doesn't match DB topic
    // → try topicSlug as a subtopic slug to get parent topic_id
    if (!topicId && slug.startsWith("edexcel")) {
      try {
        const subRes = await fetch(`${API}/subtopics?select=topic_id&slug=eq.${encodeURIComponent(topicSlug)}&limit=1`, { headers: baseHeaders, cache: "no-store" });
        const subData = await subRes.json();
        if (subData?.[0]?.topic_id) topicId = subData[0].topic_id;
      } catch {}
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
        {isMaths && slug !== "edexcel-further-maths-4pm1" && <TopicSearchBox subjectKey={subjectKey} topicSlug={topicSlug} />}
      </div>

      {/* For additional-maths/economics: show subtopics directly, no tabs */}
      {isSimpleSubject && subtopics.length > 0 && (
        <div className="mt-8">
          <p className="text-gray-500 mb-4">{subtopics.length} subtopics</p>
          <div className="space-y-3">
            {subtopics.map((st: any) => (
              <Link
                key={st.slug}
                href={`/subjects/${slug}/topics/${topicSlug}/${st.slug}`}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-accent-300 transition-all group flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-primary-900 group-hover:text-accent-500 transition">
                    {st.pmtCode && <span className="text-accent-500 mr-2 font-bold">{st.pmtCode}</span>}
                    {st.displayName}
                  </h3>
                </div>
                <span className="text-gray-300 group-hover:text-accent-500 transition">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: only for 0580 Math (not additional-maths) */}
      {isMaths && subjectKey !== "additional-maths" && slug !== "edexcel-further-maths-4pm1" && (
      <div className="flex gap-1 mt-8 border-b">
        <Link
          href={`/subjects/${slug}/topics/${topicSlug}${tabUrl("notes")}`}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "notes" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📖 Notes
        </Link>
        <Link
          href={`/subjects/${slug}/topics/${topicSlug}${tabUrl("questions")}`}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "questions" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          ✏️ Questions
        </Link>
        {subtopics.length > 0 && !sub && (
          <Link
            href={`/subjects/${slug}/topics/${topicSlug}${tabUrl("subtopics")}`}
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
          {/* Subtopic-specific ZNotes Summary */}
          {sub && subtopicNotes.filter((n: any) => (n.title || "").includes("ZNotes")).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                📝 ZNotes Summary
              </h3>
              {subtopicNotes.filter((n: any) => (n.title || "").includes("ZNotes")).map((note: any) => (
                <div key={note.id} className="bg-white border rounded-xl overflow-hidden">
                  {note.file_url ? (
                    <img
                      src={`/api/notes/download?id=${note.id}`}
                      alt={note.title.replace("[ZNotes Summary] ", "")}
                      className="w-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-5 text-gray-400 text-center">No preview available</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {notes.filter((n: any) => !(n.title || "").includes("ZNotes")).length === 0 && subtopicNotes.filter((n: any) => (n.title || "").includes("ZNotes")).length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No notes yet</p>
              <p className="text-sm mt-2">Study notes are being prepared</p>
            </div>
          ) : (
notes.filter((n: any) => !(n.title || "").includes("ZNotes")).map((note: any) => (
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
                {!note.file_url && note.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                )}
                {note.file_url && (
                  <>
                    <iframe
                      src={`/api/notes/download?id=${note.id}`}
                      className="w-full h-[600px] border rounded-lg mb-3"
                      title={note.title}
                    />
                    <a
                      href={`/api/notes/download?id=${note.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                    >
                      📥 {note.source ? `[${note.source}] ` : ""}{note.file_name || "Download"}
                    </a>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Questions tab */}
      {activeTab === "questions" && topicId && (
        <TopicQuestionsClient
          topicId={topicId}
          preloadedQuestions={questions}
          bugContext={{
            board: slug.startsWith("edexcel") ? "Edexcel" : "CAIE",
            subject: (() => { const parts = slug.split("-"); const idx = parts.findIndex((p: string) => p === "physics" || p === "chemistry" || p === "biology" || p === "mathematics"); return idx >= 0 ? parts[idx].charAt(0).toUpperCase() + parts[idx].slice(1) : "Unknown"; })(),
            code: (() => { const p = slug.split("-"); const last = p[p.length-1]; return /^\d/.test(last) ? last : ""; })(),
            topicName: displayName,
          }}
        />
      )}
      {activeTab === "questions" && !topicId && (
        <div className="mt-6 text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Topic not found</p>
        </div>
      )}

      {/* Subtopics tab — ONLY for non-additional-maths, non-economics (those show subtopics directly above) */}
      {activeTab === "subtopics" && subjectKey !== "additional-maths" && subjectKey !== "economics" && subjectKey !== "computer-science" && subjectKey !== "business" && subjectKey !== "geography" && slug !== "edexcel-further-maths-4pm1" && (
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
