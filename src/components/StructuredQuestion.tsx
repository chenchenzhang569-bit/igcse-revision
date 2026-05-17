"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  parseSubQuestions,
  parseMarkScheme,
  gradeAnswer,
  type GradedSubQuestion,
  type GradedResult,
} from "@/lib/grade-structured-answer";

// ─── Symbol groups ───────────────────────────────────────────────────────────
const SYMBOL_GROUPS = [
  {
    label: "Superscript",
    symbols: ["²", "³", "⁴", "⁺", "⁻", "°"],
  },
  {
    label: "Subscript",
    symbols: ["₂", "₃", "₄", "₅", "₆"],
  },
  {
    label: "Greek",
    symbols: ["α", "β", "γ", "δ", "μ", "π", "θ", "ω", "Δ"],
  },
  {
    label: "Chemistry",
    symbols: ["→", "⇌", "↑", "↓", "CO₂", "H₂O", "O₂", "N₂", "H⁺", "OH⁻"],
  },
  {
    label: "Math",
    symbols: ["√", "±", "×", "÷", "≤", "≥", "≈", "≠", "∞"],
  },
  {
    label: "Units",
    symbols: ["℃", "Ω", "cm³", "dm³", "g/cm³", "mol/dm³"],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type StemPart = string | { type: "img"; src: string } | { type: "table"; html: string };

interface Question {
  id: string;
  question_order: number;
  question_type: string;
  difficulty?: string;
  stem: string;
  options?: string[] | null;
  correct_answer?: string;
  explanation: string;
  marks: number;
}

// ─── parseStem (same as paper page) ──────────────────────────────────────────
function mdTableToHtml(md: string): string | null {
  const lines = md.trim().split("\n");
  if (lines.length < 2) return null;
  if (!lines[0].startsWith("|") || !lines[1].match(/^\|[\s\-:]+\|$/)) return null;

  const headers = lines[0].split("|").slice(1, -1).map((h) => h.trim());
  const align: string[] = [];
  lines[1].split("|").slice(1, -1).forEach((a) => {
    const t = a.trim();
    if (t.startsWith(":") && t.endsWith(":")) align.push("center");
    else if (t.endsWith(":")) align.push("right");
    else align.push("left");
  });

  let html =
    '<table class="my-3 w-full text-xs border-collapse" style="table-layout:auto"><thead><tr class="bg-gray-100" style="background:#f3f4f6">';
  headers.forEach((h, i) => {
    html += `<th style="border:1px solid #d1d5db;padding:4px 8px;text-align:${align[i] || "left"}">${h}</th>`;
  });
  html += "</tr></thead><tbody>";

  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split("|").slice(1, -1);
    const isOdd = (i - 2) % 2 === 1;
    const bg = isOdd ? "#f9fafb" : "#ffffff";
    html += `<tr style="background:${bg}">`;
    cells.forEach((c) => {
      html += `<td style="border:1px solid #d1d5db;padding:4px 8px">${c.trim()}</td>`;
    });
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

function parseStem(stem: string): StemPart[] {
  const parts: StemPart[] = [];

  const tableRegex = /(?:\|.+\|\n)+\|[\s\-:|\|]+\|\n(?:\|.+\|\n?)+/g;
  const tables: { start: number; end: number; html: string }[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = tableRegex.exec(stem)) !== null) {
    const html = mdTableToHtml(tm[0]);
    if (html) tables.push({ start: tm.index, end: tm.index + tm[0].length, html });
  }

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

// ─── Stem Renderer ──────────────────────────────────────────────────────────
function StemRenderer({ stem }: { stem: string }) {
  const parts = useMemo(() => parseStem(stem), [stem]);

  function renderPart(part: StemPart, key: number) {
    if (typeof part === "string") return <span key={key} className="whitespace-pre-wrap">{part}</span>;
    if (part.type === "table") {
      return <div key={key} dangerouslySetInnerHTML={{ __html: part.html }} />;
    }
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

  return <>{parts.map((p, i) => renderPart(p, i))}</>;
}

// ─── Symbol Toolbar ─────────────────────────────────────────────────────────
function SymbolToolbar({ onInsert }: { onInsert: (symbol: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
        title="Insert symbol"
      >
        <span className="font-mono text-gray-600">Ω</span>
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 z-50 bg-white border rounded-lg shadow-xl p-3 min-w-[280px]">
            {SYMBOL_GROUPS.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{group.label}</div>
                <div className="flex flex-wrap gap-1">
                  {group.symbols.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => { onInsert(sym); setOpen(false); }}
                      className="px-2 py-1 text-xs font-mono bg-gray-50 hover:bg-primary-50 hover:text-primary-700 border border-gray-200 rounded transition"
                      title={sym}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Text Input with symbol toolbar ─────────────────────────────────────────
function AnswerInput({
  value,
  onChange,
  placeholder,
  symbols,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  symbols?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSymbol = useCallback(
    (symbol: string) => {
      const el = textareaRef.current;
      if (!el) return onChange(value + symbol);

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = value.slice(0, start) + symbol + value.slice(end);
      onChange(newVal);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + symbol.length, start + symbol.length);
      });
    },
    [value, onChange]
  );

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full p-3 pr-10 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition"
      />
      {symbols && (
        <div className="absolute right-2 top-2">
          <SymbolToolbar onInsert={insertSymbol} />
        </div>
      )}
    </div>
  );
}

// ─── Feedback Panel ─────────────────────────────────────────────────────────
function GradingFeedback({ result }: { result: GradedResult }) {
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700">
          {result.subLabel ? `(${result.subLabel}) Score:` : "Score:"}{" "}
          <span className={result.score === result.totalMarks ? "text-green-600" : "text-amber-600"}>
            {result.score}/{result.totalMarks}
          </span>
        </span>
      </div>

      {result.markPoints.map((mp, mi) => (
        <div key={mi} className="mb-2 last:mb-0 p-2 bg-white rounded border">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                mp.marks > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {mp.marks > 0 ? `+${mp.marks}` : "0"}
            </span>
            <span className="text-xs text-gray-500">{mp.point}</span>
          </div>
          {mp.matched.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {mp.matched.map((k, ki) => (
                <span key={ki} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  ✓ {k}
                </span>
              ))}
            </div>
          )}
          {mp.missed.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {mp.missed.map((k, ki) => (
                <span key={ki} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main StructuredQuestion Component ──────────────────────────────────────
export default function StructuredQuestion({
  question,
  index,
}: {
  question: Question;
  index: number;
}) {
  const subs = useMemo(() => parseSubQuestions(question.stem), [question.stem]);
  const markScheme = useMemo(() => parseMarkScheme(question.explanation), [question.explanation]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState(false);
  const [results, setResults] = useState<GradedResult[]>([]);

  const handleChange = (label: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [label]: val }));
  };

  const handleGrade = () => {
    const r = gradeAnswer(markScheme, answers);
    setResults(r);
    setGraded(true);
  };

  const handleReset = () => {
    setAnswers({});
    setGraded(false);
    setResults([]);
  };

  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const totalMarks = results.reduce((s, r) => s + r.totalMarks, 0);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
            Q{index + 1}
          </span>
          <span className="text-xs text-gray-400">{question.marks} mark{question.marks > 1 ? "s" : ""}</span>
          {question.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              question.difficulty === "easy" ? "bg-green-50 text-green-600"
              : question.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
              : "bg-red-50 text-red-600"
            }`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
          )}
        </div>
        <div className="text-gray-800 text-sm">
          <StemRenderer stem={question.stem} />
        </div>
      </div>

      {/* Answer Inputs */}
      <div className="px-5 pb-3 space-y-3">
        {subs.length <= 1 ? (
          /* Single input */
          <AnswerInput
            value={answers[""] || ""}
            onChange={(val) => handleChange("", val)}
            placeholder="Type your answer..."
            symbols
          />
        ) : (
          /* Sub-questions */
          subs.map((sub) => (
            <div key={sub.label}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-500">
                  ({sub.label})
                </span>
                <span className="text-xs text-gray-400">[{sub.marks} mark{sub.marks > 1 ? "s" : ""}]</span>
              </div>
              <AnswerInput
                value={answers[sub.label] || ""}
                onChange={(val) => handleChange(sub.label, val)}
                placeholder={`Answer for (${sub.label})...`}
                symbols
              />
            </div>
          ))
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1">
          {!graded ? (
            <button
              onClick={handleGrade}
              disabled={subs.every((s) => !answers[s.label]?.trim())}
              className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <>
              <span className={`text-sm font-bold ${totalScore === totalMarks ? "text-green-600" : "text-amber-600"}`}>
                {totalScore}/{totalMarks} marks
              </span>
              <button
                onClick={handleReset}
                className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grading Feedback */}
      {graded && (
        <div className="px-5 pb-5 space-y-3">
          {results.map((r, ri) => (
            <GradingFeedback key={ri} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
