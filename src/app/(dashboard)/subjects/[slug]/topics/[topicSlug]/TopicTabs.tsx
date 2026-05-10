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
};

type PaperPair = {
  qp: PastPaper;
  ms?: PastPaper;
};

type Tab = "notes" | "mcq" | "structured";

export function TopicTabs({
  notes,
  mcqs,
  mcqPairs = [],
  pairedPapers,
}: {
  notes: Note[];
  mcqs: Question[];
  mcqPairs?: PaperPair[];
  pairedPapers: PaperPair[];
}) {
  const [tab, setTab] = useState<Tab>("notes");
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "notes", label: "📝 笔记", count: notes.length },
    { key: "mcq", label: "📋 选择题", count: mcqs.length + mcqPairs.length },
    { key: "structured", label: "📄 问答题", count: pairedPapers.length },
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
    // Table questions have markdown tables but no A)/B)/C)/D) or A./B./C./D. option lines
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
      q.difficulty === "easy" ? "简单" : q.difficulty === "medium" ? "中等" : "困难";

    if (isTableQuestion(text)) {
      // Table question: render markdown table + option buttons with extracted text
      // Fix leading spaces in table rows that break markdown rendering
      const cleanText = text.split('\n').map(line => {
        if (line.includes('|')) return line.trim();
        return line;
      }).join('\n');
      
      // Extract option text from table rows (e.g. "A | ruler | measuring cylinder")
      const tableOptions: Record<string, string> = {};
      for (const line of text.split('\n')) {
        const m = line.match(/^\|?\s*([A-D])\s*\|\s*(.+?)\s*\|/);
        if (m) tableOptions[m[1]] = m[2].trim();
      }

      return (
        <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>{diffLabel}</span>
              <span className="text-xs text-gray-400">{q.marks} 分</span>
            </div>
            <div className="text-gray-800 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanText}</ReactMarkdown>
            </div>
          </div>
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {["A", "B", "C", "D"].map((label) => {
              const selected = userAnswer === label;
              const optLabel = tableOptions[label] ? `${label}. ${tableOptions[label]}` : label;
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

    // Normal question: parse stem + options
    const options = parseOptions(text);
    const hasImage = /!\[/.test(text);
    const stemEnd = options.length > 0 ? text.indexOf(options[0]) : text.length;
    const stem = text.slice(0, stemEnd).trim();

    // Option labels (A/B/C/D) — show even if text options missing (image-based Qs)
    const optionLabels = options.length >= 4 
      ? options.map((opt) => opt.charAt(0))
      : ["A", "B", "C", "D"];

    return (
      <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>{diffLabel}</span>
            <span className="text-xs text-gray-400">{q.marks} 分</span>
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
            return (
              <button key={label} onClick={() => selectAnswer(q.id, label)} disabled={showResults}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${cls}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  showResults && label === q.answer_text ? "bg-green-500 text-white"
                  : showResults && selected ? "bg-red-500 text-white"
                  : selected ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600"
                }`}>{label}</span>
                {optText ? <span className="text-sm">{optText}</span> : null}
                {showResults && label === q.answer_text && <span className="ml-auto text-green-600 text-sm">✓ 正确</span>}
                {showResults && selected && !isCorrect && <span className="ml-auto text-red-600 text-sm">✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
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
          <div className="text-center py-20 text-gray-400"><p>暂无笔记，管理员正在添加中...</p></div>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  {note.is_free_preview
                    ? <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">免费预览</span>
                    : <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">付费</span>}
                </div>
                {note.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                )}
                {note.file_url && (
                  <a href={note.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    📥 下载 PDF{note.file_name ? ` (${note.file_name})` : ""}
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* MCQ */}
      {tab === "mcq" && (
        mcqs.length === 0 && mcqPairs.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><p>暂无选择题，管理员正在添加中...</p></div>
        ) : (
          <div className="space-y-8">
            {mcqPairs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">📥 MCQ 题目 & 答案下载</h3>
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
                          className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition">📄 题目</a>
                        {pair.ms && pair.ms.id !== pair.qp.id && (
                          <a href={pair.ms.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">📝 答案</a>
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
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">💻 在线作答 ({sortedMcqs.length} 题)</h3>
                  <div className="flex gap-2">
                    {!showResults ? (
                      <button onClick={handleSubmit}
                        disabled={Object.keys(userAnswers).length < sortedMcqs.length}
                        className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        提交答案
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-700">得分: {score}/{sortedMcqs.length} ({Math.round((score / sortedMcqs.length) * 100)}%)</span>
                        <button onClick={handleReset} className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">重新作答</button>
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

      {/* STRUCTURED */}
      {tab === "structured" && (
        pairedPapers.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><p>暂无问答题，管理员正在添加中...</p></div>
        ) : (
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
                      className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition">📄 题目</a>
                    {pair.ms && pair.ms.id !== pair.qp.id && (
                      <a href={pair.ms.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">📝 答案</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
