"use client";

// force-redeploy-v15-ocr-handwriting
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useParams } from "next/navigation";
import StructuredQuestion from "@/components/StructuredQuestion";

const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
);

// Parse markdown table to HTML
function mdTableToHtml(md: string): string | null {
  const lines = md.trim().split('\n');
  if (lines.length < 2) return null;
  if (!lines[0].startsWith('|') || !lines[1].match(/^\|[\s\-:|\|]+\|$/)) return null;
  
  let headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
  const align: string[] = [];
  lines[1].split('|').slice(1, -1).forEach(a => {
    const t = a.trim();
    if (t.startsWith(':') && t.endsWith(':')) align.push('center');
    else if (t.endsWith(':')) align.push('right');
    else align.push('left');
  });
  
  // When all headers are empty, use first data row as headers
  let bodyStart = 2;
  if (headers.every(h => h === '') && lines.length > 2) {
    headers = lines[2].split('|').slice(1, -1).map(h => h.trim());
    bodyStart = 3;
  }
  
  let html = '<table class="my-3 w-full text-xs border-collapse" style="table-layout:auto"><thead><tr class="bg-gray-100" style="background:#f3f4f6">';
  headers.forEach((h, i) => {
    html += `<th style="border:1px solid #d1d5db;padding:4px 8px;text-align:${align[i] || 'left'}">${h}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  for (let i = bodyStart; i < lines.length; i++) {
    const cells = lines[i].split('|').slice(1, -1);
    const isOdd = (i - bodyStart) % 2 === 1;
    const bg = isOdd ? '#f9fafb' : '#ffffff';
    html += `<tr style="background:${bg}">`;
    cells.forEach((c) => {
      html += `<td style="border:1px solid #d1d5db;padding:4px 8px">${c.trim()}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

type StemPart = string | { type: "img"; src: string } | { type: "table"; html: string };

function findTables(stem: string): { start: number; end: number; html: string }[] {
  const tables: { start: number; end: number; html: string }[] = [];
  const lines = stem.split('\n');
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|') &&
        i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      const tableLines = [lines[i]];
      let endIdx = i + 1;
      tableLines.push(lines[i + 1]);
      let j = i + 2;
      while (j < lines.length) {
        const t = lines[j].trim();
        if (t.startsWith('|') && t.endsWith('|')) { tableLines.push(lines[j]); endIdx = j + 1; j++; }
        else break;
      }
      const md = tableLines.join('\n');
      const html = mdTableToHtml(md);
      if (html) {
        const start = stem.indexOf(lines[i].trim());
        const end = start + stem.slice(start).split('\n').slice(0, tableLines.length).join('\n').length;
        tables.push({ start, end, html });
      }
      i = endIdx;
    } else { i++; }
  }
  return tables;
}

function parseStem(stem: string): StemPart[] {
  const parts: StemPart[] = [];
  
  // Extract markdown tables first
  const tables = findTables(stem);
  
  // Helper to parse images in a text segment
  function parseImages(text: string) {
    const imgRegex = /!\[.*?\]\(((?:data:image\/|https?:\/\/)[^)]+)\)/g;
    let li = 0;
    let im: RegExpExecArray | null;
    while ((im = imgRegex.exec(text)) !== null) {
      if (im.index > li) parts.push(text.slice(li, im.index));
      parts.push({ type: "img", src: im[1] });
      li = im.index + im[0].length;
    }
    if (li < text.length) parts.push(text.slice(li));
  }
  
  let cursor = 0;
  for (const t of tables) {
    parseImages(stem.slice(cursor, t.start));
    parts.push({ type: "table", html: t.html });
    cursor = t.end;
  }
  parseImages(stem.slice(cursor));
  
  return parts.length > 0 ? parts : [stem];
}

const SUBJECT_MAP: Record<string, string> = {
  "caie-physics-0625": "Physics",
  "caie-chemistry-0620": "Chemistry",
  "caie-biology-0610": "Biology",
  "caie-mathematics-0580": "Mathematics",
};

type Question = {
  id: string;
  question_order: number;
  question_type: string;
  difficulty: string;
  stem: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  marks: number;
};

type Paper = {
  id: string;
  paper_type: string;
  paper_number: string;
  minutes: number;
  total_marks: number;
};

export default function MockExamPaperPage() {
  const params = useParams();
  const subjectSlug = params.subjectSlug as string;
  const paperSlug = params.paperSlug as string;
  const subjectName = SUBJECT_MAP[subjectSlug] || subjectSlug;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: papers } = await supabase
        .from("mock_exam_papers")
        .select("id, paper_type, paper_number, minutes, total_marks")
        .eq("slug", paperSlug)
        .single();

      if (papers) {
        setPaper(papers);
        const { data: qs } = await supabase
          .from("mock_exam_questions")
          .select("*")
          .eq("paper_id", papers.id)
          .order("question_order");

        if (qs) {
          const parsed = qs.map((q: any) => ({
            ...q,
            options: q.options ? (typeof q.options === "string" ? JSON.parse(q.options) : q.options) : null,
          }));
          setQuestions(parsed);
        }
      }
      setLoading(false);
    }
    load();
  }, [paperSlug]);

  function startTimer() {
    if (!paper) return;
    setTimerStarted(true);
    setTimeLeft(paper.minutes * 60);
  }

  useEffect(() => {
    if (!timerStarted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerStarted, timeLeft]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function selectAnswer(qId: string, answer: string) {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: answer }));
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleReset() {
    setUserAnswers({});
    setSubmitted(false);
    setTimerStarted(false);
    setTimeLeft(0);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!paper || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Paper not found</p>
        <Link href={`/mock-exams/${subjectSlug}`} className="text-primary-600 mt-4 inline-block font-semibold">
          ← Back to Mock Exams
        </Link>
      </div>
    );
  }

  const score = questions.filter((q) => userAnswers[q.id] === q.correct_answer).length;
  const totalAnswered = Object.keys(userAnswers).length;
  const allAnswered = totalAnswered === questions.length;
  const mcqQuestions = questions.filter((q) => q.question_type === "mcq");
  const structQuestions = questions.filter((q) => q.question_type !== "mcq");

  // Render a stem part
  function renderPart(part: StemPart, key: number) {
    if (typeof part === "string") return <span key={key}>{part}</span>;
    if (part.type === "table") {
      return <div key={key} dangerouslySetInnerHTML={{ __html: part.html }} />;
    }
    // Image
    const src = part.src;
    if (src.startsWith("data:image/svg+xml")) {
      let svgContent = "";
      if (src.includes(";base64,")) {
        try { svgContent = atob(src.split(";base64,")[1]); } catch {}
      } else {
        const commaIdx = src.indexOf(",");
        if (commaIdx > -1) svgContent = decodeURIComponent(src.slice(commaIdx + 1));
      }
      if (svgContent) {
        return (
          <div key={key} className="my-3 max-w-full rounded-lg border overflow-hidden"
            dangerouslySetInnerHTML={{ __html: svgContent }} />
        );
      }
    }
    return <img key={key} src={src} alt="diagram" className="my-3 max-w-full rounded-lg border" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href={`/mock-exams/${subjectSlug}`} className="hover:text-primary-600">{subjectName} Mock Exams</Link>
      </div>

      <div className="bg-white border rounded-xl p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {paper.paper_number} — {paper.paper_type}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {paper.minutes} minutes · {paper.total_marks} marks · {questions.length} questions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {timerStarted && !submitted && (
              <span className={`text-lg font-mono font-bold ${timeLeft < 300 ? "text-red-600" : "text-gray-700"}`}>
                {formatTime(timeLeft)}
              </span>
            )}
            {!timerStarted && !submitted && (
              <button onClick={startTimer}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                Start Timer
              </button>
            )}
            {submitted && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">
                  Score: {score}/{mcqQuestions.length}
                  {mcqQuestions.length > 0 && ` (${Math.round((score / mcqQuestions.length) * 100)}%)`}
                </span>
                <button onClick={handleReset} className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MCQ Questions */}
      {mcqQuestions.length > 0 && (
        <div className="space-y-5">
          {mcqQuestions.map((q, i) => {
            const userAnswer = userAnswers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            const diffColor =
              q.difficulty === "easy" ? "bg-green-50 text-green-600"
              : q.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
              : "bg-red-50 text-red-600";
            const diffLabel =
              q.difficulty === "easy" ? "Easy" : q.difficulty === "medium" ? "Medium" : "Hard";

            return (
              <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      Q{i + 1}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor}`}>
                      {diffLabel}
                    </span>
                    <span className="text-xs text-gray-400">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-gray-800 text-sm whitespace-pre-wrap">
                    {parseStem(q.stem).map((part, pi) => renderPart(part, pi))}
                  </div>
                </div>

                {q.options && q.options.length >= 2 && (
                  <div className="px-5 pb-5 space-y-2">
                    {q.options.map((opt: string, oi: number) => {
                      const label = String.fromCharCode(65 + oi);
                      const selected = userAnswer === label;
                      let cls = "border-gray-200 hover:bg-gray-50 cursor-pointer";
                      if (submitted) {
                        if (label === q.correct_answer) cls = "bg-green-50 border-green-400";
                        else if (selected) cls = "bg-red-50 border-red-400";
                        else cls = "border-gray-200 opacity-60";
                      } else if (selected) cls = "bg-primary-50 border-primary-400";

                      return (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(q.id, label)}
                          disabled={submitted}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${cls}`}
                        >
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                              submitted && label === q.correct_answer
                                ? "bg-green-500 text-white"
                                : submitted && selected
                                ? "bg-red-500 text-white"
                                : selected
                                ? "bg-primary-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {label}
                          </span>
                          <span className="text-sm">{(() => { const stripped = opt.replace(/^[A-D][.)]?\s*/, ""); return stripped || opt; })()}</span>
                          {submitted && label === q.correct_answer && (
                            <span className="ml-auto text-green-600 text-xs">✓ Correct</span>
                          )}
                          {submitted && selected && !isCorrect && (
                            <span className="ml-auto text-red-600 text-xs">✗</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {submitted && q.explanation && (
                  <div className="px-5 pb-4 mx-5 mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Explanation</p>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Structured Questions — use new grading component */}
      {structQuestions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            📝 Structured Questions ({structQuestions.length})
          </h3>
          <div className="space-y-5">
            {structQuestions.map((q, i) => (
              <StructuredQuestion
                key={q.id}
                question={q}
                index={mcqQuestions.length + i}
              />
            ))}
          </div>
        </div>
      )}

      {/* Submit / Score bar at bottom */}
      {mcqQuestions.length > 0 && (
        <div className="mt-8 flex justify-center">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="bg-primary-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answers ({totalAnswered}/{mcqQuestions.length})
            </button>
          ) : (
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800 mb-2">
                Score: {score}/{mcqQuestions.length} ({Math.round((score / mcqQuestions.length) * 100)}%)
              </p>
              <button onClick={handleReset} className="text-sm bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200">
                Retry All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
