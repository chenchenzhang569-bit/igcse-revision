/**
 * Grade a student's structured answer against the mark scheme in the explanation.
 * Parses the explanation text to extract mark scheme keywords, then performs
 * case-insensitive fuzzy matching to award partial marks.
 */

export interface MarkPoint {
  point: string;
  keywords: string[];
  marks: number;
  isAlternative: boolean; // "OR" alternative
}

export interface GradedSubQuestion {
  subLabel: string; // e.g. "i", "ii", "a"
  correctAnswer: string; // model answer text
  markPoints: MarkPoint[];
  totalMarks: number;
}

export interface GradedResult {
  subLabel: string;
  userAnswer: string;
  markPoints: { point: string; keywords: string[]; marks: number; matched: string[]; missed: string[] }[];
  score: number;
  totalMarks: number;
}

/**
 * Parse the explanation text into graded sub-questions with mark points.
 *
 * Pattern examples:
 *   "(i) The main group ... is: Mammals; [1 mark] (ii) Two features ... are: Hair; [1 mark] External ears; [1 mark] [Total: 3 marks]"
 *   "Two other substances ... are: Any two from the following: Urea; [1 mark] Salt(s) / (named) ions; [1 mark]"
 *   "Cylinder [B1]"
 *   "Subtract the numbers... 883 [B1]"
 */
export function parseMarkScheme(explanation: string): GradedSubQuestion[] {
  if (!explanation) return [];

  // Normalize: remove [Total: N marks] and [N marks] trailing
  const clean = explanation
    .replace(/\[Total:\s*\d+\s*marks?\]/gi, "")
    .replace(/Maximum\s*\[?\d+\]?\s*marks?[^]*$/gi, "")
    .trim();

  // Try to split by sub-question markers: (i), (ii), i), ii), (a), (b), etc.
  const subPattern = /(\([ivxa-d]+\)|[ivx]+\))\s*/gi;
  const subMatches: { idx: number; label: string }[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = subPattern.exec(clean)) !== null) {
    subMatches.push({ idx: sm.index, label: sm[0].replace(/[()]/g, "") });
  }

  if (subMatches.length === 0) {
    // No sub-parts — treat the whole thing as one
    const ms = parseMarkPoints(clean);
    if (ms.length > 0) {
      return [{ subLabel: "", correctAnswer: clean, markPoints: ms, totalMarks: ms.reduce((s, m) => s + m.marks, 0) }];
    }
    return [];
  }

  // Split by sub-question markers
  const result: GradedSubQuestion[] = [];
  for (let i = 0; i < subMatches.length; i++) {
    const start = subMatches[i].idx;
    const end = i + 1 < subMatches.length ? subMatches[i + 1].idx : clean.length;
    // Include the marker text
    const subText = clean.slice(start, end).trim();
    const ms = parseMarkPoints(subText);
    if (ms.length > 0) {
      result.push({
        subLabel: subMatches[i].label,
        correctAnswer: subText,
        markPoints: ms,
        totalMarks: ms.reduce((s, m) => s + m.marks, 0),
      });
    }
  }

  return result;
}

/**
 * Parse individual mark points from a sub-question answer text.
 * Looks for patterns like "keyword; [1 mark]" or "phrase [B1]" or "keyword [1]"
 */
function parseMarkPoints(text: string): MarkPoint[] {
  const points: MarkPoint[] = [];

  // Pattern 1: "keyword; [N mark(s)]" or "keyword. [N mark(s)]"
  // Pattern 2: "keyword [B1]" (math papers)
  // Pattern 3: "Any two from the following: A; [1] B; [1]"

  // Remove the sub-question label prefix
  let t = text.replace(/^\(?[ivxa-d]+\)?\s*/i, "").trim();

  // Handle "Any X from the following:" prefix
  const anyFromMatch = t.match(/Any\s+(?:two|one|three|four|five)\s+from\s+the\s+following\s*:?\s*/i);
  if (anyFromMatch) {
    t = t.slice(anyFromMatch.index! + anyFromMatch[0].length);
  }

  // Split by mark brackets: [1 mark], [2 marks], [B1], [1], [2]
  const parts = t.split(/(\[\d+\s*marks?\]|\[B\d+\])\s*/i);

  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i].trim();
    const bracket = parts[i + 1]?.trim() || "";

    // Check if this bracket looks like a mark indicator
    const markMatch = bracket.match(/^\[(\d+)\s*marks?\]|^\[B(\d+)\]/i);
    if (!markMatch) continue;

    const marks = parseInt(markMatch[1] || markMatch[2] || "1");
    const cleaned = segment.replace(/[;,.]+$/, "").trim();
    if (!cleaned) { i++; continue; } // skip the bracket part too

    // Check for OR alternatives
    const orParts = cleaned.split(/\s+(?:OR|or)\s+/);
    if (orParts.length > 1) {
      for (const alt of orParts) {
        const ak = extractKeywords(alt);
        if (ak.length > 0) {
          points.push({ point: alt, keywords: ak, marks, isAlternative: true });
        }
      }
    } else {
      const kw = extractKeywords(cleaned);
      if (kw.length > 0) {
        points.push({ point: cleaned, keywords: kw, marks, isAlternative: false });
      }
    }
    i++; // skip the bracket part
  }

  // If no mark brackets found, try simpler patterns
  if (points.length === 0 && t.length > 0) {
    // Split by semicolons
    const semis = t.split(";").filter((s) => s.trim().length > 0);
    for (const s of semis) {
      const cleaned = s.replace(/^[-•*]\s*/, "").trim();
      if (cleaned.length > 2) {
        const kw = extractKeywords(cleaned);
        if (kw.length > 0) {
          points.push({ point: cleaned, keywords: kw, marks: 1, isAlternative: false });
        }
      }
    }
  }

  return points;
}

/**
 * Extract meaningful keywords from a mark point.
 * Removes common connectors, instruction words, and keeps the core terms.
 */
function extractKeywords(text: string): string[] {
  const cleaned = text
    .replace(/\[?\d+\s*marks?\]?/gi, "")
    .replace(/^the\s+/i, "")
    .replace(/^is\s+/i, "")
    .replace(/^are\s+/i, "")
    .replace(/^to\s+/i, "")
    .replace(/^a\s+/i, "")
    .replace(/^an\s+/i, "")
    .replace(/any\s+valid[^;,.]*/gi, "")
    .trim();

  if (!cleaned || cleaned.length < 2) return [];

  // Split into key terms
  const words = cleaned.split(/[,;/]\s*/).map((w) => w.trim()).filter(Boolean);

  // Also extract parenthesized alternatives
  const expanded: string[] = [];
  for (const w of words) {
    const withParenAlt = w.replace(/\(s\)/g, "s"); // salt(s) → salts
    expanded.push(withParenAlt);

    // If word has / alternatives like "ion / mineral"
    const slashParts = w.split(/\s*\/\s*/);
    if (slashParts.length > 1) {
      expanded.push(...slashParts);
    }
  }

  return [...new Set(expanded.filter((k) => k.length >= 2))];
}

/**
 * Grade a student's answer against parsed mark scheme.
 * Returns detailed results with matched and missed keywords.
 */
export function gradeAnswer(
  markScheme: GradedSubQuestion[],
  userAnswers: Record<string, string>,
): GradedResult[] {
  return markScheme.map((ms) => {
    const userAnswer = (userAnswers[ms.subLabel] || "").toLowerCase().trim();
    const results: GradedResult["markPoints"] = [];
    let score = 0;

    for (const mp of ms.markPoints) {
      const matched: string[] = [];
      const missed: string[] = [];

      for (const kw of mp.keywords) {
        const kwLower = kw.toLowerCase();
        // Try exact match first, then fuzzy
        if (userAnswer.includes(kwLower)) {
          matched.push(kw);
        } else if (fuzzyMatch(userAnswer, kwLower)) {
          matched.push(kw + " ~");
        } else {
          missed.push(kw);
        }
      }

      // Award marks if at least one keyword matched
      const matchRatio = mp.keywords.length > 0 ? matched.length / mp.keywords.length : 0;
      const awarded = matchRatio >= 0.5 ? mp.marks : 0;
      score += awarded;

      results.push({
        point: mp.point,
        keywords: mp.keywords,
        marks: awarded,
        matched,
        missed,
      });
    }

    return {
      subLabel: ms.subLabel,
      userAnswer,
      markPoints: results,
      score: Math.min(score, ms.totalMarks),
      totalMarks: ms.totalMarks,
    };
  });
}

/**
 * Simple fuzzy match: checks if most characters appear in order.
 */
function fuzzyMatch(text: string, keyword: string): boolean {
  if (keyword.length < 4) return false; // only fuzzy for longer keywords
  let ti = 0;
  for (let ki = 0; ki < keyword.length && ti < text.length; ki++) {
    while (ti < text.length && text[ti] !== keyword[ki]) ti++;
    if (ti >= text.length) return false;
    ti++;
  }
  return true;
}

/**
 * Parse the stem text to identify sub-questions.
 * Returns an array of sub-question labels found in the stem.
 */
export function parseSubQuestions(stem: string): { label: string; text: string; marks: number }[] {
  if (!stem) return [];

  // Common IGCSE sub-question markers: (i), (ii), i), ii), (a), (b), 1., 2.
  const subPattern = /(\([ivxa-d]+\)|[ivx]+\))\s*/gi;
  const subMatches: { idx: number; label: string }[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = subPattern.exec(stem)) !== null) {
    subMatches.push({ idx: sm.index, label: sm[0].replace(/[()]/g, "").trim() });
  }

  if (subMatches.length === 0) {
    // Single question - check for [marks] notation
    const marksMatch = stem.match(/\[(\d+)\]\s*$/m);
    const marks = marksMatch ? parseInt(marksMatch[1]) : 1;
    return [{ label: "", text: stem, marks }];
  }

  const result: { label: string; text: string; marks: number }[] = [];
  for (let i = 0; i < subMatches.length; i++) {
    const start = subMatches[i].idx;
    const end = i + 1 < subMatches.length ? subMatches[i + 1].idx : stem.length;
    const subText = stem.slice(start, end).replace(/^\(?[ivxa-d]+\)?\s*/i, "").trim();

    // Extract marks
    const marksMatch = subText.match(/\[(\d+)\]\s*$/m);
    const marks = marksMatch ? parseInt(marksMatch[1]) : 1;

    result.push({
      label: subMatches[i].label,
      text: subText.replace(/\s*\[\d+\]\s*$/m, "").trim(),
      marks,
    });
  }

  return result;
}
