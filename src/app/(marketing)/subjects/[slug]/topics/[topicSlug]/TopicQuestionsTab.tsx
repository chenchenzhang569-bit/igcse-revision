"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
);

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

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function TopicQuestionsTab({ topicId }: { topicId: string }) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDifficulty, setActiveDifficulty] = useState<string>("easy");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [scores, setScores] = useState<Record<string, { correct: number; total: number }>>({
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  });

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

  const difficulties = (["easy", "medium", "hard"] as const).filter(
    (d) => byDifficulty[d].length > 0
  );

  const currentQs = byDifficulty[activeDifficulty] || [];
  const q = currentQs[currentIdx];
  if (!q) {
    // All questions done for this difficulty
    return (
      <div className="mt-6">
        <DifficultyTabs
          difficulties={difficulties}
          active={activeDifficulty}
          scores={scores}
          byDifficulty={byDifficulty}
          onChange={setActiveDifficulty}
        />
        <div className="bg-white border rounded-xl p-8 text-center mt-4">
          <span className="text-5xl">🎉</span>
          <h3 className="text-lg font-bold mt-3 text-primary-900">
            {activeDifficulty.charAt(0).toUpperCase() + activeDifficulty.slice(1)} Complete!
          </h3>
          <p className="text-gray-500 mt-1">
            {scores[activeDifficulty].correct}/{scores[activeDifficulty].total} correct
          </p>
          <button
            onClick={() => { setCurrentIdx(0); setShowResult(false); setUserAnswer(""); }}
            className="mt-4 bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isMcq = q.question_type === "multiple_choice" || q.question_text.includes("\nA) ");
  const { stem, options } = parseQuestion(q.question_text);

  const handleSubmit = () => {
    let correct: boolean;
    if (isMcq) {
      correct = userAnswer === q.answer_text?.trim().charAt(0);
    } else {
      // Compare normalized answers
      const userNorm = normalizeAnswer(userAnswer);
      const correctNorm = normalizeAnswer(q.answer_text);
      correct = userNorm === correctNorm || userNorm.includes(correctNorm) || correctNorm.includes(userNorm);
    }
    setIsCorrect(correct);
    setShowResult(true);
    setScores((prev) => ({
      ...prev,
      [activeDifficulty]: {
        correct: prev[activeDifficulty].correct + (correct ? 1 : 0),
        total: prev[activeDifficulty].total + 1,
      },
    }));
  };

  const handleNext = () => {
    if (currentIdx < currentQs.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setUserAnswer("");
      setShowResult(false);
    }
    // else: show completion screen (handled by q being undefined)
  };

  return (
    <div className="mt-6 space-y-4">
      <DifficultyTabs
        difficulties={difficulties}
        active={activeDifficulty}
        scores={scores}
        byDifficulty={byDifficulty}
        onChange={(d) => { setActiveDifficulty(d); setCurrentIdx(0); setUserAnswer(""); setShowResult(false); }}
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

      {/* Question card */}
      <div className="bg-white border rounded-xl p-5 sm:p-6">
        <div className="prose prose-sm max-w-none text-gray-800 mb-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{stem}</ReactMarkdown>
        </div>

        {isMcq ? (
          /* MCQ: clickable options */
          <div className="space-y-2.5">
            {options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = userAnswer === letter;
              const isCorrectOption = letter === q.answer_text?.trim().charAt(0);
              let bg = "bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50";
              if (showResult && isSelected && isCorrectOption) bg = "bg-green-50 border-green-400";
              else if (showResult && isSelected && !isCorrectOption) bg = "bg-red-50 border-red-400";
              else if (showResult && isCorrectOption) bg = "bg-green-50 border-green-200";

              return (
                <button
                  key={letter}
                  onClick={() => { if (!showResult) { setUserAnswer(letter); handleSubmit(); } }}
                  disabled={showResult}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${bg} ${showResult ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="font-semibold text-primary-600 mr-2">{letter}.</span>
                  <span className="text-gray-700 text-sm">{opt.replace(/^[A-D]\)\s*/, "")}</span>
                  {showResult && isCorrectOption && <span className="ml-2 text-green-600">✓</span>}
                  {showResult && isSelected && !isCorrectOption && <span className="ml-2 text-red-600">✗</span>}
                </button>
              );
            })}
          </div>
        ) : (
          /* Structured: input field */
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !showResult) handleSubmit(); }}
                placeholder="Type your answer..."
                disabled={showResult}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 disabled:bg-gray-50"
                autoFocus
              />
              {!showResult && (
                <button onClick={handleSubmit}
                  className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
                  Check
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {showResult && (
          <div className={`mt-4 p-4 rounded-lg border text-sm ${
            isCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <p className="font-semibold mb-1">
              {isCorrect ? `✅ Correct! (+${q.marks} mark${q.marks > 1 ? "s" : ""})`
                : `❌ Incorrect. The answer is: ${q.answer_text}`}
            </p>
            {!isCorrect && q.explanation && (
              <div className="prose prose-sm max-w-none mt-2 text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.explanation}</ReactMarkdown>
              </div>
            )}
            {isCorrect && q.explanation && (
              <details className="mt-2">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Show solution</summary>
                <div className="prose prose-sm max-w-none mt-1 text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.explanation}</ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        )}

        {showResult && (
          <div className="mt-4 flex justify-end">
            <button onClick={handleNext}
              className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
              {currentIdx < currentQs.length - 1 ? "Next →" : "Finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DifficultyTabs({
  difficulties, active, scores, byDifficulty, onChange,
}: {
  difficulties: string[];
  active: string;
  scores: Record<string, { correct: number; total: number }>;
  byDifficulty: Record<string, Question[]>;
  onChange: (d: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {difficulties.map((d) => {
        const cfg = DIFFICULTY_CONFIG[d] || DIFFICULTY_CONFIG.medium;
        const s = scores[d];
        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              active === d
                ? `${cfg.color} border-current`
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {cfg.icon} {cfg.label}
            <span className="ml-1.5 text-xs opacity-70">({byDifficulty[d]?.length || 0})</span>
            {pct !== null && (
              <span className={`ml-2 text-xs font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {pct}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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
