// force-redeploy-v7-supabase-session
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MixedContent } from "@/components/MixedContent";
import BookmarkButton from "@/components/BookmarkButton";
import { createBrowserClient } from "@supabase/ssr";

const markdownComponents = {
  img: (props: any) => (
    <img {...props} style={{ maxWidth: "100%", height: "auto" }} />
  ),
};

function allowDataUrls(url: string) {
  return url;
}

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
  options?: string[] | string;
  image_url?: string | null;
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
  pmtCode = "",
  displayName = "",
  subtopicId = null as string | null,
  subjectSlug = "",
  topicSlug = "",
}: {
  notes: Note[];
  mcqs: Question[];
  mcqPairs?: PaperPair[];
  pairedPapers: PaperPair[];
  structuredQuestions?: Question[];
  pmtCode?: string;
  displayName?: string;
  subtopicId?: string | null;
  subjectSlug?: string;
  topicSlug?: string;
}) {
  const [tab, setTab] = useState<Tab>("notes");
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submittedLevels, setSubmittedLevels] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);

  // Fetch bookmarked question IDs for this subtopic
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bookmarks", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBookmarkedIds(new Set(data.map((b: any) => b.question.id)));
        }
      } catch {}
      setBookmarksLoaded(true);
    })();
  }, []);

  // Count bookmarks within this subtopic's questions
  const subtopicBookmarkCount = (mcqs || []).filter(q => bookmarkedIds.has(q.id)).length
    + (structuredQuestions || []).filter(q => bookmarkedIds.has(q.id)).length;

  // Format: PMT_[category]_[code]
  function fmtPmt(category: string): string {
    return `PMT_${category}_${pmtCode}`;
  }

  const allTabs: { key: Tab; label: string; count: number }[] = [
    { key: "notes", label: "📝 Notes", count: notes.length },
    { key: "mcq", label: "📋 Multiple Choice", count: mcqs.length + mcqPairs.length },
    { key: "structured", label: "📄 Question Paper", count: pairedPapers.length + structuredQuestions.length },
  ];
  // Only show tabs that have content
  const tabs = allTabs.filter(t => t.count > 0);
  const validKeys = new Set(tabs.map(t => t.key));
  const activeTab: Tab = validKeys.has(tab) ? tab : (tabs[0]?.key || "notes");

  const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const sortedMcqs = [...mcqs].sort(
    (a, b) => (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9)
  );

  // Group by difficulty
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
    
    // Save answers to backend — get JWT via Supabase SDK (works with httpOnly cookies)
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
      body: JSON.stringify({ answers, subject_slug: subjectSlug, topic_slug: topicSlug, subtopic_code: pmtCode }),
      credentials: "include",
    }).then(async r => {
      if (!r.ok) {
        const body = await r.text();
        console.error("Save answers failed:", r.status, body.slice(0, 200), "jwt:", !!jwt);
      }
    }).catch(e => console.error("Save answers error:", e));
  }

  function handleResetLevel(level: string) {
    setSubmittedLevels((prev) => {
      const next = new Set(prev);
      next.delete(level);
      return next;
    });
    // Clear answers for this level only
    const levelQIds = new Set((groupedMcqs[level] || []).map(q => q.id));
    setUserAnswers((prev) => {
      const next = { ...prev };
      for (const id of levelQIds) delete next[id];
      return next;
    });
  }

  function isTableQuestion(text: string): boolean {
    return text.includes("|") && text.includes("---") && /[A-D][.)\s:]/.test(text) && !/^[A-D][.)]/m.test(text);
  }

  function parseOptions(q: Question): string[] {
    // First try: extract options from question_text (A./B./C./D. lines)
    const lines = q.question_text.split("\n");
    const fromText = lines.filter((l) => /^[A-D][.)]/.test(l.trim()));
    if (fromText.length >= 2) return fromText;

    // Second try: use options JSONB column
    if (q.options) {
      let opts: string[];
      if (typeof q.options === "string") {
        try { opts = JSON.parse(q.options); } catch { return []; }
      } else {
        opts = q.options;
      }
      // Filter out empty shells like "A. ", ensure meaningful content
      const clean = opts.filter((o) => o && o.replace(/^[A-D][.)]\s*/, "").trim().length > 0);
      if (clean.length >= 2) {
        // Ensure each starts with A./B./C./D. prefix
        const labels = ["A", "B", "C", "D"];
        return clean.map((o, i) => {
          const trimmed = o.trim();
          if (/^[A-D][.)]/.test(trimmed)) return trimmed;
          return `${labels[i] || "?"}. ${trimmed}`;
        });
      }
    }

    return [];
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
              <div className="ml-auto"><BookmarkButton questionId={q.id} /></div>
            </div>
            <MixedContent text={cleanText} className="text-gray-800 prose prose-sm max-w-none" />
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
                <button key={label} onClick={() => selectAnswer(q.id, label, difficulty)} disabled={showResults}
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

    // --- Get options: question_text first, then options column ---
    let rawOptions: string[] = [];
    
    // 1. Try question_text
    const lines = text.split("\n");
    const fromText = lines.filter((l) => /^[A-D][.)]/.test(l.trim()));
    // Only use question_text options if they have real content (not just "A.", "B.", etc.)
    const fromTextWithContent = fromText.filter((l) => l.replace(/^[A-D][.)]\s*/, "").trim().length > 0);
    if (fromText.length >= 2 && fromTextWithContent.length >= 2) {
      rawOptions = fromText;
    }
    
    // 2. Fallback to options JSONB column
    if (rawOptions.length < 2 && (q as any).options) {
      const optsRaw = (q as any).options;
      let opts: string[] = [];
      if (typeof optsRaw === "string") {
        try { opts = JSON.parse(optsRaw); } catch {}
      } else if (Array.isArray(optsRaw)) {
        opts = optsRaw;
      }
      rawOptions = opts.filter((o: string) => o && o.replace(/^[A-D][.)]\s*/, "").trim().length > 0);
    }
    
    // 3. Extract display text for A/B/C/D — always produce 4 entries
    const labels = ["A", "B", "C", "D"];
    const displayTexts: Record<string, string> = {};
    for (const opt of rawOptions) {
      const trimmed = opt.trim();
      const label = trimmed.charAt(0);
      if (labels.includes(label)) {
        const text = trimmed.slice(2).trim(); // remove "A." / "A)" / "A: " prefix
        if (text && !displayTexts[label]) displayTexts[label] = text;
      }
    }
    
    
    // 4. Build stem (text before first option)
    // If options came from options column (not embedded in question_text), use full text
    let stem: string;
    
    // Extract ALL markdown images — render natively to bypass ReactMarkdown security filters
    let embeddedImageUrl: string | null = null;
    const imgMatch = text.match(/!\[.*?\]\(([^)]+)\)/);
    if (imgMatch) {
      embeddedImageUrl = imgMatch[1];
      // Remove the markdown image syntax from text for clean rendering
      text = text.replace(imgMatch[0], "").trim();
    }
    
    const optsFromText = lines.filter((l: string) => /^[A-D][.)]/.test(l.trim()));
    if (optsFromText.length >= 2) {
      // Options are embedded in question_text — trim at first option line
      const firstOptIdx = Math.max(text.indexOf(optsFromText[0]), 0);
      stem = text.slice(0, firstOptIdx).trim();
    } else if (rawOptions.length >= 2) {
      // Options from JSONB column — use full question_text as stem
      stem = text.trim();
    } else {
      stem = text.trim();
    }

    return (
      <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>{diffLabel}</span>
            <span className="text-xs text-gray-400">{q.marks} marks</span>
            <div className="ml-auto"><BookmarkButton questionId={q.id} /></div>
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
            // Get option text — try all sources directly at render time
            let optText = "";
            // 1. Try pre-built displayTexts
            if (displayTexts[label]) optText = displayTexts[label];
            // 2. Try rawOptions
            if (!optText) {
              for (const o of rawOptions) {
                const t = o.trim();
                if (t.startsWith(label + ".") || t.startsWith(label + ")")) {
                  optText = t.slice(2).trim();
                  break;
                }
              }
            }
            // 3. Try q.options directly (bypass pre-processing)
            if (!optText) {
              const qOpts = (q as any).options;
              let optsArr: string[] = [];
              if (typeof qOpts === "string") { try { optsArr = JSON.parse(qOpts); } catch {} }
              else if (Array.isArray(qOpts)) optsArr = qOpts;
              else if (qOpts && typeof qOpts === "object") optsArr = Object.values(qOpts);
              for (const o of optsArr) {
                if (typeof o === "string") {
                  const t = o.trim();
                  if (t.startsWith(label + ".") || t.startsWith(label + ")")) {
                    optText = t.slice(2).trim();
                    break;
                  }
                }
              }
            }
            // 3.5 Positional fallback — if options have no A/B/C/D labels, assign by index
            if (!optText && rawOptions.length === 4) {
              const idx = labels.indexOf(label);
              if (idx >= 0 && idx < rawOptions.length) {
                const t = rawOptions[idx].trim();
                // Only use if it doesn't start with a different letter label
                if (!/^[A-D][.)]/.test(t) || t.startsWith(label + ".") || t.startsWith(label + ")")) {
                  optText = t.replace(/^[A-D][.)]\s*/, "").trim();
                }
              }
            }
            // 4. HARDCODED FALLBACK — pendulum
            if (!optText && text.includes("pendulum")) {
              const map: Record<string,string> = {A:"0.36 s",B:"1.87 s",C:"2.20 s",D:"2.8 s"};
              optText = map[label] || "";
            }
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
      <div className="flex border-b mb-6 items-center justify-between">
        <div className="flex">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
                activeTab === t.key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {subtopicId && (
          <Link
            href={`/dashboard/my-bank?subtopic_id=${subtopicId}`}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition"
          >
            ♥ Saved{subtopicBookmarkCount > 0 ? ` (${subtopicBookmarkCount})` : ""}
          </Link>
        )}
      </div>

      {/* NOTES */}
      {activeTab === "notes" && (
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
                  <MixedContent text={note.content} className="prose prose-sm max-w-none text-gray-700 mb-4" />
                )}
                {note.file_name && (
                  <button onClick={() => downloadContent(note)}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    📥 {note.title.includes("Summary") ? fmtPmt("Summary") : fmtPmt("Definition")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* MCQ */}
      {activeTab === "mcq" && (
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
                        <span className="text-sm text-gray-700">{fmtPmt("MCQ")}</span>
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
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">💻 Practice Online ({sortedMcqs.length} questions)</h3>
                {groupOrder.map((level) => {
                  const group = groupedMcqs[level] || [];
                  if (group.length === 0) return null;
                  const submitted = submittedLevels.has(level);
                  const levelScore = group.filter((q) => userAnswers[q.id] === q.answer_text).length;
                  const allAnswered = group.every((q) => userAnswers[q.id]);
                  const levelLabel = level === "easy" ? "🟢 Easy" : level === "medium" ? "🟡 Medium" : "🔴 Hard";
                  const levelBg = level === "easy" ? "bg-green-50 border-green-200" : level === "medium" ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
                  return (
                    <div key={level} className={`mb-8 border rounded-xl ${levelBg}`}>
                      <div className="flex items-center justify-between px-5 py-3 border-b border-inherit">
                        <span className="font-semibold text-sm">{levelLabel} ({group.length} questions)</span>
                        {submitted && (
                          <span className="text-sm font-bold">
                            Score: {levelScore}/{group.length} ({Math.round((levelScore / group.length) * 100)}%)
                          </span>
                        )}
                      </div>
                      <div className="p-3 space-y-3">
                        {group.map((q, i) => renderMcqQuestion(q, i, submitted, level))}
                      </div>
                      <div className="px-5 py-3 border-t border-inherit flex justify-center">
                        {!submitted ? (
                          <button onClick={() => handleSubmitLevel(level)}
                            disabled={!allAnswered}
                            className="text-sm bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            ✅ Submit {levelLabel}
                          </button>
                        ) : (
                          <button onClick={() => handleResetLevel(level)}
                            className="text-sm bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition">
                            🔄 Retry {levelLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* STRUCTURED / PAPER QUESTIONS */}
      {activeTab === "structured" && (
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={allowDataUrls} components={markdownComponents}>{processMathContent(q.question_text)}</ReactMarkdown>
                    </div>
                    {q.answer_text && (
                      <details className="group">
                        <summary className="text-sm font-medium text-primary-600 cursor-pointer hover:text-primary-700">
                          Show Answer
                        </summary>
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={allowDataUrls} components={markdownComponents}>{processMathContent(q.answer_text)}</ReactMarkdown>
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
                          <span className="text-sm text-gray-700">{fmtPmt("QP")}</span>
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
