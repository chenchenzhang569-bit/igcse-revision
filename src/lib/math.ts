// Math rendering utilities for IGCSE revision site
// Converts SME proprietary markup and LaTeX math to proper HTML/Unicode

import katex from "katex";

// Unicode superscript mapping
const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
};

// Unicode subscript mapping
const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
};

function toSuperscript(text: string): string {
  return text.split("").map(c => SUPERSCRIPT_MAP[c] || c).join("");
}

function toSubscript(text: string): string {
  return text.split("").map(c => SUBSCRIPT_MAP[c] || c).join("");
}

export function fixMathNotationUnicode(text: string): string {
  let result = text;
  result = result.replace(/\^([\d+\-–−]+)\^/g, (_, content) => toSuperscript(content));
  result = result.replace(/~([\d]+)~/g, (_, content) => toSubscript(content));
  result = result.replace(/\*\^\*\*([^*]+)\*\*\^\*\*/g, (_, content) => toSuperscript(content));
  result = result.replace(/\*\^\*\*([^*\^]+)\*\*\^/g, (_, content) => toSuperscript(content));
  result = result.replace(/\^\*\s*\*\^\^(\d+)\^/g, (_, content) => toSuperscript(content));
  result = result.replace(/\^\*(?=\s|$)/g, "");
  result = result.replace(/(?<=\s|^)\*\^(?=\s|$)/g, "");
  return result;
}

export function fixMathNotation(text: string): string {
  let result = text;
  result = result.replace(/\^([\d+\-–−]+)\^/g, "<sup>$1</sup>");
  result = result.replace(/~([\d]+)~/g, "<sub>$1</sub>");
  result = result.replace(/\*\^\*\*([^*]+)\*\*\^\*\*/g, "<sup>$1</sup>");
  result = result.replace(/\*\^\*\*([^*\^]+)\*\*\^/g, "<sup>$1</sup>");
  result = result.replace(/\^\*\s*\*\^\^(\d+)\^/g, "<sup>$1</sup>");
  result = result.replace(/\^\*(?=\s|$)/g, "");
  result = result.replace(/(?<=\s|^)\*\^(?=\s|$)/g, "");
  return result;
}

function cleanSmeMathMarkup(math: string): string {
  let result = math;
  
  // ── Noise words: remove immediately ──
  result = result.replace(/\bstraight\b/g, "");
  result = result.replace(/\bbold\b/g, "");
  result = result.replace(/\bitalic\b/g, "");
  result = result.replace(/\bthin\b/g, "");
  result = result.replace(/\bspace\b/g, " ");
  
  // ── Parentheses ──
  result = result.replace(/open\s*parentheses/g, "(");
  result = result.replace(/close\s*parentheses/g, ")");
  result = result.replace(/left\s*parenthes[ie]s/g, "(");
  result = result.replace(/right\s*parenthes[ie]s/g, ")");
  result = result.replace(/open\s*bracket/g, "[");
  result = result.replace(/close\s*bracket/g, "]");
  result = result.replace(/left\s*bracket/g, "[");
  result = result.replace(/right\s*bracket/g, "]");
  result = result.replace(/open\s*vertical\s*bar/g, "|");
  result = result.replace(/close\s*vertical\s*bar/g, "|");
  result = result.replace(/left\s*vertical\s*bar/g, "|");
  result = result.replace(/right\s*vertical\s*bar/g, "|");
  result = result.replace(/\bvertical\s*line\b/g, "|");
  
  // ── Fractions (pipeline: fraction numerator ... / denominator ... end fraction) ──
  result = result.replace(/fraction\s*numerator\s*/g, "\\frac{");
  result = result.replace(/\/denominator\s*/g, "}{");
  result = result.replace(/over\s*denominator\s*/g, "}{");
  result = result.replace(/\bend\s*fraction\b/g, "}");
  
  // ── Powers (MUST run before standalone "over" — "end exponent" words must be consumed first) ──
  result = result.replace(/to\s*the\s*power\s*of\s*negative\s*(.+?)\s*end\s*exponent/g, "^{-{$1}}");
  result = result.replace(/to\s*the\s*power\s*of\s*(.+?)\s*end\s*exponent/g, "^{$1}");
  result = result.replace(/to\s*the\s*power\s*of\s*degree/g, "^{\\circ}");
  result = result.replace(/to\s*the\s*power\s*of\s+([^$\s]+)/g, "^{$1}");
  result = result.replace(/\bend\s*exponent\b/g, "");
  result = result.replace(/\bend\s*subscript\b/g, "");
  result = result.replace(/superscript/g, "^");
  result = result.replace(/subscript/g, "_");
  result = result.replace(/\bsquared\b/g, "^2");
  result = result.replace(/\bcubed\b/g, "^3");
  
  // ── Standalone "over" fraction (AFTER powers: end exponent already consumed, won't be confused) ──
  // No-space variant: xover16 → \frac{x}{16}
  result = result.replace(/\b(\w+)over(\w+)\b/g, "\\frac{$1}{$2}");
  // .+? captures multi-word expressions including {braces} and spaces
  result = result.replace(/(.+?)\s+over\s+(.+?)(?=\s+(?:equals|minus|plus|times|divided|$))/g, "\\frac{$1}{$2}");
  
  // ── Roots ──
  result = result.replace(/square\s*root\s*of\b/g, "\\sqrt{");
  result = result.replace(/cube\s*root\s*of\b/g, "\\sqrt[3]{");
  result = result.replace(/\bend\s*root\b/g, "}");
  result = result.replace(/\bend\s*sqrt\b/g, "}");
  result = result.replace(/(?<!\\)\bsqrt\b/g, "\\sqrt{");
  // Auto-close unclosed \sqrt{... patterns (no matching } found anywhere after)
  result = result.replace(/(\\sqrt(?:\[[^\]]*\])?\{)(?![^}]*\})\s*([^}\s]{1,30})/g, '$1$2}');
  
  // ── Inequalities ──
  result = result.replace(/less-than or slanted equal to/g, "\\leq");
  result = result.replace(/greater-than or slanted equal to/g, "\\geq");
  result = result.replace(/less or equal than/g, "\\leq");
  result = result.replace(/greater or equal than/g, "\\geq");
  result = result.replace(/greater\s+than\b/g, ">");
  result = result.replace(/less\s+than\b/g, "<");
  
  // ── Operators ──
  result = result.replace(/\bnegative\s+(?=[\w\\])/g, "-");
  result = result.replace(/\bminus\b/g, "-");
  result = result.replace(/\bplus\b/g, "+");
  result = result.replace(/\bequals\b/g, "=");
  result = result.replace(/\btimes\b/g, "\\times");
  result = result.replace(/\bdivided\s*by\b/g, "\\div");
  
  // ── Functions ──
  result = result.replace(/(?<!\\)\bcos(?![a-zA-Z])/g, "\\cos");
  result = result.replace(/(?<!\\)\bsin(?![a-zA-Z])/g, "\\sin");
  result = result.replace(/(?<!\\)\btan(?![a-zA-Z])/g, "\\tan");
  result = result.replace(/(?<!\\)\bsec(?![a-zA-Z])/g, "\\sec");
  result = result.replace(/(?<!\\)\bcsc(?![a-zA-Z])/g, "\\csc");
  result = result.replace(/(?<!\\)\bcot(?![a-zA-Z])/g, "\\cot");
  result = result.replace(/(?<!\\)\blog(?![a-zA-Z])/g, "\\log");
  // Wrap bare \log subscripts: \log _ X → \log_{X}
  result = result.replace(/\\log _ ([^\s+\-=\(\)]+)/g, '\\log_{$1}');
  result = result.replace(/(?<=\d)ln(?![a-zA-Z])/g, "\\ln");
  result = result.replace(/(?<!\\)\bln(?![a-zA-Z])/g, "\\ln");
  
  // ── Constants & Notation ──
  result = result.replace(/(?<!\\)\bpi(?![a-zA-Z])/g, "\\pi");
  result = result.replace(/\belement\s*of\b/g, "\\in");
  result = result.replace(/\breal\s*numbers\b/g, "\\mathbb{R}");
  result = result.replace(/rightwards\s*arrow\s*from\s*bar/g, "\\mapsto");
  result = result.replace(/rightwards\s*arrow/g, "\\rightarrow");
  
  // ── Cleanup ──
  result = result.replace(/\\\\([a-zA-Z])/g, "\\$1");
  result = result.replace(/\\\{/g, "{");
  result = result.replace(/\\\}/g, "}");
  result = result.replace(/\^\{-\{\}(\d+)\}/g, "^{-{$1}}");
  result = result.replace(/\bcolon\b/g, ":");
  result = result.replace(/([a-zA-Z])\s+bar\b/g, "\\bar{$1}");
  result = result.replace(/\s+/g, " ");
  
  return result;
}

export function renderMath(text: string): string {
  let result = text;
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  result = result.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, math) => {
    try {
      return katex.renderToString(cleanSmeMathMarkup(math.trim()), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  result = result.replace(/\$(?=[\- a-zA-Z0-9\\{\\\(])(.+?)(?<!\\)\$/g, (_, math) => {
    try {
      return katex.renderToString(cleanSmeMathMarkup(math.trim()), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${math}$`;
    }
  });

  return result;
}

export function processMathContent(text: string): string {
  return renderMath(fixMathNotation(text));
}

export function processMathContentUnicode(text: string): string {
  return renderMath(fixMathNotationUnicode(text));
}

// ─── Answer Normalization for Auto-Grading ───

function parseFraction(s: string): number {
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const num = parseFloat(m[1]);
    const den = parseFloat(m[2]);
    return den !== 0 ? num / den : NaN;
  }
  return NaN;
}

export function normalizeMathAnswer(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  s = s.replace(/^\$\s*/, "").replace(/\s*\$$/, "");
  s = s.replace(/\\%/g, "%");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\div/g, "÷");
  s = s.replace(/\\degree/g, "°");
  s = s.replace(/\\text\{[^}]*\}/g, "");
  s = s.replace(/½/g, "1/2");
  s = s.replace(/⅓/g, "1/3");
  s = s.replace(/¼/g, "1/4");
  s = s.replace(/¾/g, "3/4");
  s = s.replace(/⅔/g, "2/3");

  const fracVal = parseFraction(s);
  if (!isNaN(fracVal)) {
    return fracVal.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  s = s.replace(/^[\$\£\€\¥\₹]\s*/, "");
  s = s.replace(/°$/, "");
  s = s.replace(/\s+/g, " ").trim();

  const numVal = parseFloat(s);
  if (!isNaN(numVal) && /^-?[\d.,]+%?$/.test(s.trim())) {
    const isPercent = s.includes("%");
    const val = isPercent ? numVal : numVal;
    return val.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + (isPercent ? "%" : "");
  }

  return s.toLowerCase();
}

export function checkMathAnswer(userAnswer: string, cleanAnswer: string | null): boolean {
  if (!cleanAnswer || !userAnswer) return false;

  const userNorm = normalizeMathAnswer(userAnswer);
  if (!userNorm) return false;

  const alternatives = cleanAnswer.split("||").map(a => a.trim()).filter(Boolean);

  return alternatives.some(alt => {
    const altNorm = normalizeMathAnswer(alt);
    return userNorm === altNorm || userNorm.includes(altNorm) || altNorm.includes(userNorm);
  });
}
