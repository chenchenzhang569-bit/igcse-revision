"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import "katex/dist/katex.min.css";
import { fixMathNotationUnicode, renderMath } from "@/lib/math";
import BookmarkButton from "@/components/BookmarkButton";

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
  clean_explanation?: string | null;
  clean_answer_text?: string | null;
  marks: number;
}

/** Tree node: represents one labelled part (a, b, i, ii, etc.) */
interface PartNode {
  label: string;       // e.g. "a", "i", "ii"
  raw: string;         // raw marker text like "(a) " or "ii) "
  indent: number;      // spaces/tabs before marker
  startIdx: number;    // position of marker within stem
  endIdx: number;      // position right after this node's content (exclusive)
  children: PartNode[];
}

/** Flat display item for rendering */
type DisplayItem =
  | { type: "section"; label: string; text: string }                                // parent label — no input
  | { type: "leaf";   label: string; fullLabel: string; text: string; marks: number } // leaf — has input

interface ParseResult {
  preamble: string;
  items: DisplayItem[];
}

// ─── Parse stem into flat display items (sections + leaves) ──────────────────
function parseSubParts(stem: string): ParseResult {
  if (!stem) return { preamble: "", items: [] };

  // Helper: is label a roman numeral?
  const isRoman = (s: string) => /^[ivx]+$/i.test(s);

  // ── Step 1: find ALL markers ────────────────────────────────────────────
  const allMarkers: { idx: number; label: string; raw: string; end: number }[] = [];
  const re = /(?:^|\n)([ \t]*)(\([a-z]+\)|[ivx]+\))\s*/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stem)) !== null) {
    allMarkers.push({
      idx: m.index,  // raw position, DON'T skip \n
      label: m[2].replace(/[()]/g, "").trim(),
      raw: m[0],
      end: 0, // filled below
    });
  }

  if (allMarkers.length === 0) {
    const marksMatch = stem.match(/\[(\d+)\]\s*$/m);
    return {
      preamble: stem.replace(/\s*\[\d+\]\s*$/m, "").trim(),
      items: [{ type: "leaf", label: "", fullLabel: "", text: "", marks: marksMatch ? parseInt(marksMatch[1]) : 1 }],
    };
  }

  // Compute end positions
  for (let i = 0; i < allMarkers.length; i++) {
    allMarkers[i].end = i + 1 < allMarkers.length ? allMarkers[i + 1].idx : stem.length;
  }

  // ── Step 2: classify into parent/child ──────────────────────────────────
  const nodes: { label: string; raw: string; idx: number; end: number; children: typeof allMarkers }[] = [];
  let i = 0;
  while (i < allMarkers.length) {
    const mk = allMarkers[i];
    const next = allMarkers[i + 1];

    if (!isRoman(mk.label) && next && isRoman(next.label)) {
      // LETTER with ROMAN children — collect all consecutive ROMANs as children
      const children: typeof allMarkers = [];
      let j = i + 1;
      while (j < allMarkers.length && isRoman(allMarkers[j].label)) {
        children.push(allMarkers[j]);
        j++;
      }
      const lastChild = children[children.length - 1];
      nodes.push({
        label: mk.label,
        raw: mk.raw,
        idx: mk.idx,        // unified: idx, not startIdx
        end: lastChild.end,
        children,
      });
      i = j;
    } else {
      nodes.push({
        label: mk.label,
        raw: mk.raw,
        idx: mk.idx,
        end: mk.end,
        children: [],
      });
      i++;
    }
  }

  // ── Step 3: preamble ────────────────────────────────────────────────────
  const firstIdx = nodes[0].idx;
  let preamble = stem.slice(0, firstIdx).trim();
  preamble = preamble.replace(/\n\s*Fig\.\s*\d+\s*$/, "").trim();

  // ── Step 4: flatten to DisplayItems ─────────────────────────────────────
  function flatten(nodes: typeof allMarkers, parentPath: string): DisplayItem[] {
    const items: DisplayItem[] = [];
    for (const node of nodes) {
      const path = parentPath ? `${parentPath}-${node.label}` : node.label;
      const textStart = node.idx + node.raw.length;  // unified: idx
      let text: string;

      if (node.children && node.children.length > 0) {
        // Section: text from this marker to first child
        text = stem.slice(textStart, node.children[0].idx).trim();
        items.push({ type: "section", label: node.label, text });
        items.push(...flatten(node.children, path));
      } else {
        // Leaf
        text = stem.slice(textStart, node.end).trim();
        // Strip trailing [N]
        text = text.replace(/\s*\[\d+\]\s*$/m, "").trim();
        // Extract marks
        let marks = 0;
        const marksRe = /\[(\d+)\]/g;
        let mm: RegExpExecArray | null;
        while ((mm = marksRe.exec(text)) !== null) marks += parseInt(mm[1]);
        if (marks === 0) marks = 1;
        items.push({ type: "leaf", label: node.label, fullLabel: path, text, marks });
      }
    }
    return items;
  }

  const items = flatten(nodes, "");
  return { preamble, items };
}

// ─── Stem parsing (images + tables) ──────────────────────────────────────────
function mdTableToHtml(md: string): string | null {
  const lines = md.trim().split("\n");
  if (lines.length < 2) return null;
  if (!lines[0].startsWith("|") || !lines[1].match(/^\|[\s\-:|\|]+\|$/)) return null;
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

function findTables(stem: string): { start: number; end: number; html: string }[] {
  const tables: { start: number; end: number; html: string }[] = [];
  
  // Match HTML <table>...</table> blocks
  const htmlTableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlTableRegex.exec(stem)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, html: m[0] });
  }
  
  // Match markdown pipe tables — supports multi-line cells and inline tables
  const lines = stem.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const sepLine = lines[i + 1]?.trim() || "";
    if (/^\|[\s\-:\|]+\|$/.test(sepLine)) {
      // Found separator. Walk back to find header start (handles multi-line cells & inline)
      let headerStart = i;
      while (headerStart >= 0) {
        const l = lines[headerStart].trim();
        if (l.startsWith("|") || l.includes("|")) break;
        if (l === "" && headerStart <= i) { headerStart++; break; }
        headerStart--;
      }
      if (headerStart < 0) { i++; continue; }
      
      let endIdx = i + 2;
      while (endIdx < lines.length && (lines[endIdx].includes("|") || lines[endIdx].trim() === "")) endIdx++;
      while (endIdx > i + 2 && lines[endIdx - 1].trim() === "") endIdx--;
      
      const tableLines = lines.slice(headerStart, endIdx);
      // Strip non-table prefix from first line
      const firstPipe = tableLines[0].indexOf("|");
      if (firstPipe > 0) tableLines[0] = tableLines[0].slice(firstPipe);
      
      const md = tableLines.join("\n");
      const html = mdTableToHtml(md);
      if (html) {
        const start = stem.indexOf(tableLines[0]);
        const end = start + tableLines.map(l => l.length + 1).reduce((a, b) => a + b, 0);
        tables.push({ start, end, html });
      }
      i = endIdx;
    }
  }
  
  // Sort by start position
  tables.sort((a, b) => a.start - b.start);
  return tables;
}

function parseStemIntoParts(stem: string): StemPart[] {
  const parts: StemPart[] = [];
  const tables = findTables(stem);

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
        if (typeof part === "string") {
          const html = renderMath(part);
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="whitespace-pre-wrap" />;
        }
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
        return <img key={i} src={src} alt="diagram" referrerPolicy="no-referrer" crossOrigin="anonymous" className="my-3 max-w-full rounded-lg border" />;
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

// ─── Drawing Pad ────────────────────────────────────────────────────────────
function DrawingPad({ onInsertImage, onInsertText, onClose }: {
  onInsertImage: (dataUri: string) => void;
  onInsertText: (text: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#1e293b");
  const [lineWidth, setLineWidth] = useState(2);
  const [ocrBusy, setOcrBusy] = useState(false);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);
  
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleInsertImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onInsertImage(canvas.toDataURL("image/png"));
    onClose();
  };

  const handleRecognize = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOcrBusy(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(canvas, "eng", {
        logger: () => {},
      });
      const text = data.text.trim();
      if (text) {
        onInsertText(text);
        onClose();
      }
    } catch (e) {
      console.error("OCR failed:", e);
    } finally {
      setOcrBusy(false);
    }
  };

  const COLORS = ["#1e293b", "#dc2626", "#2563eb", "#16a34a"];
  const WIDTHS = [1, 2, 4, 6];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-1">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] sm:max-w-lg overflow-hidden">
        {/* Toolbar - mobile: wrap */}
        <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 border-b bg-gray-50">
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition shrink-0 ${color === c ? "border-gray-800 scale-110" : "border-gray-300"}`}
                style={{ background: c }} />
            ))}
            <span className="text-gray-300 text-xs hidden sm:inline">|</span>
            {WIDTHS.map((w) => (
              <button key={w} onClick={() => setLineWidth(w)}
                className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-xs shrink-0 ${lineWidth === w ? "bg-gray-200 ring-1 ring-gray-400" : "hover:bg-gray-100"}`}>
                <div className="rounded-full bg-gray-700" style={{ width: w + 3, height: w + 3 }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clear} className="text-[11px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition shrink-0">Clear</button>
            <button onClick={handleInsertImage} className="text-[11px] px-2 py-1 bg-primary-600 text-white hover:bg-primary-700 rounded transition font-medium shrink-0">Done ✓</button>
            <button onClick={handleRecognize} disabled={ocrBusy}
              className="text-[11px] px-2 py-1 bg-amber-500 text-white hover:bg-amber-600 rounded transition font-medium shrink-0 disabled:opacity-60">
              {ocrBusy ? "..." : "OCR→"}
            </button>
            <button onClick={onClose} className="text-[11px] px-2 py-1 text-gray-400 hover:text-gray-600 shrink-0">✕</button>
          </div>
        </div>
        {/* Canvas */}
        <canvas ref={canvasRef} width={600} height={320}
          className="w-full touch-none bg-white cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        <div className="px-2 py-1.5 text-[10px] text-gray-400 text-center border-t">
          <span className="hidden sm:inline">Draw diagrams or write text · </span>
          <b>Insert</b> = as image &nbsp;|&nbsp; <b>OCR→</b> = recognize to text
        </div>
      </div>
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
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawings, setDrawings] = useState<string[]>([]);

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

  const insertText = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) return onChange(value + text);
    const start = el.selectionStart, end = el.selectionEnd;
    const newVal = value.slice(0, start) + text + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }, [value, onChange]);

  const addDrawing = useCallback((dataUri: string) => {
    setDrawings((p) => [...p, dataUri]);
  }, []);

  const removeDrawing = (idx: number) => {
    setDrawings((p) => p.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative">
      <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={Math.max(2, marks + 1)}
        className="w-full p-3 pr-20 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition" />
      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        <button type="button" onClick={() => setShowDrawing(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
          title="Draw diagram or write">
          ✏️ Handwrite
        </button>
        <SymbolToolbar onInsert={insertSymbol} />
      </div>

      {/* Drawing previews */}
      {drawings.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {drawings.map((d, i) => (
            <div key={i} className="relative group">
              <img src={d} alt={`drawing ${i + 1}`} className="max-h-24 rounded border" />
              <button onClick={() => removeDrawing(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showDrawing && (
        <DrawingPad
          onInsertImage={addDrawing}
          onInsertText={insertText}
          onClose={() => setShowDrawing(false)}
        />
      )}
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
  question, index, onBugReport,
}: {
  question: Question; index: number; onBugReport?: () => void;
}) {
  const fixedStem = useMemo(() => fixMathNotationUnicode(question.stem), [question.stem]);
  const { preamble, items } = useMemo(() => parseSubParts(fixedStem), [fixedStem]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [showPerSub, setShowPerSub] = useState<Record<string, boolean>>({});

  // Key for answer state: fullLabel for leaves, label for others
  const itemKey = (item: DisplayItem) =>
    item.type === "leaf" ? (item.fullLabel || "_single") : `_section_${item.label}`;

  const totalMarks = items
    .filter((it): it is Extract<DisplayItem, { type: "leaf" }> => it.type === "leaf")
    .reduce((s, it) => s + it.marks, 0);

  const leafCount = items.filter(it => it.type === "leaf").length;

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
          <div className="ml-auto flex items-center gap-1">
            <BookmarkButton questionId={question.id} source="mock_exam" />
            {onBugReport && (
              <button onClick={onBugReport} className="text-gray-400 hover:text-[#001C71] transition" title="Report issue">🔧</button>
            )}
          </div>
        </div>
        <div className="text-gray-800 text-sm">
          <StemParts stem={preamble} />
        </div>
      </div>

      {/* Sub-questions with inputs only at leaf nodes */}
      {items.map((item, i) => {
        const key = itemKey(item);
        if (item.type === "section") {
          // Parent label with intro text — no input box
          return (
            <div key={key} className="px-5 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                  ({item.label})
                </span>
              </div>
              {item.text && (
                <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap pl-1">
                  <StemParts stem={item.text} />
                </div>
              )}
            </div>
          );
        }

        // Leaf: has input box
        const isMulti = leafCount > 1;
        return (
          <div key={key} className="px-5 pb-3">
            {isMulti && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                  ({item.label})
                </span>
                <span className="text-xs text-gray-400">[{item.marks} mark{item.marks > 1 ? "s" : ""}]</span>
              </div>
            )}
            {item.text && (
              <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                <StemParts stem={item.text} />
              </div>
            )}
            <AnswerInput
              value={answers[key] || ""}
              onChange={(val) => setAnswers((p) => ({ ...p, [key]: val }))}
              placeholder={`Type your answer${isMulti ? ` for (${item.label})` : ""}...`}
              marks={item.marks}
            />
            {/* Per-sub-answer toggle */}
            {showPerSub[key] && (question.clean_explanation || question.explanation) && (() => {
              const html = renderMath(parseModelAnswer(fixMathNotationUnicode(question.clean_explanation || question.explanation)));
              return (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: html }} />
              );
            })()}
            {leafCount > 1 && (
              <button onClick={() => setShowPerSub((p) => ({ ...p, [key]: !p[key] }))}
                className="mt-1 text-xs text-primary-600 hover:text-primary-700">
                {showPerSub[key] ? "Hide answer" : "Show answer"} for ({item.label})
              </button>
            )}
          </div>
        );
      })}

      {/* Bottom action bar */}
      <div className="px-5 pb-5 flex items-center gap-3 pt-1 border-t border-gray-100 mt-2">
        {leafCount <= 1 && (
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

      {/* Full model answer (single leaf) */}
      {showAnswer && leafCount <= 1 && (question.clean_explanation || question.explanation) && (() => {
        const html = renderMath(parseModelAnswer(fixMathNotationUnicode(question.clean_explanation || question.explanation)));
        return (
          <div className="px-5 pb-5">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-800 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        );
      })()}
    </div>
  );
}
