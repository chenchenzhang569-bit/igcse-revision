"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface BookmarkButtonProps {
  questionId: string;
  className?: string;
}

export default function BookmarkButton({ questionId, className = "" }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSessionAndCheck();
  }, [questionId]);

  const fetchSession = async (): Promise<string | null> => {
    if (sessionRef.current) return sessionRef.current;
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      sessionRef.current = session?.access_token || null;
      return sessionRef.current;
    } catch {
      return null;
    }
  };

  const fetchSessionAndCheck = async () => {
    const token = await fetchSession();
    if (!token) return;
    try {
      const res = await fetch(`/api/bookmarks?question_id=${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { bookmarked: b } = await res.json();
        setBookmarked(b);
      }
    } catch {
      // silent fail
    }
  };

  const toggle = async () => {
    const token = await fetchSession();
    if (!token) {
      alert("Please log in to save questions to your bank.");
      return;
    }

    // Optimistic update: toggle UI immediately
    const newState = !bookmarked;
    setBookmarked(newState);
    setLoading(true);

    try {
      const method = newState ? "POST" : "DELETE";
      const res = await fetch("/api/bookmarks", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question_id: questionId }),
      });

      if (!res.ok) {
        // Revert on failure
        setBookmarked(!newState);
      }
    } catch {
      // Revert on error
      setBookmarked(!newState);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-all duration-200 ${
        bookmarked
          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
          : "bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-200"
      } ${className}`}
      title={bookmarked ? "Remove from My Bank" : "Add to My Bank"}
    >
      <span className={loading ? "animate-pulse" : ""}>
        {bookmarked ? "♥" : "♡"}
      </span>
      <span className="hidden sm:inline">
        {bookmarked ? "Saved" : "Save"}
      </span>
    </button>
  );
}
