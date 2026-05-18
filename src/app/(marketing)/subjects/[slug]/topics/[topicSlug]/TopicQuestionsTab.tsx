"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

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
    return qs.every((qq) => (answers[qq.id] || "").trim());
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
  const userAns = answers[q.id] || "";
  const isGraded = graded[q.id] || false;
  const isCorrect = correctMap[q.id] || false;

  const handleCheck = () => {
    if (!userAns.trim()) return;
    handleGradeOne(q.id, q, userAns);
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
        <div className="prose prose-sm max-w-none text-gray-800 mb-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{stem}</ReactMarkdown>
        </div>

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
        ) : (
          <div>
            <MathInput
              value={userAns}
              onChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
              onEnter={handleCheck}
              disabled={isGraded}
            />
          </div>
        )}

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
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{q.explanation}</ReactMarkdown>
              </div>
            )}
            {isCorrect && q.explanation && (
              <details className="mt-2">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Show solution</summary>
                <div className="prose prose-sm max-w-none mt-1 text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{q.explanation}</ReactMarkdown>
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
