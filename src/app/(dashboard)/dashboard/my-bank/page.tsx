"use client";

import { useEffect, useState, useMemo } from "react";
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
    topic: { id: string; name: string } | null;
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

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  easy: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  hard: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

export default function MyBankPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookmarks();
  }, []);

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

      const data = await res.json();
      setBookmarks(data);
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
      const q = bm.question;
      const examBoard = q.subjectSlug?.startsWith("caie") ? "CAIE" : "Edexcel";
      const subject = q.subjectSlug || "Unknown";
      const topic = q.topic?.name || "Other";
      const subtopic = q.subtopic?.name || "Other";

      const boardKey = examBoard;
      const subjectKey = `${examBoard}|${subject}`;
      const topicKey = `${examBoard}|${subject}|${topic}`;
      const subtopicKey = `${examBoard}|${subject}|${topic}|${subtopic}`;

      if (!root[boardKey]) root[boardKey] = { name: examBoard, count: 0, children: [], id: boardKey };
      if (!root[subjectKey]) root[subjectKey] = { name: formatSubject(subject), slug: subject, count: 0, children: [], id: subjectKey };
      if (!root[topicKey]) root[topicKey] = { name: topic, id: q.topic?.id, count: 0, children: [], slug: topic };
      if (!root[subtopicKey]) root[subtopicKey] = { name: subtopic, id: q.subtopic?.id, count: 0, bookmarks: [], slug: subtopic };

      root[boardKey].count++;
      root[subjectKey].count++;
      root[topicKey].count++;
      root[subtopicKey].count++;
      (root[subtopicKey].bookmarks || []).push(bm);
    }

    const boards: TreeNode[] = [];
    for (const bk of Object.keys(root).filter(k => !k.includes("|"))) {
      const boardNode = { ...root[bk], children: [] as TreeNode[] };
      const subjects = Object.keys(root).filter(k =>
        k.startsWith(bk + "|") && k.split("|").length === 2
      );
      for (const sk of subjects) {
        const subjNode = { ...root[sk], children: [] as TreeNode[] };
        const topics = Object.keys(root).filter(k =>
          k.startsWith(sk + "|") && k.split("|").length === 3
        );
        for (const tk of topics) {
          const topicNode = { ...root[tk], children: [] as TreeNode[] };
          const subs = Object.keys(root).filter(k =>
            k.startsWith(tk + "|") && k.split("|").length === 4
          );
          for (const subK of subs) {
            topicNode.children!.push(root[subK]);
          }
          subjNode.children!.push(topicNode);
        }
        boardNode.children!.push(subjNode);
      }
      boards.push(boardNode);
    }

    return boards;
  }, [bookmarks]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-gray-400">Loading your questions...</p>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">{error}</p>
        {error.includes("log in") && (
          <Link href="/login" className="mt-4 inline-flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-800 transition">
            Go to Login
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        )}
      </div>
    );
  }

  // --- Empty state ---
  if (!bookmarks.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Your question bank is empty</h2>
        <p className="text-gray-500 max-w-sm">
          Click the <span className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500 text-xs font-medium">♡ Save</span> button on any question to add it here.
        </p>
        <Link
          href="/subjects"
          className="mt-6 inline-flex items-center gap-2 bg-primary-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-800 transition shadow-sm"
        >
          Browse Subjects
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    );
  }

  // --- Stats ---
  const stats = useMemo(() => {
    const sets = new Set<string>();
    const diffs: Record<string, number> = {};
    for (const bm of bookmarks) {
      sets.add(bm.question.subjectSlug);
      diffs[bm.question.difficulty] = (diffs[bm.question.difficulty] || 0) + 1;
    }
    return { subjects: sets.size, diffs };
  }, [bookmarks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Question Bank</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {bookmarks.length} question{bookmarks.length !== 1 ? "s" : ""} saved across {stats.subjects} subject{stats.subjects !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 self-start bg-accent-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find More Questions
        </Link>
      </div>

      {/* Difficulty breakdown pills */}
      {Object.keys(stats.diffs).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.diffs).map(([diff, count]) => {
            const style = DIFFICULTY_STYLES[diff] || DIFFICULTY_STYLES.medium;
            return (
              <span key={diff} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {diff} · {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Tree */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        {tree.map((board) => (
          <TreeNodeRow
            key={board.name}
            node={board}
            depth={0}
            expanded={expanded}
            onToggle={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  const key = node.id || node.name;
  const isExpanded = expanded.has(key);
  const hasChildren = node.children && node.children.length > 0;
  const hasBookmarks = node.bookmarks && node.bookmarks.length > 0;
  const isLeaf = !hasChildren;

  // Color accent per depth
  const depthColors = [
    "border-l-primary-600 bg-primary-50/50",
    "border-l-accent-500 bg-accent-50/30",
    "border-l-emerald-500 bg-emerald-50/30",
    "border-l-violet-500 bg-violet-50/30",
  ];
  const depthColor = depthColors[depth % depthColors.length];

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => (hasChildren || hasBookmarks) && onToggle(key)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/70 transition-colors ${
          isExpanded ? depthColor : ""
        }`}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        {/* Expand chevron */}
        <span className={`shrink-0 transition-transform duration-200 ${
          isExpanded ? "rotate-90" : ""
        } ${!hasChildren && !hasBookmarks ? "invisible" : ""}`}>
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>

        {/* Icon */}
        <TreeNodeIcon depth={depth} />

        {/* Name */}
        <span className="flex-1 font-medium text-gray-800 text-sm truncate">
          {node.name}
        </span>

        {/* Count badge */}
        <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
          {node.count}
        </span>
      </button>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="bg-gray-50/50">
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id || child.name}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {/* Bookmarks (leaf level) */}
      {isExpanded && hasBookmarks && (
        <div className="bg-gray-50/30 border-t border-gray-100">
          {node.bookmarks!.map((bm) => (
            <BookmarkRow key={bm.bookmark_id} bookmark={bm} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarkRow({ bookmark: bm, depth }: { bookmark: Bookmark; depth: number }) {
  const q = bm.question;
  const style = DIFFICULTY_STYLES[q.difficulty] || DIFFICULTY_STYLES.medium;
  const questionLink = q.subjectSlug && q.topic?.name && q.subtopic?.name
    ? `/subjects/${q.subjectSlug}/topics/${slugify(q.topic.name)}/${slugify(q.subtopic.name)}`
    : "#";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-white transition-colors group"
      style={{ paddingLeft: `${16 + depth * 20}px` }}
    >
      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300" />
      <Link
        href={questionLink}
        className="flex-1 min-w-0 text-sm text-gray-700 group-hover:text-primary-600 transition-colors line-clamp-1"
      >
        {stripHtml(q.question_text).slice(0, 120)}
      </Link>
      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1 h-1 rounded-full ${style.dot}`} />
        {q.difficulty}
      </span>
    </div>
  );
}

function TreeNodeIcon({ depth }: { depth: number }) {
  const icons: Record<number, JSX.Element> = {
    0: (
      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    1: (
      <svg className="w-5 h-5 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    2: (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    3: (
      <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  };
  return <span className="shrink-0">{icons[depth] || icons[3]}</span>;
}

function formatSubject(slug: string): string {
  const parts = slug.split("-");
  if (parts.length < 3) return slug;
  const board = parts[0].toUpperCase();
  const subject = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
  const code = parts.slice(2).join(" ").toUpperCase();
  return `${board} ${subject} (${code})`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, "");
}
