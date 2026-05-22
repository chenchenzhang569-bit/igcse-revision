"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";

interface BookmarkButtonProps {
  questionId: string;
  className?: string;
}

export default function BookmarkButton({ questionId, className = "" }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    setMounted(true);
    checkBookmark();
  }, [questionId]);

  const checkBookmark = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/bookmarks?question_id=${questionId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to save questions to your bank.");
        return;
      }

      setLoading(true);
      const method = bookmarked ? "DELETE" : "POST";
      const res = await fetch("/api/bookmarks", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question_id: questionId }),
      });

      if (res.ok) {
        setBookmarked(!bookmarked);
      }
    } catch {
      // silent fail
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
