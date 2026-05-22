"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseClient } from "@/lib/supabase-client";

interface Bookmark {
  bookmark_id: number;
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

export default function MyBankPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) {
        setError("Please log in to view your saved questions.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/bookmarks", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setBookmarks(data);
        } else {
          setError(data.error || "Failed to load bookmarks");
        }
      } catch {
        setError("Network error");
      }
      setLoading(false);
    });
  }, []);

  const removeBookmark = async (questionId: string) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ question_id: questionId }),
    });
    setBookmarks((prev) => prev.filter((b) => b.question.id !== questionId));
  };

  if (loading) return <p className="text-gray-500 p-8">Loading...</p>;
  if (error) return <p className="text-red-500 p-8">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Question Bank</h1>
        <p className="text-gray-500 mt-1">{bookmarks.length} questions saved</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-400 mb-2">No saved questions yet.</p>
          <Link href="/subjects" className="text-primary-600 hover:underline font-medium">
            Browse subjects →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <div
              key={b.bookmark_id}
              className="bg-white rounded-xl border p-4 flex justify-between items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 line-clamp-2 mb-1">
                  {b.question.question_text}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {b.question.topic && <span>{b.question.topic.name}</span>}
                  {b.question.subtopic && (
                    <>
                      <span>→</span>
                      <span>{b.question.subtopic.name}</span>
                    </>
                  )}
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {b.question.difficulty}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeBookmark(b.question.id)}
                className="text-gray-300 hover:text-red-500 shrink-0 text-lg"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
