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
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  // Inline math: $...$ — match broadly, then skip pure numbers/currency (e.g. $15.95, $26)
  result = result.replace(/\$(.+?)\$/g, (match, math) => {
    const trimmed = math.trim();
    // Skip pure currency amounts: digits only, possibly with . , and trailing punctuation
    if (/^\d[\d,.\s]*\.?\s*$/.test(trimmed)) return match;
    try {
      return katex.renderToString(trimmed, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return match;
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
