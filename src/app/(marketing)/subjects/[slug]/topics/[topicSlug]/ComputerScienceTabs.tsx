"use client";

import { useState } from "react";
import Link from "next/link";

type Note = {
  id: string;
  title: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  source?: string;
};

type PastPaper = {
  id: string;
  title: string;
  file_url: string;
  paper_type: string;
};

type PaperPair = {
  qp: PastPaper;
  ms?: PastPaper;
};

type Tab = "notes" | "questions";

export default function ComputerScienceTabs({
  notes = [],
  qpPairs = [],
  subtopicId,
  subtopicName,
  slug,
  topicSlug,
}: {
  notes: Note[];
  qpPairs: PaperPair[];
  subtopicId: string | null;
  subtopicName: string;
  slug: string;
  topicSlug: string;
}) {
  const [tab, setTab] = useState<Tab>("notes");

  const allTabs: { key: Tab; label: string; count: number }[] = [
    { key: "notes", label: "\uD83D\uDCDD Notes", count: notes.length },
    { key: "questions", label: "\uD83D\uDCC4 Questions", count: qpPairs.length },
  ];
  const tabs = allTabs; // Always show all tabs
  const validKeys = new Set(tabs.map((t) => t.key));
  const activeTab: Tab = validKeys.has(tab) ? tab : tabs[0].key;

  function downloadNote(note: Note) {
    if (note.file_url) {
      window.open(note.file_url, "_blank");
      return;
    }
    const text = note.content || "";
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = note.file_name || `${note.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b mb-6 items-center justify-between">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
                activeTab === t.key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-400 hover:text-[#001C71]"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {subtopicId && (
          <Link
            href={`/dashboard/my-bank?subtopic_id=${subtopicId}`}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition"
          >
            ♥ Saved
          </Link>
        )}
      </div>

      {/* NOTES */}
      {activeTab === "notes" &&
        (notes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm mt-2">
              Our team is adding study notes for this topic
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {note.title}
                  </h3>
                  {note.source && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        note.source === "PMT"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {note.source}
                    </span>
                  )}
                </div>
                {note.file_url && (
                  <>
                    {/* Preview only for Summary notes, not Definitions */}
                    {note.title.includes("Summary") && (
                      /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(note.file_url) ? (
                        <div className="border rounded-lg overflow-hidden mb-3 bg-gray-50 flex justify-center">
                          <img
                            src={note.file_url}
                            alt={note.title}
                            className="max-w-full h-auto"
                            style={{ maxHeight: "80vh" }}
                          />
                        </div>
                      ) : (
                        <iframe
                          src={note.file_url}
                          className="w-full h-[600px] border rounded-lg mb-3"
                          title={note.title}
                        />
                      )
                    )}
                    <button
                      onClick={() => downloadNote(note)}
                      className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                    >
                      📥 Download
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}

      {/* QUESTIONS — QP+MS PDF downloads only */}
      {activeTab === "questions" &&
        (qpPairs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No questions yet</p>
            <p className="text-sm mt-2">
              Our team is adding past paper questions for this topic
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
              📄 Past Paper Questions & Mark Schemes
            </h3>
            {qpPairs.map((pair, i) => (
              <div
                key={pair.qp.id}
                className="bg-white border rounded-xl p-5"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium mr-2">
                      Q{i + 1}
                    </span>
                    <span className="text-sm text-gray-700">
                      {pair.qp.title}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={pair.qp.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition"
                    >
                      📄 Paper
                    </a>
                    {pair.ms && pair.ms.id !== pair.qp.id && (
                      <a
                        href={pair.ms.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition"
                      >
                        📝 Answers
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
