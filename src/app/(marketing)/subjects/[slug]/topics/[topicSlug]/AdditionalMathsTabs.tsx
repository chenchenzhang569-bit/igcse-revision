"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TopicQuestionsClient from "./TopicQuestionsClient";

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

export default function AdditionalMathsTabs({
  notes = [],
  structuredQuestions = [],
  pairedPapers = [],
  subtopicId,
  subtopicName,
  slug,
  topicSlug,
  bugContext,
}: {
  notes: Note[];
  structuredQuestions: Question[];
  pairedPapers?: { qp: { id: string; title: string; file_url: string }; ms?: { id: string; title: string; file_url: string } }[];
  subtopicId: string | null;
  subtopicName: string;
  slug: string;
  topicSlug: string;
  bugContext?: { board: string; subject: string; code: string; topicName: string };
}) {
  const [tab, setTab] = useState<"notes" | "questions">("notes");

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="bg-gray-50 rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setTab("notes")}
          className={`flex-1 px-5 py-3 text-sm font-bold rounded-lg transition-all ${
            tab === "notes"
              ? "bg-white text-primary-600 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-800 border border-transparent"
          }`}
        >
          📝 Notes {notes.length > 0 && <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{notes.length}</span>}
        </button>
        <button
          onClick={() => setTab("questions")}
          className={`flex-1 px-5 py-3 text-sm font-bold rounded-lg transition-all ${
            tab === "questions"
              ? "bg-white text-primary-600 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-800 border border-transparent"
          }`}
        >
          ✏️ Questions {structuredQuestions.length > 0 && <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{structuredQuestions.length}</span>}
        </button>
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
            notes
              .map((note) => (
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
                        📥 Download
                      </a>
                    </>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* Questions tab */}
      {tab === "questions" && subtopicId && (
        <>
          {/* PMT past paper PDF links */}
          {pairedPapers.length > 0 && (
            <div className="mt-5 mb-6">
              <h3 className="text-base font-bold text-white bg-[#001C71] px-4 py-2.5 rounded-lg mb-3">📥 Past Paper by Topics Download</h3>
              <div className="space-y-3">
                {pairedPapers.map((pair, i) => (
                  <div key={pair.qp.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Topic {i + 1}</span>
                      <span className="text-sm text-gray-700">{pair.qp.title.replace(/\s*QP$/, "")}</span>
                    </div>
                    <div className="flex gap-2">
                      <a href={`/api/past-papers/download?id=${pair.qp.id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition">📄 Paper</a>
                      {pair.ms && (
                        <a href={`/api/past-papers/download?id=${pair.ms.id}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">📝 Answer</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {structuredQuestions.length > 0 && (
            <div className="mb-3">
              <h3 className="text-base font-bold text-white bg-[#001C71] px-4 py-2.5 rounded-lg">💻 Practice Online ({structuredQuestions.length} questions)</h3>
            </div>
          )}
          <TopicQuestionsClient
            topicId={subtopicId}
            preloadedQuestions={structuredQuestions}
            bugContext={bugContext || {
              board: "CAIE",
              subject: "Additional Mathematics",
              code: "0606",
              topicName: subtopicName,
            }}
          />
        </>
      )}
      {tab === "questions" && !subtopicId && (
        <div className="mt-6 text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Topic not found</p>
        </div>
      )}
    </div>
  );
}
