"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import "katex/dist/katex.min.css";
import { getSupabaseClient } from "@/lib/supabase-client";
import { createBrowserClient } from "@supabase/ssr";
import { renderMath } from "@/lib/math";
import BookmarkButton from "@/components/BookmarkButton";
import ReportBugModal, { type BugContext } from "@/components/ReportBugModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  id: string;
  question_text: string;
  answer_text: string;
  clean_answer_text: string | null;
  explanation: string | null;
  clean_explanation: string | null;
  difficulty: string;
  question_type: string;
  marks: number;
  options: string[] | null;
  correct_answer: string | null;
  sort_order: number;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  easy: { color: "bg-green-50 text-green-700 border-green-200", label: "Easy", icon: "🟢" },
  medium: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Medium", icon: "🟡" },
  hard: { color: "bg-red-50 text-red-700 border-red-200", label: "Hard", icon: "🔴" },
};

const MATH_SYMBOLS = [
  "√", "π", "°", "²", "³", "×", "÷", "±",
  "≤", "≥", "≠", "≈", "∞", "∠", "→", "%",
  "½", "¼", "¾", "⁻¹", "Δ", "θ", "Σ", "∫",
];

const DIFF_ORDER = ["easy", "medium", "hard"] as const;

function markdownify(text: string): string {
  // Convert <img> HTML tags to markdown ![]() syntax so ReactMarkdown renders them
  return text.replace(/<img\s+src="([^"]*)"(?:\s+alt="([^"]*)")?\s*\/?>/g, (_, src, alt) => {
    return `![${alt || "diagram"}](${src})`;
  });
}

// Render mixed content: markdown + KaTeX math
// ─── Table Detection & Rendering ───
function findTables(stem: string): { start: number; end: number; html: string }[] {
  const tables: { start: number; end: number; html: string }[] = [];
  const htmlTableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlTableRegex.exec(stem)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, html: m[0] });
  }
  // Also detect markdown pipe tables
  const lines = stem.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const sepLine = lines[i + 1]?.trim() || "";
    if (/^\|[\s\-:\|]+\|$/.test(sepLine)) {
      // Found a separator row. Walk back to find the table header start.
      // Handle multi-line pipe table cells AND inline tables (text before |)
      let headerStart = i;
      while (headerStart >= 0) {
        const l = lines[headerStart].trim();
        if (l.startsWith("|") || l.includes("|")) break;
        if (l === "" && headerStart <= i) { headerStart++; break; }
        headerStart--;
      }
      if (headerStart < 0) { i++; continue; }
      
      let end = i + 2;
      while (end < lines.length && (lines[end].includes("|") || lines[end].trim() === "")) end++;
      while (end > i + 2 && lines[end - 1].trim() === "") end--;
      
      const mdLines = lines.slice(headerStart, end);
      // Strip non-table prefix from first line if it contains text before |
      const firstPipe = mdLines[0].indexOf("|");
      if (firstPipe > 0) mdLines[0] = mdLines[0].slice(firstPipe);
      
      const html = mdTableToHtml(mdLines);
      if (html && !tables.some(t => t.start <= stem.indexOf(mdLines[0]))) {
        tables.push({ start: stem.indexOf(mdLines[0]), end: stem.indexOf(mdLines[mdLines.length - 1]) + mdLines[mdLines.length - 1].length, html });
      }
      i = end;
    }
  }
  tables.sort((a, b) => a.start - b.start);
  return tables;
}

function mdTableToHtml(lines: string[]): string {
  if (lines.length < 2) return "";
  // Parse headers
  let headers = lines[0].split("|").slice(1, -1).map(h => h.trim());
  let bodyStart = 2;
  // If headers are all empty, use first data row as headers
  if (headers.every(h => h === "") && lines.length > 2) {
    headers = lines[2].split("|").slice(1, -1).map(h => h.trim());
    bodyStart = 3;
  }
  let html = '<table class="w-full text-sm border-collapse border border-gray-300 mb-4"><thead><tr>';
  for (const h of headers) {
    html += `<th class="border border-gray-300 px-3 py-1.5 bg-gray-100 text-left font-semibold">${h}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let i = bodyStart; i < lines.length; i++) {
    const cells = lines[i].split("|").slice(1, -1).map(c => c.trim());
    if (cells.length === 0) continue;
    html += '<tr>';
    for (const c of cells) {
      html += `<td class="border border-gray-300 px-3 py-1.5">${c}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderStemWithTables(stem: string): string {
  const tables = findTables(stem);
  if (tables.length === 0) return stem;
  let result = "";
  let lastEnd = 0;
  for (const t of tables) {
    result += stem.slice(lastEnd, t.start) + "\n" + t.html + "\n";
    lastEnd = t.end;
  }
  result += stem.slice(lastEnd);
  return result;
}

// ─── Sub-part parsing ───
interface SubPart { label: string; text: string; hasChildren: boolean; }
function parseSubParts(stem: string): SubPart[] {
  if (!stem) return [];

  const isRoman = (s: string) => /^[ivx]+$/i.test(s);

  // Find all markers
  const allMarkers: { idx: number; label: string; raw: string; end: number }[] = [];
  const re = /([ \t]*)(\([a-z]+\)|[ivx]+\))\s*/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stem)) !== null) {
    allMarkers.push({
      idx: m.index,  // raw position, DON'T skip \n
      label: m[2].replace(/[()]/g, "").trim(),
      raw: m[0],
      end: 0,
    });
  }

  // Fallback to old flat matching (bold markers etc.)
  if (allMarkers.length === 0) {
    const parts: SubPart[] = [];
    const regex = /(?:\*\*\(([a-z]+|[ivx]+)\)\*\*|\(([a-z]+|[ivx]+)\)|^([a-z]+|[ivx]+)[.)])\s*/gim;
    let lastIdx = 0;
    let mm: RegExpExecArray | null;
    while ((mm = regex.exec(stem)) !== null) {
      const label = (mm[1] || mm[2] || mm[3]).trim();
      if (parts.length > 0) {
        parts[parts.length - 1].text = stem.slice(lastIdx, mm.index).trim();
      }
      parts.push({ label, text: "", hasChildren: false });
      lastIdx = mm.index + mm[0].length;
    }
    if (parts.length > 0) {
      parts[parts.length - 1].text = stem.slice(lastIdx).trim();
    }
    return parts;
  }

  // Compute end positions
  for (let i = 0; i < allMarkers.length; i++) {
    allMarkers[i].end = i + 1 < allMarkers.length ? allMarkers[i + 1].idx : stem.length;
  }

  // Classify: LETTER + next ROMAN = parent; everything else = leaf
  const parts: SubPart[] = [];
  let i = 0;
  while (i < allMarkers.length) {
    const mk = allMarkers[i];
    const next = allMarkers[i + 1];

    if (!isRoman(mk.label) && next && isRoman(next.label)) {
      // Parent letter with roman children
      const children: typeof allMarkers = [];
      let j = i + 1;
      while (j < allMarkers.length && isRoman(allMarkers[j].label)) {
        children.push(allMarkers[j]);
        j++;
      }
      // Parent text: before first child
      const pText = stem.slice(mk.idx + mk.raw.length, children[0].idx).trim();
      parts.push({ label: mk.label, text: pText, hasChildren: true });
      // Children
      for (const ch of children) {
        const cText = stem.slice(ch.idx + ch.raw.length, ch.end).trim()
          .replace(/\s*\[\d+\]\s*$/m, "").trim();
        parts.push({ label: ch.label, text: cText, hasChildren: false });
      }
      i = j;
    } else {
      // Leaf
      const text = stem.slice(mk.idx + mk.raw.length, mk.end).trim()
        .replace(/\s*\[\d+\]\s*$/m, "").trim();
      parts.push({ label: mk.label, text, hasChildren: false });
      i++;
    }
  }

  return parts;
}

// Normalize algebraic expression: sort terms so 5+7n and 7n+5 become the same
function normalizeAlgebraic(expr: string): string {
  if (!/[a-z]/i.test(expr)) return expr;       // no variables → skip
  if (!/[+\-]/.test(expr)) return expr;        // no operators → skip
  
  let s = expr.replace(/\s+/g, '').replace(/\\/g, '');  // strip spaces + backslashes for grading
  if (s[0] !== '+' && s[0] !== '-') s = '+' + s;
  
  const terms: string[] = [];
  const termRe = /[+\-][^+\-]+/g;
  let m: RegExpExecArray | null;
  while ((m = termRe.exec(s)) !== null) {
    terms.push(m[0]);
  }
  
  terms.sort((a, b) => {
    const aVar = /[a-z]/i.test(a);
    const bVar = /[a-z]/i.test(b);
    if (aVar && !bVar) return -1;
    if (!aVar && bVar) return 1;
    return a.replace(/[+\-]/, '').trim().localeCompare(b.replace(/[+\-]/, '').trim());
  });
  
  let result = terms.join('');
  if (result.startsWith('+')) result = result.substring(1);
  return result;
}

export default function TopicQuestionsClient({ topicId, preloadedQuestions, bugContext }: {
  topicId: string;
  preloadedQuestions?: any[];
  bugContext?: { board: string; subject: string; code: string; topicName: string };
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDifficulty, setActiveDifficulty] = useState<string>("easy");
  const [userId, setUserId] = useState<string | null>(null);
  const storageKey = userId ? `topic-answers-${userId}-${topicId}` : `topic-answers-${topicId}`;

  // Fetch userId for user-specific localStorage key
  useEffect(() => {
    (async () => {
      const ssrClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await ssrClient.auth.getSession();
      setUserId(session?.user?.id || null);
    })();
  }, []);

  // answers[questionId] = user's answer string
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // graded[questionId] = true if already graded
  const [graded, setGraded] = useState<Record<string, boolean>>({});
  // correct[questionId] = whether user's answer was correct
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  // sub-part grading: subCorrectMap[subKey] and subGraded[subKey]
  const [subCorrectMap, setSubCorrectMap] = useState<Record<string, boolean>>({});
  const [subGraded, setSubGraded] = useState<Record<string, boolean>>({});
  // submitted groups
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [markSchemeVisible, setMarkSchemeVisible] = useState<Record<string, boolean>>({});

  // Fetch bookmarked question IDs for "Saved" filter
  useEffect(() => {
    (async () => {
      try {
        const ssrClient = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await ssrClient.auth.getSession();
        if (!session?.access_token) { setBookmarksLoaded(true); return; }
        const res = await fetch("/api/bookmarks", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarkedIds(new Set(data.map((b: any) => b.question.id)));
        }
      } catch {} 
      setBookmarksLoaded(true);
    })();
  }, []);

  // Load saved answers from localStorage (browser only)
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.graded) setGraded(parsed.graded);
        if (parsed.correctMap) setCorrectMap(parsed.correctMap);
        if (parsed.subCorrectMap) setSubCorrectMap(parsed.subCorrectMap);
        if (parsed.subGraded) setSubGraded(parsed.subGraded);
        if (parsed.submitted) setSubmitted(new Set(parsed.submitted));
        if (parsed.activeDifficulty) setActiveDifficulty(parsed.activeDifficulty);
      }
    } catch {}
  }, [storageKey]);

  // Save to localStorage on changes (browser only)
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    if (Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        answers, graded, correctMap, subCorrectMap, subGraded,
        submitted: Array.from(submitted),
        activeDifficulty,
      }));
    } catch {}
  }, [answers, graded, correctMap, submitted, activeDifficulty, storageKey]);

  useEffect(() => {
    if (preloadedQuestions && preloadedQuestions.length > 0) {
      setAllQuestions(preloadedQuestions);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
        const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
        const res = await fetch(
          `${API}/questions?select=*&topic_id=eq.${topicId}&order=sort_order`,
          { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAllQuestions(data || []);
      } catch (e) {
        console.error("Failed to load questions:", e);
      }
      setLoading(false);
    })();
  }, [topicId, preloadedQuestions]);

  // Handle ?saved=1&q=questionId from my-bank link
  useEffect(() => {
    if (loading || !bookmarksLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const savedParam = params.get("saved");
    const qParam = params.get("q");

    if (savedParam === "1") {
      setShowSavedOnly(true);
    }

    if (qParam && allQuestions.length > 0 && bookmarkedIds.size > 0) {
      // Find the question in the saved set
      if (!bookmarkedIds.has(qParam)) return;
      // Wait for savedQs to update, then find position
      const savedList = allQuestions.filter((q) => bookmarkedIds.has(q.id));
      const idx = savedList.findIndex((q) => q.id === qParam);
      if (idx >= 0) {
        setCurrentIdx(idx);
        // Scroll to question card after render
        setTimeout(() => {
          const el = document.querySelector(`[data-qid="${qParam}"]`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 400);
      }
      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }
  }, [loading, bookmarksLoaded, allQuestions, bookmarkedIds]);

  if (loading) return <p className="text-gray-400 py-8 text-center">Loading questions...</p>;
  if (allQuestions.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500 mt-6">
        <p className="font-medium">No questions yet</p>
        <p className="text-sm mt-1">Questions are being prepared for this topic</p>
      </div>
    );
  }

  // Group by difficulty
  const byDifficulty: Record<string, Question[]> = { easy: [], medium: [], hard: [] };
  for (const q of allQuestions) {
    const d = q.difficulty || "medium";
    if (byDifficulty[d]) byDifficulty[d].push(q);
  }

  const difficulties = DIFF_ORDER.filter((d) => byDifficulty[d].length > 0);

  // All difficulties unlocked immediately
  const unlockedDifficulty: string | null = difficulties[difficulties.length - 1] || null;

  // Saved filter: when active, show all bookmarked questions across all difficulties
  const savedQs = showSavedOnly
    ? allQuestions.filter((q) => bookmarkedIds.has(q.id))
    : [];

  const currentQs = showSavedOnly ? savedQs : (byDifficulty[activeDifficulty] || []);
  const q = currentQs[currentIdx];

  // Compute scores
  const scores: Record<string, { correct: number; total: number }> = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
  for (const qq of allQuestions) {
    const d = qq.difficulty || "medium";
    if (graded[qq.id]) {
      scores[d].total++;
      if (correctMap[qq.id]) scores[d].correct++;
    }
  }

  const handleRetry = (diff: string) => {
    // Reset answers & grades for this difficulty
    const qs = byDifficulty[diff] || [];
    const newAnswers = { ...answers };
    const newGraded = { ...graded };
    const newCorrect = { ...correctMap };
    const newSubCorrect = { ...subCorrectMap };
    const newSubGraded = { ...subGraded };
    for (const qq of qs) {
      delete newAnswers[qq.id];
      delete newGraded[qq.id];
      delete newCorrect[qq.id];
      // Also clear sub-part answers
      const sp = parseSubParts(parseQuestion(qq.question_text).stem);
      for (const s of sp) {
        delete newAnswers[`${qq.id}-${s.label}`];
        delete newSubCorrect[`${qq.id}-${s.label}`];
        delete newSubGraded[`${qq.id}-${s.label}`];
      }
    }
    setAnswers(newAnswers);
    setGraded(newGraded);
    setCorrectMap(newCorrect);
    setSubCorrectMap(newSubCorrect);
    setSubGraded(newSubGraded);
    setSubmitted((prev) => { const s = new Set(prev); s.delete(diff); return s; });
    setActiveDifficulty(diff);
    setCurrentIdx(0);
  };

  const handleClearAll = () => {
    setAnswers({});
    setGraded({});
    setCorrectMap({});
    setSubmitted(new Set());
    setActiveDifficulty(difficulties[0] || "easy");
    setCurrentIdx(0);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const handleGradeOne = (qId: string, q: Question, userAns: string) => {
    if (graded[qId]) return; // already graded
    const isMcq = q.question_type === "multiple_choice" || q.question_text.includes("\nA) ");
    // Use clean_answer_text if available, fallback to answer_text
    const answerText = q.clean_answer_text || q.answer_text || "";
    const explanationText = q.clean_explanation || q.explanation || undefined;
    let correct: boolean;
    if (isMcq) {
      correct = userAns === answerText.trim().charAt(0);
    } else {
      // Normalize delimiters: treat ; ； , all as same
      const userNorm = normalizeAlgebraic(userAns.toLowerCase().replace(/[;；,]/g, ' ').replace(/\s+/g, ' ').trim());
      const answers = answerText.split('||').map(a => 
        normalizeAlgebraic(a.toLowerCase().replace(/[;；,]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(\([a-z0-9]+\)\s*)+/i, '').trim())
      );
      correct = answers.includes(userNorm);
    }
    setCorrectMap((prev) => ({ ...prev, [qId]: correct }));
    setGraded((prev) => ({ ...prev, [qId]: true }));
  };

  const handleSubmitGroup = () => {
    // Grade all ungraded questions in this difficulty
    const qs = byDifficulty[activeDifficulty] || [];
    const newSubCorrect: Record<string, boolean> = {};
    const newSubGraded: Record<string, boolean> = {};
    
    for (const qq of qs) {
      // Grade sub-questions independently
      const sp = parseSubParts(parseQuestion(qq.question_text).stem);
      const leafSubs = sp.filter(s => !s.hasChildren);
      if (leafSubs.length >= 1) {
        for (const sub of leafSubs) {
          const subKey = `${qq.id}-${sub.label}`;
          const subAns = answers[subKey] || "";
          if (!graded[qq.id] && subAns.trim()) {
            const answerText = qq.clean_answer_text || qq.answer_text || "";
            const subAnsNorm = normalizeAlgebraic(subAns.toLowerCase().replace(/[;；,]/g, ' ').replace(/\s+/g, ' ').trim());
            const answerParts = answerText.split('||').map(a => 
              normalizeAlgebraic(a.toLowerCase().replace(/[;；,]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(\([a-z0-9]+\)\s*)+/i, '').trim())
            );
            // Positional matching: i-th leaf sub matches i-th answer part
            const leafIdx = leafSubs.indexOf(sub);
            if (leafIdx >= answerParts.length) {
              // No answer to compare — mark wrong
              newSubCorrect[subKey] = false;
            } else if (answerParts[leafIdx] === subAnsNorm) {
              newSubCorrect[subKey] = true;
            }
            newSubGraded[subKey] = true;
          }
        }
        // Mark parent as graded if any leaf sub-question attempted
        const leafKeys = leafSubs.map(s => `${qq.id}-${s.label}`);
        if (leafKeys.some(k => answers[k]?.trim())) {
          setGraded((prev) => ({ ...prev, [qq.id]: true }));
          const allCorrect = leafKeys.every(k => newSubCorrect[k] === true);
          setCorrectMap((prev) => ({ ...prev, [qq.id]: allCorrect }));
        }
      } else {
        const ans = answers[qq.id] || "";
        if (!graded[qq.id] && ans.trim()) {
          handleGradeOne(qq.id, qq, ans);
        }
      }
    }
    
    if (Object.keys(newSubCorrect).length > 0) {
      setSubCorrectMap((prev) => ({ ...prev, ...newSubCorrect }));
      setSubGraded((prev) => ({ ...prev, ...newSubGraded }));
    }
  };

  const allGradedInGroup = (() => {
    const qs = byDifficulty[activeDifficulty] || [];
    return qs.every((qq) => graded[qq.id]);
  })();

  const allAnsweredInGroup = (() => {
    const qs = byDifficulty[activeDifficulty] || [];
    return qs.every((qq) => {
      const sp = parseSubParts(parseQuestion(qq.question_text).stem);
      const leafSubs = sp.filter(s => !s.hasChildren);
      if (leafSubs.length >= 1) {
        return leafSubs.every(s => (answers[`${qq.id}-${s.label}`] || "").trim());
      }
      return (answers[qq.id] || "").trim();
    });
  })();

  const handleDifficultyChange = (d: string) => {
    if (d === activeDifficulty) return;
    setActiveDifficulty(d);
    setCurrentIdx(0);
  };

  // Completion screen for a group
  if (!q || submitted.has(activeDifficulty)) {
    const diffQs = byDifficulty[activeDifficulty] || [];
    const s = scores[activeDifficulty];
    return (
      <div className="mt-6">
        <DifficultyTabs
          difficulties={difficulties}
          active={activeDifficulty}
          scores={scores}
          byDifficulty={byDifficulty}
          submitted={submitted}
          unlockedDifficulty={unlockedDifficulty}
          onChange={handleDifficultyChange}
        />
        <div className="bg-white border rounded-xl p-8 text-center mt-4">
          <span className="text-5xl">🎉</span>
          <h3 className="text-lg font-bold mt-3 text-primary-900">
            {activeDifficulty.charAt(0).toUpperCase() + activeDifficulty.slice(1)} Complete!
          </h3>
          {s.total > 0 ? (
            <p className="text-gray-500 mt-1">
              {s.correct}/{s.total} correct ({Math.round((s.correct / s.total) * 100)}%)
            </p>
          ) : (
            <p className="text-gray-400 mt-1 text-sm">No questions graded</p>
          )}
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={() => handleRetry(activeDifficulty)}
              className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 text-sm">
              Retry
            </button>
            {difficulties.indexOf(activeDifficulty) < difficulties.length - 1 && (
              <button onClick={() => handleDifficultyChange(difficulties[difficulties.indexOf(activeDifficulty) + 1])}
                className="bg-white border border-primary-300 text-primary-600 px-5 py-2 rounded-lg font-medium hover:bg-primary-50 text-sm">
                Next: {DIFFICULTY_CONFIG[difficulties[difficulties.indexOf(activeDifficulty) + 1]]?.label} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isMcq = q.question_type === "multiple_choice" || q.question_text.includes("\nA) ");
  const { stem, options } = parseQuestion(q.question_text);
  const subParts = parseSubParts(stem);
  const hasSubParts = subParts.length > 1;
  // For multi-part: combine sub-answers; for single: use direct answer
  const userAns = hasSubParts
    ? subParts.map(sp => answers[`${q.id}-${sp.label}`] || "").join(" ").trim()
    : (answers[q.id] || "");
  const isGraded = graded[q.id] || false;
  const isCorrect = correctMap[q.id] || false;

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, currentQs.length - 1));
    setCurrentIdx(clamped);
  };

  const isLocked = (d: string) => {
    const dIdx = difficulties.indexOf(d);
    const unlockedIdx = difficulties.indexOf(unlockedDifficulty || "");
    return dIdx > unlockedIdx;
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <DifficultyTabs
          difficulties={difficulties}
          active={showSavedOnly ? "" : activeDifficulty}
          scores={scores}
          byDifficulty={byDifficulty}
          submitted={submitted}
          unlockedDifficulty={unlockedDifficulty}
          onChange={(d) => { setShowSavedOnly(false); handleDifficultyChange(d); }}
        />
        {bookmarksLoaded && (
          <button
            onClick={() => { setShowSavedOnly(!showSavedOnly); setCurrentIdx(0); }}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              showSavedOnly
                ? "bg-red-50 text-red-600 border-red-300"
                : "bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-500"
            }`}
          >
            ♥ Saved ({allQuestions.filter((q) => bookmarkedIds.has(q.id)).length})
          </button>
        )}
      </div>

      {/* Progress */}
      {q && (
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Question {currentIdx + 1} of {currentQs.length}</span>
        <span>{q.difficulty} · {q.marks} mark{q.marks > 1 ? "s" : ""}</span>
      </div>
      )}
      {q && (
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / currentQs.length) * 100}%` }} />
      </div>
      )}

      {/* Empty state for saved filter */}
      {showSavedOnly && savedQs.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center">
          <p className="text-gray-400 text-5xl mb-3">💾</p>
          <p className="text-gray-600 font-medium">No saved questions in this subtopic</p>
          <p className="text-gray-400 text-sm mt-1">
            Click ♡ on any question card to save it here.
          </p>
          <button
            onClick={() => setShowSavedOnly(false)}
            className="mt-4 text-primary-600 hover:underline text-sm font-medium"
          >
            ← Show all questions
          </button>
        </div>
      ) : !q ? (
        <div className="bg-white border rounded-xl p-12 text-center">
          <p className="text-gray-400">No questions available</p>
        </div>
      ) : (<>

      {/* Question navigator dots */}
      <div className="flex gap-1.5 flex-wrap">
        {currentQs.map((qq, i) => {
          const a = (answers[qq.id] || "").trim();
          const g = graded[qq.id];
          const c = correctMap[qq.id];
          let bg = "bg-gray-200";
          if (g && c) bg = "bg-green-400";
          else if (g && !c) bg = "bg-red-400";
          else if (a) bg = "bg-primary-300";
          if (i === currentIdx) bg = g && c ? "bg-green-600" : g && !c ? "bg-red-600" : "bg-primary-600";
          return (
            <button
              key={qq.id}
              onClick={() => goTo(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium text-white ${bg} transition hover:opacity-80`}
              title={`Q${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      <div className="bg-white border rounded-xl p-5 sm:p-6" data-qid={q.id}>
        {/* Header: difficulty badge + bookmark */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
            (DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium).color
          }`}>
            {(DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium).icon}{" "}
            {(DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium).label}
          </span>
          <div className="flex items-center gap-1">
            <BookmarkButton questionId={q.id} />
            <button
              onClick={() => setBugModalOpen(true)}
              className="text-gray-400 hover:text-[#001C71] transition"
              title="Report issue"
            >
              🔧
            </button>
          </div>
        </div>
        {!isMcq && hasSubParts ? (
          <>
            {/* Find first sub-question marker position (handles **(i)**, (i), i), i.) */}
            {(() => {
              const markerRe = /(?:\*\*\(([a-z]+|[ivx]+)\)\*\*|\(([a-z]+|[ivx]+)\)|^([a-z]+|[ivx]+)[.)])/gim;
              const firstMatch = markerRe.exec(stem);
              const firstMarkerIdx = firstMatch ? firstMatch.index : -1;
              const introText = firstMarkerIdx > 0 ? stem.slice(0, firstMarkerIdx).trim() : "";
              return introText ? (
                <div className="prose prose-sm max-w-none text-gray-800 mb-4"
                  dangerouslySetInnerHTML={{ __html: renderMath(renderStemWithTables(introText)) }} />
              ) : null;
            })()}
            <div className="space-y-4">
              {subParts.map((sp) => {
                const subKey = `${q.id}-${sp.label}`;
                const subAns = answers[subKey] || "";
                // Parent with children → show label + text, no input
                if (sp.hasChildren) {
                  return (
                    <div key={sp.label} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm font-semibold text-primary-700 mb-1">
                        ({sp.label})
                      </p>
                      {sp.text && (
                        <div className="prose prose-sm max-w-none text-gray-700"
                          dangerouslySetInnerHTML={{ __html: renderMath(renderStemWithTables(sp.text)) }} />
                      )}
                    </div>
                  );
                }
                // Leaf → show label + text + input + grading
                return (
                  <div key={sp.label} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-primary-700 mb-2">
                      ({sp.label})
                      {subGraded[subKey] && (
                        subCorrectMap[subKey]
                          ? <span className="text-green-600 ml-1">✓</span>
                          : <span className="text-red-500 ml-1">✗</span>
                      )}
                    </p>
                    {sp.text && (
                      <div className="prose prose-sm max-w-none text-gray-700 mb-2"
                        dangerouslySetInnerHTML={{ __html: renderMath(renderStemWithTables(sp.text)) }} />
                    )}
                    <MathInput
                      value={subAns}
                      onChange={(v) => setAnswers((p) => ({ ...p, [subKey]: v }))}
                      disabled={isGraded}
                      hideSymbols={!/\$/.test(sp.text)}
                    />
                  </div>
                );
              })}
            </div>
          </>
        ) : !isMcq ? (
          <>
            <div className="prose prose-sm max-w-none text-gray-800 mb-5"
              dangerouslySetInnerHTML={{ __html: renderMath(renderStemWithTables(markdownify(stem))) }} />
            <MathInput
              value={userAns}
              onChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
              disabled={isGraded}
              hideSymbols={!/\$/.test(stem)}
            />
          </>
        ) : null}

        {isMcq ? (
          <div className="space-y-2.5">
            {options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = userAns === letter;
              const isCorrectOption = letter === (q.clean_answer_text || q.answer_text)?.trim().charAt(0);
              let bg = "bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50";
              if (isGraded && isSelected && isCorrectOption) bg = "bg-green-50 border-green-400";
              else if (isGraded && isSelected && !isCorrectOption) bg = "bg-red-50 border-red-400";
              else if (isGraded && isCorrectOption) bg = "bg-green-50 border-green-200";
              else if (isSelected) bg = "bg-primary-50 border-primary-300";

              return (
                <button
                  key={letter}
                  onClick={() => { if (!isGraded) { setAnswers((p) => ({ ...p, [q.id]: letter })); } }}
                  disabled={isGraded}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${bg} ${isGraded ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="font-semibold text-primary-600 mr-2">{letter}.</span>
                  <span className="text-gray-700 text-sm">{opt.replace(/^[A-D][.)]?\s*/, "") || opt}</span>
                  {isGraded && isCorrectOption && <span className="ml-2 text-green-600">✓</span>}
                  {isGraded && isSelected && !isCorrectOption && <span className="ml-2 text-red-600">✗</span>}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* For structured questions: mark scheme toggle button (hidden for math 0580/0606) */}
        {!isMcq && !(bugContext?.code === "0580" || bugContext?.code === "0606") && q.explanation && (
            <div className="mt-3">
              <button
                onClick={() => setMarkSchemeVisible(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
              >
                📋 {markSchemeVisible[q.id] ? "Hide" : "Show"} Mark Scheme
              </button>
              {markSchemeVisible[q.id] && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof q.explanation === 'string' ? q.explanation : String(q.explanation || '')}</ReactMarkdown>
                </div>
              )}
            </div>
        )}

        {/* Auto-grade result for math (0580/0606) structured questions */}
        {!isMcq && (bugContext?.code === "0580" || bugContext?.code === "0606") && isGraded && (
          <div className={`mt-4 p-4 rounded-lg border text-sm ${
            isCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <p className="font-semibold">
              {isCorrect ? (
                <span>✅ Correct! (+{q.marks} mark{q.marks > 1 ? "s" : ""})</span>
              ) : (
                <span>
                  ❌ Incorrect. The answer is:
                  <div className="mt-1 space-y-1 font-normal">
                    {(q.clean_answer_text || q.answer_text || "").split("||").map((p: string, i: number) => {
                      const m = p.trim().match(/^(\\([^)]+\\))\\s*(.*)/);
                      const renderPart = (content: string) => {
                        const t = content.trim();
                        const hasDollar = t.includes("$");
                        return hasDollar
                          ? <span dangerouslySetInnerHTML={{ __html: renderMath(t) }} />
                          : <span>{t}</span>;
                      };
                      if (m) {
                        return (
                          <div key={i}>
                            <span className="font-medium">{m[1]}</span>{" "}
                            {renderPart(m[2])}
                          </div>
                        );
                      }
                      return <div key={i}>{renderPart(p)}</div>;
                    })}
                  </div>
                </span>
              )}
            </p>
          </div>
        )}

        {/* Grade result for MCQ questions */}
        {isMcq && isGraded && (
          <div className={`mt-4 p-4 rounded-lg border text-sm ${
            isCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <p className="font-semibold mb-1">
              {isCorrect
                ? (
                  <span>
                    ✅ Correct! (+{q.marks} mark{q.marks > 1 ? "s" : ""})
                    {(q.clean_answer_text || q.answer_text || q.explanation) && (
                      <details className="mt-1 font-normal">
                        <summary className="text-green-600 cursor-pointer text-xs hover:text-green-800">Show answer</summary>
                        <div className="mt-1 space-y-1">
                          {(q.clean_answer_text || q.answer_text || q.explanation || "").split("||").map((p: string, i: number) => {
                            const m = p.trim().match(/^(\([^)]+\))\s*(.*)/);
                            const renderPart = (content: string) => {
                              const t = content.trim();
const hasMath = /[=\^\\\/\(\)<>\+\-]/.test(t);
                              return hasMath
                                ? <span dangerouslySetInnerHTML={{ __html: renderMath(`$${t}$`) }} />
                                : <span>{t}</span>;
                            };
                            if (m) {
                              return (
                                <div key={i}>
                                  <span className="font-medium">{m[1]}</span>{" "}
                                  {renderPart(m[2])}
                                </div>
                              );
                            }
                            return <div key={i}>{renderPart(p)}</div>;
                          })}
                        </div>
                      </details>
                    )}
                  </span>
                )
                : (
                  <span>
                    ❌ Incorrect. The answer is:
                    <div className="mt-1 space-y-1 font-normal">
                      {(q.clean_answer_text || q.answer_text || q.explanation || "").split("||").map((p: string, i: number) => {
                        const m = p.trim().match(/^(\([^)]+\))\s*(.*)/);
                        const renderPart = (content: string) => {
                          const t = content.trim();
const hasMath = /[=\^\\\/\(\)<>\+\-]/.test(t);
                          return hasMath
                            ? <span dangerouslySetInnerHTML={{ __html: renderMath(`$${t}$`) }} />
                            : <span>{t}</span>;
                        };
                        if (m) {
                          return (
                            <div key={i}>
                              <span className="font-medium">{m[1]}</span>{" "}
                              {renderPart(m[2])}
                            </div>
                          );
                        }
                        return <div key={i}>{renderPart(p)}</div>;
                      })}
                    </div>
                  </span>
                )
              }
            </p>
          </div>
        )}

        {/* Navigation: Prev / Submit / Next */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>

          {/* Submit — only for groups with MCQ questions */}
          <div className="flex gap-2">
            {currentIdx === currentQs.length - 1 && !allGradedInGroup && (
              <button onClick={handleSubmitGroup}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition text-sm">
                Submit
              </button>
            )}
            {allGradedInGroup && !submitted.has(activeDifficulty) && (
              <button onClick={() => setSubmitted((prev) => new Set([...prev, activeDifficulty]))}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
                Finish →
              </button>
            )}
          </div>

          <button
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx >= currentQs.length - 1}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
       </div>
      </div>
      </>
      )}

      {/* Clear saved progress */}
      <div className="text-right">
        <button onClick={handleClearAll}
          className="text-xs text-gray-400 hover:text-red-500 transition">
          Clear all progress
        </button>
      </div>
    {/* Bug report modal */}
    <ReportBugModal
      open={bugModalOpen}
      onClose={() => setBugModalOpen(false)}
      context={bugContext ? {
        board: bugContext.board,
        subject: bugContext.subject,
        code: bugContext.code,
        subtopic: bugContext.topicName,
        questionNo: `Q${currentIdx + 1}`,
      } : undefined}
    />
    </div>
  );
}

/* ─── Math Symbol Input ─── */
function MathInput({
  value, onChange, disabled, hideSymbols,
}: {
  value: string; onChange: (v: string) => void; disabled: boolean; hideSymbols?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [showHandwrite, setShowHandwrite] = useState(false);
  const [drawingData, setDrawingData] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const insertSymbol = (sym: string) => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) { onChange(value + sym); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + sym + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawingData(canvas.toDataURL("image/png"));
    setShowHandwrite(false);
  };

  const runOCR = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOcrLoading(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data: { text } } = await Tesseract.recognize(canvas, "eng");
      const recognized = text.trim();
      if (recognized) {
        onChange(value ? value + "\n" + recognized : recognized);
      }
    } catch (e) {
      console.error("OCR failed:", e);
    } finally {
      setOcrLoading(false);
      setShowHandwrite(false);
      clearCanvas();
    }
  };

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 disabled:bg-gray-50 resize-y"
        autoFocus
      />
      {/* Preview panel — text + drawings together */}
      {showPreview && (value.trim() || drawingData) && (
        <div className="mt-3 p-3 bg-primary-50/50 border border-primary-200 rounded-lg">
          <div className="text-xs text-primary-500 font-medium mb-1">Preview</div>
          {value.trim() && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap mb-2"
              dangerouslySetInnerHTML={{ __html: renderMath(value) }} />
          )}
          {drawingData && (
            <div className="flex flex-wrap gap-2">
              <img src={drawingData} alt="Drawing" className="max-h-32 rounded border" />
            </div>
          )}
        </div>
      )}

      {/* Drawing thumbnail (hidden when preview open) */}
      {!showPreview && drawingData && (
        <div className="mt-2 relative inline-block">
          <img src={drawingData} alt="Handwritten answer" className="max-w-full max-h-48 rounded border" />
          <button onClick={() => setDrawingData(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600">×</button>
        </div>
      )}
      <div className="flex items-center gap-2 mt-1.5">
        {/* Handwrite toggle */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowHandwrite(!showHandwrite)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-gray-500 transition"
            title="Write answer by hand — OCR to text"
          >
            ✏️ Handwrite
          </button>
        )}
        {/* Preview toggle */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition ${
              showPreview ? 'bg-primary-50 text-primary-700 border-primary-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-200'
            }`}
            title="Preview rendered answer"
          >
            👁️ Preview
          </button>
        )}
      </div>
      {/* Handwrite drawing pad */}
      {showHandwrite && (
        <div className="mt-2 border border-primary-300 rounded-lg p-3 bg-primary-50/30">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="w-full border border-gray-200 rounded bg-white touch-none cursor-crosshair"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={clearCanvas} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600">Clear</button>
            <button onClick={saveAsImage} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">📷 Save Image</button>
            <button onClick={runOCR} disabled={ocrLoading} className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
              {ocrLoading ? "识别中..." : "🔤 OCR"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Difficulty Tabs ─── */
function DifficultyTabs({
  difficulties, active, scores, byDifficulty, submitted, unlockedDifficulty, onChange,
}: {
  difficulties: string[];
  active: string;
  scores: Record<string, { correct: number; total: number }>;
  byDifficulty: Record<string, Question[]>;
  submitted: Set<string>;
  unlockedDifficulty: string | null;
  onChange: (d: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ flexWrap: "nowrap" }}>
      {difficulties.map((d) => {
        const cfg = DIFFICULTY_CONFIG[d] || DIFFICULTY_CONFIG.medium;
        const s = scores[d];
        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
        const isLocked = false; // all unlocked
        const isDone = submitted.has(d);

        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            disabled={isLocked}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              isDone
                ? "bg-green-50 text-green-700 border-green-300"
                : active === d
                ? `${cfg.color} border-current`
                : isLocked
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {isLocked ? "🔒" : cfg.icon} {cfg.label}
            <span className="ml-1.5 text-xs opacity-70">({byDifficulty[d]?.length || 0})</span>
            {pct !== null && (
              <span className={`ml-2 text-xs font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {pct}%
              </span>
            )}
            {isDone && <span className="ml-1">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Question Parser ─── */
function parseQuestion(text: string): { stem: string; options: string[] } {
  const lines = text.split("\n");
  const optionLines: string[] = [];
  let stemEnd = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[A-D]\)\s+/.test(lines[i])) {
      optionLines.unshift(lines[i]);
      stemEnd = i;
    } else if (optionLines.length > 0) {
      break;
    }
  }
  const stem = lines.slice(0, stemEnd).join("\n").trim();
  return { stem, options: optionLines };
}
