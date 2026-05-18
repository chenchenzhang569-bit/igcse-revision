"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import katex from "katex";
import "katex/dist/katex.min.css";
import { fixMathNotation } from "@/lib/math";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

interface Question {
  id: string;
  question_text: string;
  answer_text: string;
  explanation: string | null;
  difficulty: string;
  question_type: string;
  marks: number;
  options: string[] | null;
  correct_answer: string | null;
  sort_order: number;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  easy: { color: "bg-green-50 text-green-700 border-green-200", label: "Easy", icon: "🟢" },
  medium: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Medium", icon: "🟡" },
  hard: { color: "bg-red-50 text-red-700 border-red-200", label: "Hard", icon: "🔴" },
};

const MATH_SYMBOLS = [
  "√", "π", "°", "²", "³", "×", "÷", "±",
  "≤", "≥", "≠", "≈", "∞", "∠", "→", "%",
  "½", "¼", "¾", "⁻¹", "Δ", "θ", "Σ", "∫",
];

const DIFF_ORDER = ["easy", "medium", "hard"] as const;

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function markdownify(text: string): string {
  // Convert <img> HTML tags to markdown ![]() syntax so ReactMarkdown renders them
  return text.replace(/<img\s+src="([^"]*)"(?:\s+alt="([^"]*)")?\s*\/?>/g, (_, src, alt) => {
    return `![${alt || "diagram"}](${src})`;
  });
}

// Render mixed content: markdown + KaTeX math
function MixedContent({ text }: { text: string }) {
  const parts = useMemo(() => {
    const result: { type: "md" | "math"; content: string; display?: boolean }[] = [];
    // Fix SME math notation first (^2^ → <sup>2</sup>)
    const fixedText = fixMathNotation(text);
    // Match $$...$$ or $...$
    const regex = /\$\$\s*([\s\S]*?)\s*\$\$|\$([^$\n]+?)\$/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(fixedText)) !== null) {
      if (m.index > lastIdx) {
        result.push({ type: "md", content: fixedText.slice(lastIdx, m.index) });
      }
      const isDisplay = !!m[1];
      const mathContent = (m[1] || m[2]).trim();
      try {
        const html = katex.renderToString(mathContent, { displayMode: isDisplay, throwOnError: false });
        result.push({ type: "math", content: html, display: isDisplay });
      } catch {
        result.push({ type: "md", content: m[0] });
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < fixedText.length) {
      result.push({ type: "md", content: fixedText.slice(lastIdx) });
    }
    return result;
  }, [text]);

  return (
    <>
      {parts.map((part, i) =>
        part.type === "math" ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: part.content }} />
        ) : (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={(url) => url}>
            {part.content}
          </ReactMarkdown>
        )
      )}
    </>
  );
}

// Legacy: kept for backward compat
function renderMath(text: string): string {
  let result = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }); }
    catch { return `$$${math}$$`; }
  });
  result = result.replace(/\$(.+?)\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false }); }
    catch { return `$${math}$`; }
  });
  return result;
}

// ─── Table Detection & Rendering ───
function findTables(stem: string): { start: number; end: number; html: string }[] {
  const tables: { start: number; end: number; html: string }[] = [];
  const htmlTableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlTableRegex.exec(stem)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, html: m[0] });
  }
  // Also detect markdown pipe tables
  const lines = stem.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes("|") && /^\|[\s\-:\|]+\|$/.test(lines[i + 1]?.trim() || "")) {
      let end = i + 2;
      while (end < lines.length && lines[end].includes("|")) end++;
      const mdLines = lines.slice(i, end);
      const html = mdTableToHtml(mdLines);
      if (html && !tables.some(t => t.start <= stem.indexOf(mdLines[0]))) {
        tables.push({ start: stem.indexOf(mdLines[0]), end: stem.indexOf(mdLines[mdLines.length - 1]) + mdLines[mdLines.length - 1].length, html });
      }
      i = end;
    }
  }
  tables.sort((a, b) => a.start - b.start);
  return tables;
}

function mdTableToHtml(lines: string[]): string {
  if (lines.length < 2) return "";
  // Parse headers
  let headers = lines[0].split("|").slice(1, -1).map(h => h.trim());
  let bodyStart = 2;
  // If headers are all empty, use first data row as headers
  if (headers.every(h => h === "") && lines.length > 2) {
    headers = lines[2].split("|").slice(1, -1).map(h => h.trim());
    bodyStart = 3;
  }
  let html = '<table class="w-full text-sm border-collapse border border-gray-300 mb-4"><thead><tr>';
  for (const h of headers) {
    html += `<th class="border border-gray-300 px-3 py-1.5 bg-gray-100 text-left font-semibold">${h}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let i = bodyStart; i < lines.length; i++) {
    const cells = lines[i].split("|").slice(1, -1).map(c => c.trim());
    if (cells.length === 0) continue;
    html += '<tr>';
    for (const c of cells) {
      html += `<td class="border border-gray-300 px-3 py-1.5">${c}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderStemWithTables(stem: string): string {
  const tables = findTables(stem);
  if (tables.length === 0) return stem;
  let result = "";
  let lastEnd = 0;
  for (const t of tables) {
    result += stem.slice(lastEnd, t.start) + "\n" + t.html + "\n";
    lastEnd = t.end;
  }
  result += stem.slice(lastEnd);
  return result;
}

// ─── Sub-part parsing ───
interface SubPart { label: string; text: string; }
function parseSubParts(stem: string): SubPart[] {
  // Match **(a)** or (a) patterns
  const parts: SubPart[] = [];
  const regex = /\*\*\(([a-z]+)\)\*\*\s*/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(stem)) !== null) {
    if (parts.length > 0) {
      parts[parts.length - 1].text = stem.slice(lastIdx, m.index).trim();
    }
    parts.push({ label: m[1], text: "" });
    lastIdx = m.index + m[0].length;
  }
  if (parts.length > 0) {
    parts[parts.length - 1].text = stem.slice(lastIdx).trim();
  }
  return parts;
}

export function TopicQuestionsTab({ topicId }: { topicId: string }) {
  const supabase = useMemo(() => createClient(SUPABASE_URL, SUPABASE_KEY), []);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDifficulty, setActiveDifficulty] = useState<string>("easy");
  const storageKey = `topic-answers-${topicId}`;

  // answers[questionId] = user's answer string
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // graded[questionId] = true if already graded
  const [graded, setGraded] = useState<Record<string, boolean>>({});
  // correct[questionId] = whether user's answer was correct
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  // submitted groups
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);

  // Load saved answers from localStorage (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.graded) setGraded(parsed.graded);
        if (parsed.correctMap) setCorrectMap(parsed.correctMap);
        if (parsed.submitted) setSubmitted(new Set(parsed.submitted));
        if (parsed.activeDifficulty) setActiveDifficulty(parsed.activeDifficulty);
      }
    } catch {}
  }, [storageKey]);

  // Save to localStorage on changes (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        answers, graded, correctMap,
        submitted: Array.from(submitted),
        activeDifficulty,
      }));
    } catch {}
  }, [answers, graded, correctMap, submitted, activeDifficulty, storageKey]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .eq("topic_id", topicId)
          .order("sort_order");
        if (error) throw error;
        setAllQuestions(data || []);
      } catch (e) {
        console.error("Failed to load questions:", e);
      }
      setLoading(false);
    })();
  }, [topicId]);

  if (loading) return <p className="text-gray-400 py-8 text-center">Loading questions...</p>;
  if (allQuestions.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500 mt-6">
        <p className="font-medium">No questions yet</p>
        <p className="text-sm mt-1">Questions are being prepared for this topic</p>
      </div>
    );
  }

  // Group by difficulty
  const byDifficulty: Record<string, Question[]> = { easy: [], medium: [], hard: [] };
  for (const q of allQuestions) {
    const d = q.difficulty || "medium";
    if (byDifficulty[d]) byDifficulty[d].push(q);
  }

  const difficulties = DIFF_ORDER.filter((d) => byDifficulty[d].length > 0);

  // Find highest unlocked difficulty (last completed + 1)
  const unlockedDifficulty = (() => {
    for (let i = difficulties.length - 1; i >= 0; i--) {
      if (submitted.has(difficulties[i])) {
        return i < difficulties.length - 1 ? difficulties[i + 1] : null;
      }
    }
    return difficulties[0]; // none submitted → first is unlocked
  })();

  const currentQs = byDifficulty[activeDifficulty] || [];
  const q = currentQs[currentIdx];

  // Compute scores
  const scores: Record<string, { correct: number; total: number }> = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
  for (const qq of allQuestions) {
    const d = qq.difficulty || "medium";
    if (graded[qq.id]) {
      scores[d].total++;
      if (correctMap[qq.id]) scores[d].correct++;
    }
  }

  const handleRetry = (diff: string) => {
    // Reset answers & grades for this difficulty
    const qs = byDifficulty[diff] || [];
    const newAnswers = { ...answers };
    const newGraded = { ...graded };
    const newCorrect = { ...correctMap };
    for (const qq of qs) {
      delete newAnswers[qq.id];
      delete newGraded[qq.id];
      delete newCorrect[qq.id];
      // Also clear sub-part answers
      const sp = parseSubParts(parseQuestion(qq.question_text).stem);
      for (const s of sp) {
        delete newAnswers[`${qq.id}-${s.label}`];
      }
    }
    setAnswers(newAnswers);
    setGraded(newGraded);
    setCorrectMap(newCorrect);
    setSubmitted((prev) => { const s = new Set(prev); s.delete(diff); return s; });
    setActiveDifficulty(diff);
    setCurrentIdx(0);
  };

  const handleClearAll = () => {
    setAnswers({});
    setGraded({});
    setCorrectMap({});
    setSubmitted(new Set());
    setActiveDifficulty(difficulties[0] || "easy");
    setCurrentIdx(0);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const handleGradeOne = (qId: string, q: Question, userAns: string) => {
    if (graded[qId]) return; // already graded
    const isMcq = q.question_type === "multiple_choice" || q.question_text.includes("\nA) ");
    let correct: boolean;
    if (isMcq) {
      correct = userAns === q.answer_text?.trim().charAt(0);
    } else {
      const userNorm = normalizeAnswer(userAns);
      const correctNorm = normalizeAnswer(q.answer_text);
      correct = userNorm === correctNorm || userNorm.includes(correctNorm) || correctNorm.includes(userAns);
    }
    setCorrectMap((prev) => ({ ...prev, [qId]: correct }));
    setGraded((prev) => ({ ...prev, [qId]: true }));
  };

  const handleSubmitGroup = () => {
    // Grade all ungraded questions in this difficulty
    const qs = byDifficulty[activeDifficulty] || [];
    for (const qq of qs) {
      const ans = answers[qq.id] || "";
      if (!graded[qq.id] && ans.trim()) {
        handleGradeOne(qq.id, qq, ans);
      }
    }
    setSubmitted((prev) => new Set([...prev, activeDifficulty]));
  };

  const allGradedInGroup = (() => {
    const qs = byDifficulty[activeDifficulty] || [];
    return qs.every((qq) => graded[qq.id]);
  })();

  const allAnsweredInGroup = (() => {
    const qs = byDifficulty[activeDifficulty] || [];
    return qs.every((qq) => {
      const sp = parseSubParts(parseQuestion(qq.question_text).stem);
      if (sp.length > 1) {
        return sp.every(s => (answers[`${qq.id}-${s.label}`] || "").trim());
      }
      return (answers[qq.id] || "").trim();
    });
  })();

  const handleDifficultyChange = (d: string) => {
    if (d === activeDifficulty) return;
    // Only allow switching to unlocked difficulties
    if (difficulties.indexOf(d) <= difficulties.indexOf(unlockedDifficulty || difficulties[difficulties.length - 1])) {
      setActiveDifficulty(d);
      setCurrentIdx(0);
    }
  };

  // Completion screen for a group
  if (!q || submitted.has(activeDifficulty)) {
    const diffQs = byDifficulty[activeDifficulty] || [];
    const s = scores[activeDifficulty];
    return (
      <div className="mt-6">
        <DifficultyTabs
          difficulties={difficulties}
          active={activeDifficulty}
          scores={scores}
          byDifficulty={byDifficulty}
          submitted={submitted}
          unlockedDifficulty={unlockedDifficulty}
          onChange={handleDifficultyChange}
        />
        <div className="bg-white border rounded-xl p-8 text-center mt-4">
          <span className="text-5xl">🎉</span>
          <h3 className="text-lg font-bold mt-3 text-primary-900">
            {activeDifficulty.charAt(0).toUpperCase() + activeDifficulty.slice(1)} Complete!
          </h3>
          {s.total > 0 ? (
            <p className="text-gray-500 mt-1">
              {s.correct}/{s.total} correct ({Math.round((s.correct / s.total) * 100)}%)
            </p>
          ) : (
            <p className="text-gray-400 mt-1 text-sm">No questions graded</p>
          )}
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={() => handleRetry(activeDifficulty)}
              className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 text-sm">
              Retry
            </button>
            {difficulties.indexOf(activeDifficulty) < difficulties.length - 1 && (
              <button onClick={() => handleDifficultyChange(difficulties[difficulties.indexOf(activeDifficulty) + 1])}
                className="bg-white border border-primary-300 text-primary-600 px-5 py-2 rounded-lg font-medium hover:bg-primary-50 text-sm">
                Next: {DIFFICULTY_CONFIG[difficulties[difficulties.indexOf(activeDifficulty) + 1]]?.label} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isMcq = q.question_type === "multiple_choice" || q.question_text.includes("\nA) ");
  const { stem, options } = parseQuestion(q.question_text);
  const subParts = parseSubParts(stem);
  const hasSubParts = subParts.length > 1;
  // For multi-part: combine sub-answers; for single: use direct answer
  const userAns = hasSubParts
    ? subParts.map(sp => answers[`${q.id}-${sp.label}`] || "").join(" ").trim()
    : (answers[q.id] || "");
  const isGraded = graded[q.id] || false;
  const isCorrect = correctMap[q.id] || false;

  const handleCheck = () => {
    const effectiveAns = hasSubParts
      ? subParts.map(sp => answers[`${q.id}-${sp.label}`] || "").join(" ").trim()
      : userAns;
    if (!effectiveAns) return;
    handleGradeOne(q.id, q, effectiveAns);
  };

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, currentQs.length - 1));
    setCurrentIdx(clamped);
  };

  const isLocked = (d: string) => {
    const dIdx = difficulties.indexOf(d);
    const unlockedIdx = difficulties.indexOf(unlockedDifficulty || "");
    return dIdx > unlockedIdx;
  };

  return (
    <div className="mt-6 space-y-4">
      <DifficultyTabs
        difficulties={difficulties}
        active={activeDifficulty}
        scores={scores}
        byDifficulty={byDifficulty}
        submitted={submitted}
        unlockedDifficulty={unlockedDifficulty}
        onChange={handleDifficultyChange}
      />

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Question {currentIdx + 1} of {currentQs.length}</span>
        <span>{q.difficulty} · {q.marks} mark{q.marks > 1 ? "s" : ""}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / currentQs.length) * 100}%` }} />
      </div>

      {/* Question navigator dots */}
      <div className="flex gap-1.5 flex-wrap">
        {currentQs.map((qq, i) => {
          const a = (answers[qq.id] || "").trim();
          const g = graded[qq.id];
          const c = correctMap[qq.id];
          let bg = "bg-gray-200";
          if (g && c) bg = "bg-green-400";
          else if (g && !c) bg = "bg-red-400";
          else if (a) bg = "bg-primary-300";
          if (i === currentIdx) bg = g && c ? "bg-green-600" : g && !c ? "bg-red-600" : "bg-primary-600";
          return (
            <button
              key={qq.id}
              onClick={() => goTo(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium text-white ${bg} transition hover:opacity-80`}
              title={`Q${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      <div className="bg-white border rounded-xl p-5 sm:p-6">
        {!isMcq && (() => {
          const subParts = parseSubParts(stem);
          const hasSubParts = subParts.length > 1;
          if (hasSubParts) {
            const firstMarkerIdx = stem.indexOf(`**(${subParts[0].label})**`);
            const introText = firstMarkerIdx > 0 ? stem.slice(0, firstMarkerIdx).trim() : "";
            return (
              <>
                {introText && (
                  <div className="prose prose-sm max-w-none text-gray-800 mb-4">
                    <MixedContent text={introText} />
                  </div>
                )}
                <div className="space-y-4">
                  {subParts.map((sp) => {
                    const subKey = `${q.id}-${sp.label}`;
                    const subAns = answers[subKey] || "";
                    return (
                      <div key={sp.label} className="border border-gray-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-primary-700 mb-2">({sp.label})</p>
                        {sp.text && (
                          <div className="prose prose-sm max-w-none text-gray-700 mb-2">
                            <MixedContent text={sp.text} />
                          </div>
                        )}
                        <MathInput
                          value={subAns}
                          onChange={(v) => setAnswers((p) => ({ ...p, [subKey]: v }))}
                          onEnter={handleCheck}
                          disabled={isGraded}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            );
          }
          // Single part: show stem + single input
          return (
            <>
              <div className="prose prose-sm max-w-none text-gray-800 mb-5">
                <MixedContent text={renderStemWithTables(markdownify(stem))} />
              </div>
              <MathInput
                value={userAns}
                onChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
                onEnter={handleCheck}
                disabled={isGraded}
              />
            </>
          );
        })()}

        {isMcq ? (
          <div className="space-y-2.5">
            {options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = userAns === letter;
              const isCorrectOption = letter === q.answer_text?.trim().charAt(0);
              let bg = "bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50";
              if (isGraded && isSelected && isCorrectOption) bg = "bg-green-50 border-green-400";
              else if (isGraded && isSelected && !isCorrectOption) bg = "bg-red-50 border-red-400";
              else if (isGraded && isCorrectOption) bg = "bg-green-50 border-green-200";
              else if (isSelected) bg = "bg-primary-50 border-primary-300";

              return (
                <button
                  key={letter}
                  onClick={() => { if (!isGraded) { setAnswers((p) => ({ ...p, [q.id]: letter })); } }}
                  disabled={isGraded}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${bg} ${isGraded ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="font-semibold text-primary-600 mr-2">{letter}.</span>
                  <span className="text-gray-700 text-sm">{opt.replace(/^[A-D]\)\s*/, "")}</span>
                  {isGraded && isCorrectOption && <span className="ml-2 text-green-600">✓</span>}
                  {isGraded && isSelected && !isCorrectOption && <span className="ml-2 text-red-600">✗</span>}
                </button>
              );
            })}
          </div>
        ) : null}}

        {/* Grade result for this question */}
        {isGraded && (
          <div className={`mt-4 p-4 rounded-lg border text-sm ${
            isCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <p className="font-semibold mb-1">
              {isCorrect ? `✅ Correct! (+${q.marks} mark${q.marks > 1 ? "s" : ""})`
                : `❌ Incorrect. The answer is: ${q.answer_text}`}
            </p>
            {!isCorrect && q.explanation && (
              <div className="prose prose-sm max-w-none mt-2 text-gray-700">
                <MixedContent text={markdownify(q.explanation)} />
              </div>
            )}
            {isCorrect && q.explanation && (
              <details className="mt-2">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Show solution</summary>
                <div className="prose prose-sm max-w-none mt-1 text-gray-700">
                  <MixedContent text={markdownify(q.explanation)} />
                </div>
              </details>
            )}
          </div>
        )}

        {/* Navigation: Prev / Check / Next */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>

          <div className="flex gap-2">
            {!isGraded && userAns.trim() && (
              <button onClick={handleCheck}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
                Check
              </button>
            )}
            {allAnsweredInGroup && !submitted.has(activeDifficulty) && (
              <button onClick={handleSubmitGroup}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-emerald-700 transition text-sm">
                Submit Group →
              </button>
            )}
          </div>

          <button
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx >= currentQs.length - 1}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Clear saved progress */}
      <div className="text-right">
        <button onClick={handleClearAll}
          className="text-xs text-gray-400 hover:text-red-500 transition">
          Clear all progress
        </button>
      </div>
    </div>
  );
}

/* ─── Math Symbol Input ─── */
function MathInput({
  value, onChange, onEnter, disabled,
}: {
  value: string; onChange: (v: string) => void; onEnter: () => void; disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertSymbol = (sym: string) => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) { onChange(value + sym); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + sym + value.slice(end);
    onChange(newVal);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !disabled) onEnter(); }}
          placeholder="Type your answer..."
          disabled={disabled}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 disabled:bg-gray-50"
          autoFocus
        />
        {!disabled && (
          <button onClick={onEnter}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
            Check
          </button>
        )}
      </div>
      {/* Symbol buttons */}
      {!disabled && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {MATH_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => insertSymbol(sym)}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 text-gray-600 transition"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Difficulty Tabs ─── */
function DifficultyTabs({
  difficulties, active, scores, byDifficulty, submitted, unlockedDifficulty, onChange,
}: {
  difficulties: string[];
  active: string;
  scores: Record<string, { correct: number; total: number }>;
  byDifficulty: Record<string, Question[]>;
  submitted: Set<string>;
  unlockedDifficulty: string | null;
  onChange: (d: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ flexWrap: "nowrap" }}>
      {difficulties.map((d) => {
        const cfg = DIFFICULTY_CONFIG[d] || DIFFICULTY_CONFIG.medium;
        const s = scores[d];
        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
        const isLocked = difficulties.indexOf(d) > difficulties.indexOf(unlockedDifficulty || "");
        const isDone = submitted.has(d);

        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            disabled={isLocked}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              isDone
                ? "bg-green-50 text-green-700 border-green-300"
                : active === d
                ? `${cfg.color} border-current`
                : isLocked
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {isLocked ? "🔒" : cfg.icon} {cfg.label}
            <span className="ml-1.5 text-xs opacity-70">({byDifficulty[d]?.length || 0})</span>
            {pct !== null && (
              <span className={`ml-2 text-xs font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {pct}%
              </span>
            )}
            {isDone && <span className="ml-1">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Question Parser ─── */
function parseQuestion(text: string): { stem: string; options: string[] } {
  const lines = text.split("\n");
  const optionLines: string[] = [];
  let stemEnd = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[A-D]\)\s+/.test(lines[i])) {
      optionLines.unshift(lines[i]);
      stemEnd = i;
    } else if (optionLines.length > 0) {
      break;
    }
  }
  const stem = lines.slice(0, stemEnd).join("\n").trim();
  return { stem, options: optionLines };
}
