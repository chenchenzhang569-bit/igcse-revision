"use client";

import { useState, useRef, useCallback, useMemo } from "react";

// ─── Symbol groups ───────────────────────────────────────────────────────────
const SYMBOL_GROUPS = [
  { label: "Superscript", symbols: ["²", "³", "⁴", "⁺", "⁻", "°"] },
  { label: "Subscript", symbols: ["₂", "₃", "₄", "₅", "₆"] },
  { label: "Greek", symbols: ["α", "β", "γ", "δ", "μ", "π", "θ", "ω", "Δ"] },
  { label: "Chemistry", symbols: ["→", "⇌", "↑", "↓", "CO₂", "H₂O", "O₂", "N₂", "H⁺", "OH⁻"] },
  { label: "Math", symbols: ["√", "±", "×", "÷", "≤", "≥", "≈", "≠", "∞"] },
  { label: "Units", symbols: ["℃", "Ω", "cm³", "dm³", "g/cm³", "mol/dm³"] },
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

interface SubPart {
  label: string;       // e.g. "i", "ii", "" if no sub-parts
  text: string;         // sub-question text (without [marks])
  marks: number;        // from [N] in stem
}

// ─── Parse stem into sub-questions ───────────────────────────────────────────
function parseSubParts(stem: string): { preamble: string; subs: SubPart[] } {
  if (!stem) return { preamble: "", subs: [] };

  // Match (i), (ii), (iii), (a), (b) etc. at start of lines
  const subMarkerRe = /(?:^|\n)\s*(\([ivxa-d]+\)|[ivx]+\))\s*/gim;
  const markers: { idx: number; label: string; raw: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = subMarkerRe.exec(stem)) !== null) {
    // m[0] includes leading newline; m[1] is just "(i)"
    markers.push({
      idx: m.index + (m[0].startsWith("\n") ? 1 : 0),
      label: m[1].replace(/[()]/g, "").trim(),
      raw: m[0],
    });
  }

  if (markers.length === 0) {
    // No sub-parts — one input
    const marksMatch = stem.match(/\[(\d+)\]\s*$/m);
    return {
      preamble: stem.replace(/\s*\[\d+\]\s*$/m, "").trim(),
      subs: [{ label: "", text: "", marks: marksMatch ? parseInt(marksMatch[1]) : 1 }],
    };
  }

  // Slice stem into preamble + sub-parts
  const firstIdx = markers[0].idx;
  let preamble = stem.slice(0, firstIdx).trim();
  // Remove trailing "Fig. 1" etc if it's on its own before sub-parts
  preamble = preamble.replace(/\n\s*Fig\.\s*\d+\s*$/, "").trim();

  const subs: SubPart[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx + markers[i].raw.length;
    const end = i + 1 < markers.length ? markers[i + 1].idx : stem.length;
    let subText = stem.slice(start, end).trim();
    
    // Extract [N] marks from end
    const marksMatch = subText.match(/\[(\d+)\]\s*$/m);
    const marks = marksMatch ? parseInt(marksMatch[1]) : 1;
    subText = subText.replace(/\s*\[\d+\]\s*$/m, "").trim();

    subs.push({ label: markers[i].label, text: subText, marks });
  }

  return { preamble, subs };
}

// ─── Stem parsing (images + tables) ──────────────────────────────────────────
function mdTableToHtml(md: string): string | null {
  const lines = md.trim().split("\n");
  if (lines.length < 2) return null;
  if (!lines[0].startsWith("|") || !lines[1].match(/^\|[\s\-:]+\|$/)) return null;
  let headers = lines[0].split("|").slice(1, -1).map((h) => h.trim());
  const align: string[] = [];
  lines[1].split("|").slice(1, -1).forEach((a) => {
    const t = a.trim();
    if (t.startsWith(":") && t.endsWith(":")) align.push("center");
    else if (t.endsWith(":")) align.push("right");
    else align.push("left");
  });
  // When all headers are empty, use first data row as headers
  let bodyStart = 2;
  if (headers.every((h) => h === "") && lines.length > 2) {
    headers = lines[2].split("|").slice(1, -1).map((h) => h.trim());
    bodyStart = 3;
  }
  let html = '<table class="my-3 w-full text-xs border-collapse"><thead><tr class="bg-gray-100" style="background:#f3f4f6">';
  headers.forEach((h, i) => {
    html += `<th style="border:1px solid #d1d5db;padding:4px 8px;text-align:${align[i] || "left"}">${h}</th>`;
  });
  html += "</tr></thead><tbody>";
  for (let i = bodyStart; i < lines.length; i++) {
    const cells = lines[i].split("|").slice(1, -1);
    const bg = (i - bodyStart) % 2 === 1 ? "#f9fafb" : "#ffffff";
    html += `<tr style="background:${bg}">`;
    cells.forEach((c) => html += `<td style="border:1px solid #d1d5db;padding:4px 8px">${c.trim()}</td>`);
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

function parseStemIntoParts(stem: string): StemPart[] {
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

function StemParts({ stem }: { stem: string }) {
  const parts = useMemo(() => parseStemIntoParts(stem), [stem]);
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string")
          return <span key={i} className="whitespace-pre-wrap">{part}</span>;
        if (part.type === "table")
          return <div key={i} dangerouslySetInnerHTML={{ __html: part.html }} />;
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
          if (svgContent)
            return <div key={i} className="my-3 max-w-full rounded-lg border overflow-hidden"
              dangerouslySetInnerHTML={{ __html: svgContent }} />;
        }
        return <img key={i} src={src} alt="diagram" className="my-3 max-w-full rounded-lg border" />;
      })}
    </>
  );
}

// ─── Symbol Toolbar ─────────────────────────────────────────────────────────
function SymbolToolbar({ onInsert }: { onInsert: (symbol: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
        title="Insert symbol">
        <span className="font-mono text-gray-600">Ω</span>
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 z-50 bg-white border rounded-lg shadow-xl p-3 min-w-[280px]">
            {SYMBOL_GROUPS.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{group.label}</div>
                <div className="flex flex-wrap gap-1">
                  {group.symbols.map((sym) => (
                    <button key={sym} type="button"
                      onClick={() => { onInsert(sym); setOpen(false); }}
                      className="px-2 py-1 text-xs font-mono bg-gray-50 hover:bg-primary-50 hover:text-primary-700 border border-gray-200 rounded transition"
                      title={sym}>{sym}</button>
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

// ─── Answer Input ───────────────────────────────────────────────────────────
function AnswerInput({
  value, onChange, placeholder, marks,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; marks: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSymbol = useCallback((symbol: string) => {
    const el = textareaRef.current;
    if (!el) return onChange(value + symbol);
    const start = el.selectionStart, end = el.selectionEnd;
    const newVal = value.slice(0, start) + symbol + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  }, [value, onChange]);

  return (
    <div className="relative">
      <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={Math.max(2, marks + 1)}
        className="w-full p-3 pr-10 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition" />
      <div className="absolute right-2 top-2">
        <SymbolToolbar onInsert={insertSymbol} />
      </div>
    </div>
  );
}

// ─── Parse model answer from explanation ─────────────────────────────────────
function parseModelAnswer(explanation: string): string {
  if (!explanation) return "";
  // Remove [Total: N marks] and trailing instructional text
  return explanation
    .replace(/\[Total:\s*\d+\s*marks?\]/gi, "")
    .replace(/Maximum\s*\[?\d+\]?\s*marks?[^]*$/gi, "")
    .replace(/In the exam you[^]*$/gi, "")
    .replace(/Remember that[^]*$/gi, "")
    .replace(/Make sure you[^]*$/gi, "")
    .trim();
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function StructuredQuestion({
  question, index,
}: {
  question: Question; index: number;
}) {
  const { preamble, subs } = useMemo(() => parseSubParts(question.stem), [question.stem]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [showPerSub, setShowPerSub] = useState<Record<string, boolean>>({});

  // Build key by sub-label or index
  const subKey = (sub: SubPart, i: number) => sub.label || String(i);

  const totalMarks = subs.reduce((s, sub) => s + sub.marks, 0);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Question header + preamble */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Q{index + 1}</span>
          <span className="text-xs text-gray-400">{totalMarks} marks</span>
          {question.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              question.difficulty === "easy" ? "bg-green-50 text-green-600"
              : question.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
              : "bg-red-50 text-red-600"}`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
          )}
        </div>
        <div className="text-gray-800 text-sm">
          <StemParts stem={preamble} />
        </div>
      </div>

      {/* Sub-questions with inputs directly below */}
      {subs.map((sub, i) => {
        const key = subKey(sub, i);
        const isMulti = subs.length > 1;
        return (
          <div key={key} className="px-5 pb-3">
            {isMulti && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                  ({sub.label})
                </span>
                <span className="text-xs text-gray-400">[{sub.marks} mark{sub.marks > 1 ? "s" : ""}]</span>
              </div>
            )}
            {sub.text && (
              <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                <StemParts stem={sub.text} />
              </div>
            )}
            <AnswerInput
              value={answers[key] || ""}
              onChange={(val) => setAnswers((p) => ({ ...p, [key]: val }))}
              placeholder={`Type your answer${isMulti ? ` for (${sub.label})` : ""}...`}
              marks={sub.marks}
            />
            {/* Per-sub-answer toggle */}
            {showPerSub[key] && question.explanation && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap">
                {parseModelAnswer(question.explanation)}
              </div>
            )}
            {subs.length > 1 && (
              <button onClick={() => setShowPerSub((p) => ({ ...p, [key]: !p[key] }))}
                className="mt-1 text-xs text-primary-600 hover:text-primary-700">
                {showPerSub[key] ? "Hide answer" : "Show answer"} for ({sub.label})
              </button>
            )}
          </div>
        );
      })}

      {/* Bottom action bar */}
      <div className="px-5 pb-5 flex items-center gap-3 pt-1 border-t border-gray-100 mt-2">
        {subs.length <= 1 && (
          !showAnswer ? (
            <button onClick={() => setShowAnswer(true)}
              className="text-sm bg-primary-50 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-100 transition font-medium">
              Show Model Answer
            </button>
          ) : (
            <button onClick={() => setShowAnswer(false)}
              className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
              Hide Answer
            </button>
          )
        )}
        <button onClick={() => { setAnswers({}); setShowAnswer(false); setShowPerSub({}); }}
          className="text-sm bg-gray-100 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-200 transition ml-auto">
          Clear All
        </button>
      </div>

      {/* Full model answer (single sub-q) */}
      {showAnswer && subs.length <= 1 && question.explanation && (
        <div className="px-5 pb-5">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
            {parseModelAnswer(question.explanation)}
          </div>
        </div>
      )}
    </div>
  );
}
