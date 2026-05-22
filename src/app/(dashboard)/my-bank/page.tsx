"use client";

import { useEffect, useState, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
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

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

const DIFF_ICONS: Record<string, string> = {
  easy: "🟢",
  medium: "🟡",
  hard: "🔴",
};

export default function MyBankPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const supabase = getSupabaseClient();

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
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

  // Build tree: exam board → subject → topic → subtopic → questions
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

      // Ensure nodes exist
      if (!root[boardKey]) root[boardKey] = { name: examBoard, count: 0, children: [], id: boardKey };
      if (!root[subjectKey]) root[subjectKey] = { name: formatSubject(subject), slug: subject, count: 0, children: [], id: subjectKey };
      if (!root[topicKey]) root[topicKey] = { name: topic, id: q.topic?.id, count: 0, children: [], slug: topic };
      if (!root[subtopicKey]) root[subtopicKey] = { name: subtopic, id: q.subtopic?.id, count: 0, bookmarks: [], slug: subtopic };

      // Add count + bookmark to leaf
      root[boardKey].count++;
      root[subjectKey].count++;
      root[topicKey].count++;
      root[subtopicKey].count++;
      (root[subtopicKey].bookmarks || []).push(bm);
    }

    // Build tree structure
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">{error}</p>
        {error.includes("log in") && (
          <Link href="/login" className="mt-4 inline-block text-primary-600 hover:underline font-medium">
            Go to Login →
          </Link>
        )}
      </div>
    );
  }

  if (!bookmarks.length) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-6xl mb-4">💾</p>
        <p className="text-gray-600 text-lg font-medium">Your question bank is empty</p>
        <p className="text-gray-400 text-sm mt-2">
          Browse subjects and click ♡ on any question to save it here.
        </p>
        <Link
          href="/subjects"
          className="mt-4 inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          Browse Subjects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💾 My Question Bank</h1>
          <p className="text-gray-500 text-sm mt-1">{bookmarks.length} question{bookmarks.length > 1 ? "s" : ""} saved</p>
        </div>
      </div>

      {/* Tree */}
      <div className="bg-white border rounded-xl divide-y divide-gray-100">
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

  const icons: Record<number, string> = {
    0: "📋",
    1: "📐",
    2: "📂",
    3: "📌",
  };
  const icon = icons[depth] || "📄";

  return (
    <div>
      <button
        onClick={() => (hasChildren || hasBookmarks) && onToggle(key)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
          depth > 0 ? "pl-" + (4 + depth * 6) : ""
        }`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <span className={`transform transition-transform text-xs ${isExpanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="text-lg">{icon}</span>
        <span className="flex-1 font-medium text-gray-800 text-sm">{node.name}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {node.count}
        </span>
      </button>

      {/* Expanded children */}
      {isExpanded && hasChildren && (
        <div>
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

      {/* Expanded bookmarks (leaf level) */}
      {isExpanded && hasBookmarks && (
        <div className="border-t border-gray-100">
          {node.bookmarks!.map((bm) => (
            <div
              key={bm.bookmark_id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
              style={{ paddingLeft: `${16 + (depth + 1) * 24}px` }}
            >
              <span className="text-gray-300 text-xs">•</span>
              <Link
                href={`/subjects/${bm.question.subjectSlug}/topics/${slugify(bm.question.topic?.name || "")}/${slugify(bm.question.subtopic?.name || "")}`}
                className="flex-1 text-sm text-gray-700 hover:text-primary-600 transition line-clamp-1"
              >
                {stripHtml(bm.question.question_text).slice(0, 100)}
              </Link>
              <span
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  DIFFICULTY_COLORS[bm.question.difficulty] || DIFFICULTY_COLORS.medium
                }`}
              >
                {DIFF_ICONS[bm.question.difficulty] || "🟡"} {bm.question.difficulty}
              </span>
            </div>
          ))}
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
  return `${board} ${subject} ${code}`;
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
