// SmartMark-inspired grading logic
// Tier 1: exact/normalized match
// Tier 2: mathematical equivalence (requires mathjs)
// Tier 3: LLM semantic match (future — API route)

// ─── Unicode fraction → numeric ─────────────────────────────────────────────
const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3",
  "¼": "1/4", "¾": "3/4",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

// ─── Command word extraction ─────────────────────────────────────────────────
const COMMAND_WORDS = [
  "find", "calculate", "work out", "write", "show", "evaluate",
  "solve", "simplify", "express", "determine", "state", "give",
  "measure", "estimate", "prove", "draw", "sketch", "plot",
  "explain", "describe", "justify", "identify", "complete",
] as const;

// Command words that require essay-style answers — cannot auto-grade with Tier 1/2
const ESSAY_COMMAND_WORDS = new Set([
  "explain", "describe", "justify", "prove", "show",
]);

export function extractCommandWord(text: string): string | null {
  const pattern = new RegExp(`\\b(${COMMAND_WORDS.join("|")})\\b`, "i");
  const m = text.match(pattern);
  return m ? m[0].toLowerCase() : null;
}

// ─── Final answer extraction from explanation ────────────────────────────────
export function extractFinalAnswers(explanation: string): string[] {
  if (!explanation) return [];
  const answers: string[] = [];

  // Pattern 1: "value [N]" — answer followed by marks
  const markPattern = /([^\[\]\n]{1,200}?)\s*\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = markPattern.exec(explanation)) !== null) {
    const candidate = m[1].trim();
    if (candidate && candidate.length < 200) {
      answers.push(candidate);
    }
  }

  // Pattern 2: "= value" or "= $value$" at end of lines
  const eqPattern = /=\s*(.+?)(?:\n|$)/g;
  while ((m = eqPattern.exec(explanation)) !== null) {
    const val = m[1].trim();
    if (val && val.length < 100 && !answers.includes(val)) {
      answers.push(val);
    }
  }

  return answers;
}

// ─── Enhanced normalization (Tier 1) ─────────────────────────────────────────
export function normalizeAnswer(text: string): string {
  let s = text.toLowerCase().trim();

  // Remove currency symbols
  s = s.replace(/[$€£¥]/g, "");

  // Remove common units (preserve numbers)
  s = s.replace(/\b(cm|mm|m|km|g|kg|ml|l|s|min|hours?|days?|degrees?|°[CF]?|%)\b/gi, "");

  // Expand Unicode fractions
  for (const [uni, frac] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(new RegExp(uni, "g"), frac);
  }

  // Unify decimal: .5 → 0.5
  s = s.replace(/(?<!\d)\.(\d+)/g, "0.$1");

  // Scientific notation: 5.8×10⁷ → 58000000, 5.8×10⁻³ → 0.0058
  s = s.replace(/(\d+\.?\d*)\s*[×x]\s*10\s*([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, num, exp) => {
    const superscriptMap: Record<string, string> = {
      "⁻": "-", "⁰": "0", "¹": "1", "²": "2", "³": "3",
      "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    };
    const expStr = [...exp].map((c: string) => superscriptMap[c] || c).join("");
    const e = parseInt(expStr);
    const base = parseFloat(num);
    if (!isNaN(e) && !isNaN(base)) {
      return String(base * Math.pow(10, e));
    }
    return `${num}×10^${e}`;
  });

  // Strip all whitespace and punctuation for comparison
  s = s.replace(/[\s,;:]/g, "");

  return s;
}

// ─── Mathematical equivalence (Tier 2) ───────────────────────────────────────
let _mathjs: any = null;
async function getMathjs(): Promise<any> {
  if (!_mathjs) {
    _mathjs = await import("mathjs");
  }
  return _mathjs;
}

export async function mathEquiv(a: string, b: string): Promise<boolean> {
  // Quick Tier 1 check first
  if (normalizeAnswer(a) === normalizeAnswer(b)) return true;

  try {
    const math = await getMathjs();

    // Try parsing both as math expressions
    const na = a.replace(/\s+/g, "").replace(/[×x]/g, "*").replace(/÷/g, "/");
    const nb = b.replace(/\s+/g, "").replace(/[×x]/g, "*").replace(/÷/g, "/");

    const nodeA = math.parse(na);
    const nodeB = math.parse(nb);

    // Simplify and compare
    const simplifiedA = math.simplify(nodeA);
    const simplifiedB = math.simplify(nodeB);

    return simplifiedA.equals(simplifiedB);
  } catch {
    // If mathjs can't parse, try numeric equivalence
    try {
      const math = await getMathjs();
      const valA = math.evaluate(a.replace(/[×x]/g, "*").replace(/÷/g, "/"));
      const valB = math.evaluate(b.replace(/[×x]/g, "*").replace(/÷/g, "/"));
      return math.abs(valA - valB) < 1e-10;
    } catch {
      return false;
    }
  }
}

// Synchronous fallback for math equivalence (no mathjs)
export function mathEquivSync(a: string, b: string): boolean | null {
  // Quick Tier 1 check
  if (normalizeAnswer(a) === normalizeAnswer(b)) return true;

  // Try numeric comparison
  const na = parseFloat(a.replace(/[^0-9.\-]/g, ""));
  const nb = parseFloat(b.replace(/[^0-9.\-]/g, ""));
  if (!isNaN(na) && !isNaN(nb)) {
    return Math.abs(na - nb) < 0.0001;
  }

  // Can't determine without mathjs
  return null;
}

// ─── Grade result type ───────────────────────────────────────────────────────
export interface GradeResult {
  correct: boolean;
  partial: boolean; // partially correct (Tier 2 matched but not Tier 1)
  tier: 1 | 2 | 3 | 0; // 0 = no match
  matchedAnswer?: string;
}

// ─── Main grading function ───────────────────────────────────────────────────
export async function gradeAnswer(
  studentAnswer: string,
  correctAnswer: string,
  explanation?: string,
  commandWord?: string | null,
): Promise<GradeResult> {
  if (!studentAnswer?.trim()) {
    return { correct: false, partial: false, tier: 0 };
  }

  // Essay-type questions (explain, describe, justify, prove, show) cannot be auto-graded
  if (commandWord && ESSAY_COMMAND_WORDS.has(commandWord.toLowerCase())) {
    return { correct: false, partial: false, tier: 3 };
  }

  // ── Tier 1: Normalized exact match ──────────────────────────────────────
  const na = normalizeAnswer(studentAnswer);
  const nc = normalizeAnswer(correctAnswer);

  if (na === nc) {
    return { correct: true, partial: false, tier: 1, matchedAnswer: correctAnswer };
  }
  if (na.length <= 30 && nc.length <= 30) {
    if (na.includes(nc) || nc.includes(na)) {
      return { correct: true, partial: false, tier: 1, matchedAnswer: correctAnswer };
    }
  }

  // Also check against extracted final answers from explanation
  if (explanation) {
    const finals = extractFinalAnswers(explanation);
    for (const f of finals) {
      const nf = normalizeAnswer(f);
      if (na === nf) {
        return { correct: true, partial: false, tier: 1, matchedAnswer: f };
      }
      // Only substring match for short answers
      if (na.length <= 30 && nf.length <= 30) {
        if (na.includes(nf) || nf.includes(na)) {
          return { correct: true, partial: false, tier: 1, matchedAnswer: f };
        }
      }
    }
  }

  // ── Tier 2: Mathematical equivalence ────────────────────────────────────
  // Check against correctAnswer
  const equivA = await mathEquiv(studentAnswer, correctAnswer);
  if (equivA) {
    return { correct: true, partial: true, tier: 2, matchedAnswer: correctAnswer };
  }

  // Check against final answers from explanation
  if (explanation) {
    const finals = extractFinalAnswers(explanation);
    for (const f of finals) {
      const equivB = await mathEquiv(studentAnswer, f);
      if (equivB) {
        return { correct: true, partial: true, tier: 2, matchedAnswer: f };
      }
    }
  }

  // ── Tier 3: LLM (placeholder — not yet implemented) ─────────────────────
  // Will call /api/grade API route in Phase 2

  return { correct: false, partial: false, tier: 0 };
}

// Synchronous version (no mathjs, no LLM — Tier 1 only)
export function gradeAnswerSync(
  studentAnswer: string,
  correctAnswer: string,
  explanation?: string,
  commandWord?: string | null,
): GradeResult {
  if (!studentAnswer?.trim()) {
    return { correct: false, partial: false, tier: 0 };
  }

  // Essay-type questions (explain, describe, justify, prove, show) cannot be auto-graded
  // with Tier 1/2 — needs LLM semantic matching (Tier 3)
  if (commandWord && ESSAY_COMMAND_WORDS.has(commandWord.toLowerCase())) {
    // Skip auto-grading for essay questions — mark as tier 3 (needs LLM review)
    // Don't mark as correct or incorrect — just say "needs review"
    return { correct: false, partial: false, tier: 3 };
  }

  const na = normalizeAnswer(studentAnswer);
  const nc = normalizeAnswer(correctAnswer);

  // Only do includes matching when both sides are short (<30 chars)
  // Prevents false matches like "1" matching inside a long explanation text
  if (na === nc) {
    return { correct: true, partial: false, tier: 1, matchedAnswer: correctAnswer };
  }
  if (na.length <= 30 && nc.length <= 30) {
    if (na.includes(nc) || nc.includes(na)) {
      return { correct: true, partial: false, tier: 1, matchedAnswer: correctAnswer };
    }
  }

  if (explanation) {
    const finals = extractFinalAnswers(explanation);
    for (const f of finals) {
      const nf = normalizeAnswer(f);
      if (na === nf) {
        return { correct: true, partial: false, tier: 1, matchedAnswer: f };
      }
      // Only substring match for short answers
      if (na.length <= 30 && nf.length <= 30) {
        if (na.includes(nf) || nf.includes(na)) {
          return { correct: true, partial: false, tier: 1, matchedAnswer: f };
        }
      }
    }
  }

  // Try sync math equiv
  const syncResult = mathEquivSync(studentAnswer, correctAnswer);
  if (syncResult === true) {
    return { correct: true, partial: true, tier: 2, matchedAnswer: correctAnswer };
  }

  return { correct: false, partial: false, tier: 0 };
}
