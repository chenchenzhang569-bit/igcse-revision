"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MixedContent } from "@/components/MixedContent";
import BookmarkButton from "@/components/BookmarkButton";
import ReportBugModal from "@/components/ReportBugModal";
import { createBrowserClient } from "@supabase/ssr";
import TopicQuestionsClient from "./TopicQuestionsClient";

const markdownComponents = {
  img: (props: any) => (
    <img {...props} style={{ maxWidth: "100%", height: "auto" }} />
  ),
};

interface Note {
  id: string;
  title: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  source?: string;
}

interface Question {
  id: string;
  question_text: string;
  answer_text: string;
  clean_answer_text?: string;
  difficulty: string;
  question_type: string;
  marks: number;
  options?: any;
  explanation?: string;
  clean_explanation?: string;
}

type Tab = "notes" | "mcq" | "questions";

export default function EconomicsTabs({
  notes = [],
  mcqs = [],
  structuredQuestions = [],
  subtopicId,
  subtopicName,
  slug,
  topicSlug,
}: {
  notes: Note[];
  mcqs: Question[];
  structuredQuestions: Question[];
  subtopicId: string | null;
  subtopicName: string;
  slug: string;
  topicSlug: string;
}) {
  const [tab, setTab] = useState<Tab>("notes");
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submittedLevels, setSubmittedLevels] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bugModalOpen, setBugModalOpen] = useState(false);

  // Fetch bookmarked question IDs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bookmarks", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBookmarkedIds(new Set(data.map((b: any) => b.question.id)));
        }
      } catch {}
    })();
  }, []);

  // MCQ rendering — grouped by difficulty (same as TopicTabs)
  const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const sortedMcqs = [...mcqs].sort(
    (a, b) => (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9)
  );

  const groupedMcqs: Record<string, Question[]> = { easy: [], medium: [], hard: [] };
  for (const q of sortedMcqs) {
    const level = q.difficulty || "easy";
    if (groupedMcqs[level]) groupedMcqs[level].push(q);
    else groupedMcqs.easy.push(q);
  }
  const groupOrder = ["easy", "medium", "hard"];

  function selectAnswer(qId: string, answer: string, difficulty: string) {
    if (submittedLevels.has(difficulty)) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: answer }));
  }

  async function handleSubmitLevel(level: string) {
    setSubmittedLevels((prev) => new Set(prev).add(level));

    const getSessionJwt = async (): Promise<string | null> => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
      } catch { return null; }
    };
    const jwt = await getSessionJwt();

    const answers = (groupedMcqs[level] || []).map(q => ({
      question_id: q.id,
      user_answer: userAnswers[q.id] || "",
      correct_answer: q.answer_text || (q as any).correct_answer || "",
      is_correct: userAnswers[q.id] === (q.answer_text || (q as any).correct_answer),
      question_text: q.question_text,
      difficulty: q.difficulty,
    }));
    fetch("/api/user-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(jwt ? { "Authorization": `Bearer ${jwt}` } : {}) },
      body: JSON.stringify({ answers, subject_slug: slug, topic_slug: topicSlug }),
      credentials: "include",
    }).catch(e => console.error("Save answers error:", e));
  }

  function handleResetLevel(level: string) {
    setSubmittedLevels((prev) => {
      const next = new Set(prev);
      next.delete(level);
      return next;
    });
    const levelQIds = new Set((groupedMcqs[level] || []).map(q => q.id));
    setUserAnswers((prev) => {
      const next = { ...prev };
      for (const id of levelQIds) delete next[id];
      return next;
    });
  }

  function renderMcqQuestion(q: Question, i: number, showResults: boolean, difficulty: string) {
    let text = q.question_text;
    const userAnswer = userAnswers[q.id];
    const isCorrect = userAnswer === q.answer_text;
    const diffColor =
      q.difficulty === "easy" ? "bg-green-50 text-green-600"
      : q.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
      : "bg-red-50 text-red-600";
    const diffLabel =
      q.difficulty === "easy" ? "Easy" : q.difficulty === "medium" ? "Medium" : "Hard";

    // Get options from question_text (A./B./C./D. lines)
    const labels = ["A", "B", "C", "D"];
    const lines = text.split("\n");
    const optionLines = lines.filter((l) => /^[A-D][.)]/.test(l.trim()));
    
    let stem: string;
    if (optionLines.length >= 2) {
      const firstOptIdx = Math.max(text.indexOf(optionLines[0]), 0);
      stem = text.slice(0, firstOptIdx).trim();
    } else {
      stem = text.trim();
    }

    // Extract display texts for each option
    const displayTexts: Record<string, string> = {};
    for (const opt of optionLines) {
      const trimmed = opt.trim();
      const label = trimmed.charAt(0);
      if (labels.includes(label)) {
        displayTexts[label] = trimmed.slice(2).trim();
      }
    }

    // Extract image
    let embeddedImageUrl: string | null = null;
    const imgMatch = stem.match(/!\[.*?\]\(([^)]+)\)/);
    if (imgMatch) {
      embeddedImageUrl = imgMatch[1];
      stem = stem.replace(imgMatch[0], "").trim();
    }

    return (
      <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>{diffLabel}</span>
            <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
            <div className="ml-auto flex items-center gap-1">
              <BookmarkButton questionId={q.id} />
              <button onClick={() => setBugModalOpen(true)} className="text-gray-400 hover:text-[#001C71] transition" title="Report issue">🔧</button>
            </div>
          </div>
          <MixedContent text={stem} className="text-gray-800 prose prose-sm max-w-none" />
          {((q as any).image_url || embeddedImageUrl) && (
            <div className="mt-4 flex justify-center">
              <img 
                src={(q as any).image_url || embeddedImageUrl} 
                alt="Question diagram" 
                className="max-w-full h-auto rounded-lg border border-gray-100"
                style={{ maxHeight: "400px" }}
              />
            </div>
          )}
        </div>
        <div className="px-5 pb-5 space-y-2">
          {labels.map((label) => {
            const optText = displayTexts[label] || "";
            const selected = userAnswer === label;
            let cls = "border-gray-200 hover:bg-gray-50 cursor-pointer";
            if (showResults) {
              if (label === q.answer_text) cls = "bg-green-50 border-green-400";
              else if (selected) cls = "bg-red-50 border-red-400";
              else cls = "border-gray-200 opacity-60";
            } else if (selected) cls = "bg-primary-50 border-primary-400";
            const hasText = !!optText;
            return (
              <button key={label} onClick={() => selectAnswer(q.id, label, difficulty)} disabled={showResults}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${cls} ${hasText ? "text-left" : "justify-center"}`}>
                <span className={`${hasText ? "w-8 h-8" : "w-12 h-12 text-lg"} rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  showResults && label === q.answer_text ? "bg-green-500 text-white"
                  : showResults && selected ? "bg-red-500 text-white"
                  : selected ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600"
                }`}>{label}</span>
                {hasText && <span className="text-sm">{optText}</span>}
                {showResults && label === q.answer_text && <span className="ml-auto text-green-600 text-sm">✓ Correct</span>}
                {showResults && selected && !isCorrect && <span className="ml-auto text-red-600 text-sm">✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "notes" as Tab, label: "📝 Notes", count: notes.length },
    { key: "mcq" as Tab, label: "📋 Multiple Choice", count: mcqs.length },
    { key: "questions" as Tab, label: "✏️ Questions", count: structuredQuestions.length },
  ];

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
              tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label} {t.count > 0 && `(${t.count})`}
          </button>
        ))}
      </div>

      {/* Notes tab */}
      {tab === "notes" && (
        <div className="mt-6 space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No notes yet</p>
              <p className="text-sm mt-2">Our team is adding study notes for this topic</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  {note.source && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-600">
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
                  <>
                    <iframe
                      src={note.file_url}
                      className="w-full h-[600px] border rounded-lg mb-3"
                      title={note.title}
                    />
                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                    >
                      📥 Download
                    </a>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MCQ tab */}
      {tab === "mcq" && (
        <div className="mt-6">
          {mcqs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No MCQ questions yet</p>
              <p className="text-sm mt-2">Our team is adding multiple choice questions for this topic</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupOrder.map((level) => {
                if (!groupedMcqs[level] || groupedMcqs[level].length === 0) return null;
                const showResults = submittedLevels.has(level);
                const allAnswered = groupedMcqs[level].every(q => userAnswers[q.id]);
                const levelLabel = level === "easy" ? "Easy" : level === "medium" ? "Medium" : "Hard";
                const levelColor =
                  level === "easy" ? "bg-green-50 border-green-200"
                  : level === "medium" ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200";
                return (
                  <div key={level} className={`rounded-xl border p-4 sm:p-6 ${levelColor}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-primary-900">
                        {levelLabel} ({groupedMcqs[level].length})
                      </h3>
                      <div className="flex gap-2">
                        {showResults ? (
                          <button onClick={() => handleResetLevel(level)}
                            className="px-4 py-1.5 text-sm rounded-lg border bg-white text-gray-600 hover:bg-gray-100 transition">
                            Retry
                          </button>
                        ) : (
                          <button onClick={() => handleSubmitLevel(level)}
                            disabled={!allAnswered}
                            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${
                              allAnswered ? "bg-accent-500 text-white hover:bg-accent-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}>
                            Submit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {groupedMcqs[level].map((q, i) => renderMcqQuestion(q, i, showResults, level))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Questions tab */}
      {tab === "questions" && subtopicId && (
        <TopicQuestionsClient
          topicId={subtopicId}
          preloadedQuestions={structuredQuestions}
          bugContext={{
            board: "CAIE",
            subject: "Economics",
            code: "0455",
            topicName: subtopicName,
          }}
        />
      )}
      {tab === "questions" && !subtopicId && (
        <div className="mt-6 text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Topic not found</p>
        </div>
      )}

      {/* Bug report modal */}
      <ReportBugModal
        open={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        context={{
          board: "CAIE",
          subject: "Economics",
          code: "0455",
          subtopic: subtopicName,
        }}
      />
    </div>
  );
}
