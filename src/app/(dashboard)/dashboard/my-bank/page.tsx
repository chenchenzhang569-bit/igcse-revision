// force-redeploy-v1-tree-restructure
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Bookmark {
  bookmark_id: string;
  created_at: string;
  question: {
    id: string;
    question_text: string;
    difficulty: string;
    question_type: string;
    subtopic: { id: string; name: string } | null;
    topic: { id: string; name: string; slug: string } | null;
    subjectSlug: string;
  };
}

interface TreeNode {
  name: string;
  id?: string;
  slug?: string;
  count: number;
  children?: TreeNode[];
  bookmarks?: Bookmark[];
}

const DIFF_STYLES: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-rose-50 text-rose-700",
};

export default function MyBankPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [highlightQ, setHighlightQ] = useState("");
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadBookmarks(); }, []);

  const loadBookmarks = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to view your question bank.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/bookmarks", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      setBookmarks(await res.json() || []);
    } catch (e: any) {
      setError(e.message || "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  const tree = useMemo(() => {
    if (!bookmarks.length) return [];
    const root: Record<string, TreeNode> = {};
    for (const bm of bookmarks) {
      const q = bm.question || {};
      const examBoard = (q.subjectSlug || "").startsWith("caie") ? "CAIE" : "Edexcel";
      const subject = q.subjectSlug || "Unknown";
      const subtopic = q.subtopic?.name || q.topic?.name || "Uncategorized";

      const boardKey = examBoard;
      const subjectKey = `${examBoard}|${subject}`;
      const subtopicKey = `${examBoard}|${subject}|${subtopic}`;

      if (!root[boardKey]) root[boardKey] = { name: examBoard, count: 0, children: [], id: boardKey };
      if (!root[subjectKey]) root[subjectKey] = { name: formatSubject(subject), slug: subject, count: 0, children: [], id: subjectKey };
      if (!root[subtopicKey]) root[subtopicKey] = { name: subtopic, id: q.subtopic?.id || q.topic?.id, count: 0, bookmarks: [], slug: subtopic };

      root[boardKey].count++;
      root[subjectKey].count++;
      root[subtopicKey].count++;
      root[subtopicKey].bookmarks = [...(root[subtopicKey].bookmarks || []), bm];
    }

    const boards: TreeNode[] = [];
    for (const bk of Object.keys(root).filter(k => !k.includes("|"))) {
      const boardNode: TreeNode = { ...root[bk], children: [] };
      const subjects = Object.keys(root).filter(k => k.startsWith(bk + "|") && k.split("|").length === 2);
      for (const sk of subjects) {
        const subjNode: TreeNode = { ...root[sk], children: [] };
        const subtopics = Object.keys(root).filter(k => k.startsWith(sk + "|") && k.split("|").length === 3);
        for (const subK of subtopics) subjNode.children!.push(root[subK]);
        boardNode.children!.push(subjNode);
      }
      boards.push(boardNode);
    }
    return boards;
  }, [bookmarks]);

  // Auto-expand to filtered subtopic + scroll to question
  useEffect(() => {
    if (!tree.length) return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subtopic_id") || "";
    const qid = params.get("question_id") || "";
    if (!sid) return;

    for (const board of tree) {
      for (const subj of (board.children || [])) {
        for (const st of (subj.children || [])) {
          if (st.id === sid) {
            const keys = [board.id || board.name, subj.id || subj.name, st.id || st.name];
            setExpanded(new Set(keys));
            if (qid) setHighlightQ(qid);
            return;
          }
        }
      }
    }
  }, [tree]);

  // Scroll to highlighted question
  useEffect(() => {
    if (highlightQ && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [highlightQ, tree]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">{error}</p>
        {error.includes("log in") && (
          <Link href="/login" className="mt-4 inline-block text-primary-600 hover:underline font-medium">Go to Login →</Link>
        )}
      </div>
    );
  }

  if (!bookmarks.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <p className="text-gray-600 text-lg font-medium">Your question bank is empty</p>
        <p className="text-gray-400 text-sm mt-2">Click ♡ on any question to save it here.</p>
        <Link href="/subjects" className="mt-4 inline-block bg-primary-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-800 transition">
          Browse Subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Question Bank</h1>
        <p className="text-gray-500 text-sm mt-1">{bookmarks.length} question{bookmarks.length !== 1 ? "s" : ""} saved</p>
      </div>
      <div className="bg-white border rounded-xl overflow-hidden">
        {tree.map((board) => (
          <div key={board.name}>
            {/* Board header — not expandable */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-base">📋</span>
              <span className="flex-1 font-semibold text-gray-700 text-sm">{board.name}</span>
              <span className="shrink-0 text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full font-medium">{board.count}</span>
            </div>
            {/* Subjects — expandable tree */}
            {(board.children || []).map((subject) => (
              <TreeNodeRow key={subject.id || subject.name} node={subject} depth={0} expanded={expanded} onToggle={toggleExpand} highlightQ={highlightQ} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TreeNodeRow({
  node, depth, expanded, onToggle, highlightQ,
}: {
  node: TreeNode; depth: number; expanded: Set<string>; onToggle: (key: string) => void; highlightQ?: string;
}) {
  const key = node.id || node.name;
  const isExpanded = expanded.has(key);
  const hasChildren = !!(node.children && node.children.length > 0);
  const hasBookmarks = !!(node.bookmarks && node.bookmarks.length > 0);
  const levelIcons = ["📋", "📐", "📌"];

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => (hasChildren || hasBookmarks) && onToggle(key)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <span className={`shrink-0 text-xs text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""} ${!hasChildren && !hasBookmarks ? "invisible" : ""}`}>▶</span>
        <span className="text-base">{levelIcons[depth] || "📄"}</span>
        <span className="flex-1 font-medium text-gray-800 text-sm">{node.name}</span>
        <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{node.count}</span>
      </button>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeRow key={child.id || child.name} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} highlightQ={highlightQ} />
          ))}
        </div>
      )}

      {isExpanded && hasBookmarks && (
        <div className="border-t border-gray-100">
          {node.bookmarks!.map((bm) => {
            const q = bm.question || {};
            const qId = bm.bookmark_id;
            const isHL = highlightQ === qId;
            const diffStyle = DIFF_STYLES[q.difficulty] || DIFF_STYLES.medium;
            const topicSlug = q.topic?.slug || "";
            const href = topicSlug
              ? `/subjects/${q.subjectSlug}/topics/${topicSlug}?tab=questions&saved=1&q=${q.id}`
              : "#";
            return (
              <Link
                key={qId}
                href={href}
                ref={isHL ? (el) => { if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200); } : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors block ${isHL ? "bg-primary-50 ring-1 ring-primary-200" : "hover:bg-gray-50"}`}
                style={{ paddingLeft: `${16 + (depth + 1) * 20}px` }}
              >
                <span className="text-gray-300 text-xs">•</span>
                <span className="flex-1 min-w-0 text-sm text-gray-700 line-clamp-1">
                  {stripHtml(q.question_text || "").slice(0, 120)}
                </span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${diffStyle}`}>
                  {q.difficulty || "medium"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatSubject(slug: string): string {
  const parts = slug.split("-");
  if (parts.length < 3) return slug;
  const board = parts[0].toUpperCase();
  const subject = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
  const code = parts.slice(2).join(" ").toUpperCase();
  return `${board} ${subject} (${code})`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, "");
}
