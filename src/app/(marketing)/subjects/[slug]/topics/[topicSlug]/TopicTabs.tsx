"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PastPaper = {
  id: string;
  title: string;
  file_url: string;
  paper_type: string;
};

type Question = {
  id: string;
  question_text: string;
  answer_text: string;
  difficulty: string;
  marks: number;
  sort_order: number;
};

type Note = {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  is_free_preview: boolean;
  source?: string | null;
};

type PaperPair = {
  qp: PastPaper;
  ms?: PastPaper;
};

type Tab = "notes" | "mcq" | "structured";

export function TopicTabs({
  notes,
  mcqs = [],
  mcqPairs = [],
  pairedPapers,
  structuredQuestions = [],
}: {
  notes: Note[];
  mcqs: Question[];
  mcqPairs?: PaperPair[];
  pairedPapers: PaperPair[];
  structuredQuestions?: Question[];
}) {
  const [tab, setTab] = useState<Tab>("notes");
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "notes", label: "📝 Notes", count: notes.length },
    { key: "mcq", label: "📋 Multiple Choice", count: mcqs.length + mcqPairs.length },
    { key: "structured", label: "📄 Question Paper", count: pairedPapers.length + structuredQuestions.length },
  ];

  const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const sortedMcqs = [...mcqs].sort(
    (a, b) => (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9)
  );

  const score = sortedMcqs.filter((q) => userAnswers[q.id] === q.answer_text).length;

  function selectAnswer(qId: string, answer: string) {
    if (showResults) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: answer }));
  }

  function handleSubmit() {
    setShowResults(true);
  }

  function handleReset() {
    setUserAnswers({});
    setShowResults(false);
  }

  function isTableQuestion(text: string): boolean {
    return text.includes("|") && text.includes("---") && !/^[A-D][.)]/m.test(text);
  }

  function parseOptions(text: string): string[] {
    const lines = text.split("\n");
    return lines.filter((l) => /^[A-D][.)]/.test(l.trim()));
  }

  function renderMcqQuestion(q: Question, i: number) {
    const text = q.question_text;
    const userAnswer = userAnswers[q.id];
    const isCorrect = userAnswer === q.answer_text;
    const diffColor =
      q.difficulty === "easy" ? "bg-green-50 text-green-600"
      : q.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
      : "bg-red-50 text-red-600";
    const diffLabel =
      q.difficulty === "easy" ? "Easy" : q.difficulty === "medium" ? "Medium" : "Hard";

    if (isTableQuestion(text)) {
      // Fix malformed markdown table: add missing leading/trailing pipes, fix separator
      const lines = text.split('\n');
      const fixed: string[] = [];
      for (const line of lines) {
        if (line.includes('---')) continue;
        if (line.includes('|')) {
          const parts = line.split('|').map(s => s.trim());
          if (/^[A-D]$/.test(parts[0])) {
            fixed.push('| ' + parts.join(' | ') + ' |');
          } else {
            const cols = parts.filter(p => p.length > 0);
            fixed.push('|  | ' + cols.join(' | ') + ' |');
            fixed.push('|---|' + cols.map(() => '---').join('|') + '|');
          }
        } else {
          fixed.push(line);
        }
      }
      const cleanText = fixed.join('\n');

      return (
        <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>{diffLabel}</span>
              <span className="text-xs text-gray-400">{q.marks} marks</span>
            </div>
            <div className="text-gray-800 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanText}</ReactMarkdown>
            </div>
          </div>
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {["A", "B", "C", "D"].map((label) => {
              const selected = userAnswer === label;
              let cls = "border-gray-200 hover:bg-gray-50";
              if (showResults) {
                if (label === q.answer_text) cls = "bg-green-50 border-green-400";
                else if (selected) cls = "bg-red-50 border-red-400";
                else cls = "border-gray-200 opacity-60";
              } else if (selected) cls = "bg-primary-50 border-primary-400";
              return (
                <button key={label} onClick={() => selectAnswer(q.id, label)} disabled={showResults}
                  className={`flex-1 p-3 rounded-lg border text-center font-bold transition ${cls}`}>
                  {label}
                  {showResults && label === q.answer_text && " ✓"}
                  {showResults && selected && !isCorrect && " ✗"}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const options = parseOptions(text);
    const stemEnd = options.length > 0 ? text.indexOf(options[0]) : text.length;
    const stem = text.slice(0, stemEnd).trim();
    const optionLabels = options.length >= 4 
      ? options.map((opt) => opt.charAt(0))
      : ["A", "B", "C", "D"];

    return (
      <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>{diffLabel}</span>
            <span className="text-xs text-gray-400">{q.marks} marks</span>
          </div>
          <div className="text-gray-800 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stem}</ReactMarkdown>
          </div>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {optionLabels.map((label) => {
            const opt = options.find(o => o.startsWith(label));
            const optText = opt ? opt.slice(3).trim() : "";
            const selected = userAnswer === label;
            let cls = "border-gray-200 hover:bg-gray-50 cursor-pointer";
            if (showResults) {
              if (label === q.answer_text) cls = "bg-green-50 border-green-400";
              else if (selected) cls = "bg-red-50 border-red-400";
              else cls = "border-gray-200 opacity-60";
            } else if (selected) cls = "bg-primary-50 border-primary-400";
            const hasText = !!optText;
            return (
              <button key={label} onClick={() => selectAnswer(q.id, label)} disabled={showResults}
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

  function downloadContent(note: Note) {
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
      <div className="flex border-b mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
              tab === t.key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* NOTES */}
      {tab === "notes" && (
        notes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm mt-2">Our team is adding study notes for this topic</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  {note.is_free_preview
                    ? <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Free Preview</span>
                    : <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Premium</span>}
                  {note.source && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      note.source === "PMT" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                    }`}>
                      {note.source}
                    </span>
                  )}
                </div>
                {note.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                )}
                {note.file_name && (
                  <button onClick={() => downloadContent(note)}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    📥 {note.source ? `[${note.source}] ` : ""}{note.file_name}
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* MCQ */}
      {tab === "mcq" && (
        mcqs.length === 0 && mcqPairs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No multiple choice questions yet</p>
            <p className="text-sm mt-2">Our team is adding questions for this topic</p>
          </div>
        ) : (
          <div className="space-y-8">
            {mcqPairs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">📥 MCQ Papers & Answer Keys</h3>
                <div className="space-y-3">
                  {mcqPairs.map((pair, i) => (
                    <div key={pair.qp.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">MCQ {i + 1}</span>
                        <span className="text-sm text-gray-700">
                          {pair.qp.title.replace(/^(CAIE|Edexcel)\s+\w+\s+-\s+\S+\s+-\s+/, "").replace(/ - MCQ.*$/, "")}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <a href={pair.qp.file_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition">📄 Paper</a>
                        {pair.ms && pair.ms.id !== pair.qp.id && (
                          <a href={pair.ms.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">📝 Answer</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedMcqs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">💻 Practice Online ({sortedMcqs.length} questions)</h3>
                  <div className="flex gap-2">
                    {!showResults ? (
                      <button onClick={handleSubmit}
                        disabled={Object.keys(userAnswers).length < sortedMcqs.length}
                        className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        Submit Answers
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-700">Score: {score}/{sortedMcqs.length} ({Math.round((score / sortedMcqs.length) * 100)}%)</span>
                        <button onClick={handleReset} className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">Retry</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  {sortedMcqs.map((q, i) => renderMcqQuestion(q, i))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* STRUCTURED / PAPER QUESTIONS */}
      {tab === "structured" && (
        pairedPapers.length === 0 && structuredQuestions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No structured questions yet</p>
            <p className="text-sm mt-2">Our team is adding past paper questions for this topic</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Structured questions from DB */}
            {structuredQuestions.length > 0 && (
              <div className="space-y-6">
                {structuredQuestions.map((q, i) => (
                  <div key={q.id} className="bg-white border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
                      <span className="text-xs text-gray-400">{q.marks} marks</span>
                    </div>
                    <div className="text-gray-800 prose prose-sm max-w-none mb-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.question_text}</ReactMarkdown>
                    </div>
                    {q.answer_text && (
                      <details className="group">
                        <summary className="text-sm font-medium text-primary-600 cursor-pointer hover:text-primary-700">
                          Show Answer
                        </summary>
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.answer_text}</ReactMarkdown>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Paired past papers */}
            {pairedPapers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">📄 Past Paper Questions & Mark Schemes</h3>
                <div className="space-y-4">
                  {pairedPapers.map((pair, i) => (
                    <div key={pair.qp.id} className="bg-white border rounded-xl p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium mr-2">Q{i + 1}</span>
                          <span className="text-sm text-gray-700">
                            {pair.qp.title.replace(/^(CAIE|Edexcel)\s+\w+\s+-\s+\S+\s+-\s+/, "")}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <a href={pair.qp.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition">📄 Paper</a>
                          {pair.ms && pair.ms.id !== pair.qp.id && (
                            <a href={pair.ms.file_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">📝 Answers</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
