"use client";

import { useState } from "react";

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
  pairedPapers,
}: {
  notes: Note[];
  mcqs: Question[];
  pairedPapers: PaperPair[];
}) {
  const [tab, setTab] = useState<Tab>("notes");
  const [expandedMcq, setExpandedMcq] = useState<string | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [mcqChecked, setMcqChecked] = useState<Record<string, boolean>>({});

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "notes", label: "📝 笔记", count: notes.length },
    { key: "mcq", label: "📋 选择题", count: mcqs.length },
    { key: "structured", label: "📄 问答题", count: pairedPapers.length },
  ];

  // Parse MCQ options from question_text (format: "Question\nA) ...\nB) ...\nC) ...\nD) ...")
  function parseMcqOptions(text: string): { stem: string; options: { key: string; text: string }[] } {
    const lines = text.split("\n").filter(Boolean);
    const options: { key: string; text: string }[] = [];
    const stemLines: string[] = [];
    for (const line of lines) {
      const match = line.match(/^([A-D])[).]\s*(.+)/);
      if (match) {
        options.push({ key: match[1], text: match[2] });
      } else {
        stemLines.push(line);
      }
    }
    return { stem: stemLines.join("\n"), options };
  }

  function checkMcq(q: Question) {
    const userAnswer = mcqAnswers[q.id];
    if (!userAnswer) return;
    const correct = q.answer_text.trim().toUpperCase();
    setMcqChecked((prev) => ({
      ...prev,
      [q.id]: userAnswer.toUpperCase()[0] === correct[0],
    }));
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
              tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* === NOTES TAB === */}
      {tab === "notes" && (
        notes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>暂无笔记，管理员正在添加中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  {note.is_free_preview ? (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">免费预览</span>
                  ) : (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">付费</span>
                  )}
                </div>
                {note.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line mb-4">
                    {note.content}
                  </div>
                )}
                {note.file_url && (
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    📥 下载 PDF{note.file_name ? ` (${note.file_name})` : ""}
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* === MCQ TAB === */}
      {tab === "mcq" && (
        mcqs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>暂无选择题，管理员正在添加中...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mcqs.map((q, i) => {
              const { stem, options } = parseMcqOptions(q.question_text);
              const checked = mcqChecked[q.id];
              return (
                <div key={q.id} className="bg-white border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      q.difficulty === "easy" ? "bg-green-50 text-green-600"
                      : q.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
                      : "bg-red-50 text-red-600"
                    }`}>
                      {q.difficulty === "easy" ? "简单" : q.difficulty === "medium" ? "中等" : "困难"}
                    </span>
                    <span className="text-xs text-gray-400">{q.marks} 分</span>
                  </div>

                  <p className="text-gray-800 mb-3 whitespace-pre-line">{stem}</p>

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {options.map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          checked !== undefined
                            ? opt.key === q.answer_text.trim().toUpperCase()
                              ? "bg-green-50 border-green-300"
                              : mcqAnswers[q.id]?.toUpperCase()[0] === opt.key
                              ? "bg-red-50 border-red-300"
                              : "bg-gray-50 border-gray-200"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`mcq-${q.id}`}
                          value={opt.key}
                          checked={mcqAnswers[q.id]?.toUpperCase()[0] === opt.key}
                          onChange={(e) =>
                            setMcqAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          disabled={checked !== undefined}
                          className="text-primary-600"
                        />
                        <span className="text-sm">
                          <strong>{opt.key})</strong> {opt.text}
                        </span>
                      </label>
                    ))}
                  </div>

                  {checked === undefined ? (
                    <button
                      onClick={() => checkMcq(q)}
                      disabled={!mcqAnswers[q.id]}
                      className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      检查答案
                    </button>
                  ) : (
                    <div className={`text-sm font-medium ${checked ? "text-green-600" : "text-red-600"}`}>
                      {checked ? "✅ 正确！" : `❌ 错误！正确答案是 ${q.answer_text.trim().toUpperCase()}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* === STRUCTURED QUESTIONS TAB === */}
      {tab === "structured" && (
        pairedPapers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>暂无问答题，管理员正在添加中...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pairedPapers.map((pair, i) => (
              <div key={pair.qp.id} className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium mr-2">
                      Q{i + 1}
                    </span>
                    <span className="text-sm text-gray-700">
                      {pair.qp.title.replace(/^(CAIE|Edexcel)\s+\w+\s+-\s+\S+\s+-\s+/, "")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {/* Question PDF */}
                    <a
                      href={pair.qp.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition"
                    >
                      📄 题目
                    </a>
                    {/* Answer PDF */}
                    {pair.ms && pair.ms.id !== pair.qp.id && (
                      <a
                        href={pair.ms.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition"
                      >
                        📝 答案
                      </a>
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
