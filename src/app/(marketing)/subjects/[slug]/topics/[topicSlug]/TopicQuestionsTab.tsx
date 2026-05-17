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

function parseStemAndOptions(text: string): { stem: string; options: string[]; correct: string; explanation: string } {
  // Extract answer from end: "...\n\nA) ... \nB) ... \nC) ... \nD) ..."
  const lines = text.split("\n");
  const optionLines: { letter: string; text: string }[] = [];
  let stemEnd = lines.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^([A-D])\)?\s+(.+)/);
    if (m) {
      optionLines.unshift({ letter: m[1], text: m[2].trim() });
      stemEnd = i;
    } else if (optionLines.length > 0) {
      break;
    }
  }

  const stem = lines.slice(0, stemEnd).join("\n").trim();
  const options = optionLines.map((o) => `${o.letter}) ${o.text}`);
  return { stem, options, correct: "", explanation: "" };
}

export function TopicQuestionsTab({ topicId }: { topicId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .eq("topic_id", topicId)
          .order("sort_order");

        if (error) throw error;
        setQuestions(data || []);
      } catch (e) {
        console.error("Failed to load questions:", e);
      }
      setLoading(false);
    })();
  }, [topicId]);

  if (loading) {
    return <p className="text-gray-400 py-8 text-center">Loading questions...</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500 mt-6">
        <p className="font-medium">No questions yet</p>
        <p className="text-sm mt-1">Questions are being prepared for this topic</p>
      </div>
    );
  }

  if (finished) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="mt-6 bg-white border rounded-xl p-8 text-center space-y-4">
        <span className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📚"}</span>
        <h2 className="text-2xl font-bold text-primary-900">Quiz Complete!</h2>
        <p className="text-gray-600">
          You scored <span className="font-bold text-primary-600">{score.correct}</span> out of{" "}
          <span className="font-bold">{score.total}</span> ({pct}%)
        </p>
        <button
          onClick={() => {
            setCurrentIdx(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
            setScore({ correct: 0, total: 0 });
            setFinished(false);
          }}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const { stem, options } = parseStemAndOptions(q.question_text);
  const correctAnswer = q.correct_answer || q.answer_text?.trim().charAt(0) || "";
  const explanation = q.explanation || "";

  const handleSelect = (letter: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(letter);
    setShowExplanation(true);
    setScore((prev) => ({
      correct: prev.correct + (letter === correctAnswer ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
    }
  };

  // Find HTML tables in stem and extract them for separate rendering
  const tableMatch = stem.match(/<table\b[^>]*>[\s\S]*?<\/table>/i);
  const tableHtml = tableMatch ? tableMatch[0] : null;
  const stemWithoutTable = tableMatch ? stem.replace(tableMatch[0], "") : stem;

  return (
    <div className="mt-6 space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Question {currentIdx + 1} of {questions.length}
        </span>
        <span>
          Score: {score.correct}/{score.total}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white border rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            q.difficulty === "easy" ? "bg-green-50 text-green-600" :
            q.difficulty === "hard" ? "bg-red-50 text-red-600" :
            "bg-yellow-50 text-yellow-600"
          }`}>
            {q.difficulty}
          </span>
          <span className="text-xs text-gray-400">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{stemWithoutTable}</ReactMarkdown>
        </div>

        {/* Render HTML table with dangerouslySetInnerHTML */}
        {tableHtml && (
          <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: tableHtml }} />
        )}

        {/* Options */}
        <div className="mt-5 space-y-2.5">
          {options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === letter;
            const isCorrect = letter === correctAnswer;
            let bg = "bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50";
            if (showExplanation && isSelected && isCorrect) bg = "bg-green-50 border-green-400";
            else if (showExplanation && isSelected && !isCorrect) bg = "bg-red-50 border-red-400";
            else if (showExplanation && isCorrect) bg = "bg-green-50 border-green-200";

            // Strip the option letter prefix for display (A) ...)
            const displayText = opt.replace(/^[A-D]\)\s*/, "");

            return (
              <button
                key={letter}
                onClick={() => handleSelect(letter)}
                disabled={!!selectedAnswer}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${bg} ${
                  selectedAnswer ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <span className="font-semibold text-primary-600 mr-2">{letter}.</span>
                <span className="text-gray-700 text-sm">{displayText}</span>
                {showExplanation && isCorrect && <span className="ml-2 text-green-600">✓</span>}
                {showExplanation && isSelected && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`mt-4 p-4 rounded-lg text-sm ${
            selectedAnswer === correctAnswer
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            <p className="font-semibold mb-1">
              {selectedAnswer === correctAnswer ? "✅ Correct!" : `❌ Incorrect. The answer is ${correctAnswer}.`}
            </p>
            {explanation && (
              <div className="prose prose-sm max-w-none mt-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        {showExplanation && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleNext}
              className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              {currentIdx < questions.length - 1 ? "Next →" : "Finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
