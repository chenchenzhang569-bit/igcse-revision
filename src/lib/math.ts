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

/**
 * Fix SME proprietary markup artifacts using Unicode characters.
 * Use this for plain text contexts (e.g., whitespace-pre-wrap rendering).
 * 
 * - ^2^ → ² (Unicode superscript)
 * - ^2+^ / ^2-^ → ²⁺ / ²⁻ (ion charges)
 * - ~2~ → ₂ (Unicode subscript)
 * - Clean up double-markup artifacts
 */
export function fixMathNotationUnicode(text: string): string {
  let result = text;

  // 1. Fix SME superscript: ^2^, ^3^, ^2+^, ^2-^, ^–4^, ^12^
  result = result.replace(/\^([\d+\-–−]+)\^/g, (_, content) => toSuperscript(content));

  // 2. Fix SME subscript: ~2~, ~3~
  result = result.replace(/~([\d]+)~/g, (_, content) => toSubscript(content));

  // 3. Clean up double-bold superscript artifacts
  result = result.replace(/\*\*\^\*\*([^*]+)\*\*\^\*\*/g, (_, content) => toSuperscript(content));
  result = result.replace(/\*\*\^\*\*([^*\^]+)\*\*\^/g, (_, content) => toSuperscript(content));

  // 4. Handle fragmented markup: *T*^* *^^2^ → T²
  result = result.replace(/\^\*\s*\*\^\^(\d+)\^/g, (_, content) => toSuperscript(content));
  
  // 5. Clean up any stray markup fragments
  result = result.replace(/\^\*(?=\s|$)/g, "");
  result = result.replace(/(?<=\s|^)\*\^(?=\s|$)/g, "");

  return result;
}

/**
 * Fix SME proprietary markup using HTML tags.
 * Use this for ReactMarkdown contexts (paired with rehype-raw).
 * 
 * - ^2^ → <sup>2</sup>
 * - ^2+^ / ^2-^ → <sup>2+</sup>
 * - ~2~ → <sub>2</sub>
 */
export function fixMathNotation(text: string): string {
  let result = text;

  // 1. Fix SME superscript
  result = result.replace(/\^([\d+\-–−]+)\^/g, "<sup>$1</sup>");

  // 2. Fix SME subscript
  result = result.replace(/~([\d]+)~/g, "<sub>$1</sub>");

  // 3. Clean up double-bold superscript artifacts
  result = result.replace(/\*\*\^\*\*([^*]+)\*\*\^\*\*/g, "<sup>$1</sup>");
  result = result.replace(/\*\*\^\*\*([^*\^]+)\*\*\^/g, "<sup>$1</sup>");

  // 4. Handle fragmented markup
  result = result.replace(/\^\*\s*\*\^\^(\d+)\^/g, "<sup>$1</sup>");
  
  // 5. Clean up stray fragments
  result = result.replace(/\^\*(?=\s|$)/g, "");
  result = result.replace(/(?<=\s|^)\*\^(?=\s|$)/g, "");

  return result;
}

/**
 * Clean SME proprietary math markup inside $...$ delimiters.
 * - square root of (expr) end root → \sqrt{expr}
 * - cube root of (expr) end root → \sqrt[3]{expr}
 * - end exponent → (remove)
 */
function cleanSmeMathMarkup(math: string): string {
  let result = math;
  // Fix double-escaped LaTeX commands: \\frac → \frac, \\sqrt → \sqrt, etc.
  // Line breaks (\\) are typically followed by whitespace/newline, not a letter
  result = result.replace(/\\\\([a-zA-Z])/g, "\\$1");
  // Handle spaced and no-space variants: square root of / squarerootof
  result = result.replace(/square\s*root\s*of\s*\(/g, "\\sqrt{");
  // Handle cube root of / cuberootof
  result = result.replace(/cube\s*root\s*of\s*\(/g, "\\sqrt[3]{");
  // Handle end root / endroot (with or without space)
  result = result.replace(/end\s*root/g, "}");
  // Handle end exponent (with or without space)
  result = result.replace(/end\s*exponent/g, "");
  return result;
}

/**
 * Render LaTeX math expressions ($...$ and $$...$$) to KaTeX HTML.
 * Apply this AFTER fixMathNotation() since $ is the LaTeX delimiter.
 * Must be paired with rehype-raw in ReactMarkdown to preserve KaTeX HTML.
 */
export function renderMath(text: string): string {
  let result = text;

  // Convert markdown images to HTML (before LaTeX, so base64 won't trigger $ matching)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Display math: $$...$$
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

  // Inline math: $...$ — must start with letter/digit/backslash/brace/minus
  result = result.replace(/\$(?=[a-zA-Z0-9\\\{\-])(.+?)(?<!\\)\$/g, (_, math) => {
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

/**
 * Full pipeline for ReactMarkdown contexts:
 * fix SME markup (HTML) → render LaTeX math
 */
export function processMathContent(text: string): string {
  return renderMath(fixMathNotation(text));
}

/**
 * Full pipeline for plain text contexts:
 * fix SME markup (Unicode) → render LaTeX math
 */
export function processMathContentUnicode(text: string): string {
  return renderMath(fixMathNotationUnicode(text));
}

// ─── Answer Normalization for Auto-Grading ───

/**
 * Evaluate a fraction string like "1/2" to a decimal number, or return NaN.
 */
function parseFraction(s: string): number {
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const num = parseFloat(m[1]);
    const den = parseFloat(m[2]);
    return den !== 0 ? num / den : NaN;
  }
  return NaN;
}

/**
 * Normalize a math answer for comparison.
 * Handles:
 *  - LaTeX stripping ($...$, \%, etc.)
 *  - Fraction → decimal conversion (1/2 ↔ 0.5)
 *  - Unit stripping ($, °, %, etc.)
 *  - Whitespace/case normalization
 *  - Equivalent decimal representations (0.5 = .5 = 0.50)
 */
export function normalizeMathAnswer(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();

  // Strip LaTeX delimiters
  s = s.replace(/^\$\s*/, "").replace(/\s*\$$/, "");

  // Replace LaTeX commands with plain equivalents
  s = s.replace(/\\%/g, "%");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\div/g, "÷");
  s = s.replace(/\\degree/g, "°");
  s = s.replace(/\\text\{[^}]*\}/g, "");

  // Convert common Unicode fractions
  s = s.replace(/½/g, "1/2");
  s = s.replace(/⅓/g, "1/3");
  s = s.replace(/¼/g, "1/4");
  s = s.replace(/¾/g, "3/4");
  s = s.replace(/⅔/g, "2/3");

  // Try to convert fraction to decimal
  const fracVal = parseFraction(s);
  if (!isNaN(fracVal)) {
    // Round to avoid floating point issues
    return fracVal.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  // Strip currency symbols and degree signs (but keep the number)
  s = s.replace(/^[\$\£\€\¥\₹]\s*/, "");
  s = s.replace(/°$/, "");

  // Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();

  // Try parsing as number for decimal normalization
  const numVal = parseFloat(s);
  if (!isNaN(numVal) && /^-?[\d.,]+%?$/.test(s.trim())) {
    // Strip % for comparison
    const isPercent = s.includes("%");
    const val = isPercent ? numVal : numVal;
    return val.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + (isPercent ? "%" : "");
  }

  // Lowercase
  return s.toLowerCase();
}

/**
 * Check if user's answer matches any of the acceptable clean answers.
 * cleanAnswer can be a single string or "||" separated list of alternatives.
 */
export function checkMathAnswer(userAnswer: string, cleanAnswer: string | null): boolean {
  if (!cleanAnswer || !userAnswer) return false;

  const userNorm = normalizeMathAnswer(userAnswer);
  if (!userNorm) return false;

  // Split by || for multiple acceptable answers
  const alternatives = cleanAnswer.split("||").map(a => a.trim()).filter(Boolean);

  return alternatives.some(alt => {
    const altNorm = normalizeMathAnswer(alt);
    // Exact match or one contains the other (for partial answers)
    return userNorm === altNorm || userNorm.includes(altNorm) || altNorm.includes(userNorm);
  });
}
