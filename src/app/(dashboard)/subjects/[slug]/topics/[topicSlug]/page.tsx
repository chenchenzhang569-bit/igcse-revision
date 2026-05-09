"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Note = {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  is_free_preview: boolean;
};

type Question = {
  id: string;
  question_text: string;
  answer_text: string;
  difficulty: string;
  marks: number;
};

export default function TopicPage({
  params,
}: {
  params: { slug: string; topicSlug: string };
}) {
  const [activeTab, setActiveTab] = useState<"notes" | "questions">("notes");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicName, setTopicName] = useState("加载中...");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // 查 topic
      const { data: topicData } = await supabase
        .from("topics")
        .select("display_name, slug, subject_id, subjects!inner(slug)")
        .eq("slug", params.topicSlug)
        .single();

      if (topicData) setTopicName(topicData.display_name);

      if (topicData) {
        // 查 notes
        const { data: notesData } = await supabase
          .from("notes")
          .select("*")
          .eq("topic_id", topicData.subject_id)
          .order("sort_order");

        // 查 topic 对应的 topic_id
        const { data: topic } = await supabase
          .from("topics")
          .select("id")
          .eq("slug", params.topicSlug)
          .single();

        if (topic) {
          const { data: n } = await supabase
            .from("notes")
            .select("*")
            .eq("topic_id", topic.id)
            .order("sort_order");
          if (n) setNotes(n);

          const { data: q } = await supabase
            .from("questions")
            .select("*")
            .eq("topic_id", topic.id)
            .order("sort_order");
          if (q) setQuestions(q);
        }
      }
      setLoading(false);
    }
    load();
  }, [params.topicSlug]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">仪表盘</Link>
        {" / "}
        <Link href={`/subjects/${params.slug}`} className="hover:text-primary-600">
          {params.slug}
        </Link>
        {" / "}
        <span className="text-gray-700">{topicName}</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">{topicName}</h1>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
            activeTab === "notes"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📝 笔记 ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
            activeTab === "questions"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📋 试题 ({questions.length})
        </button>
      </div>

      {/* Notes Tab */}
      {activeTab === "notes" && (
        notes.length === 0 ? (
          <p className="text-gray-400 text-center py-20">暂无笔记，管理员正在添加中...</p>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                  {note.is_free_preview && (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                      免费预览
                    </span>
                  )}
                  {!note.is_free_preview && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      付费
                    </span>
                  )}
                </div>

                {/* 文字内容 */}
                {note.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line mb-4">
                    {note.content}
                  </div>
                )}

                {/* PDF 下载按钮 */}
                {note.file_url && (
                  <a
                    href={`/api/notes/download?id=${note.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    📥 下载 PDF{note.file_name ? ` (${note.file_name})` : ""}
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        questions.length === 0 ? (
          <p className="text-gray-400 text-center py-20">暂无试题</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                  className="w-full p-5 text-left hover:bg-gray-50 transition flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        Q{i + 1}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        q.difficulty === "easy"
                          ? "bg-green-50 text-green-600"
                          : q.difficulty === "medium"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-red-50 text-red-600"
                      }`}>
                        {q.difficulty === "easy" ? "简单" : q.difficulty === "medium" ? "中等" : "困难"}
                      </span>
                      <span className="text-xs text-gray-400">{q.marks} 分</span>
                    </div>
                    <p className="text-gray-800">{q.question_text}</p>
                  </div>
                  <span className="text-gray-300 text-lg mt-1">
                    {expandedQuestion === q.id ? "▲" : "▼"}
                  </span>
                </button>
                {expandedQuestion === q.id && (
                  <div className="border-t bg-green-50 p-5">
                    <p className="text-xs text-green-600 font-medium mb-2">📝 答案</p>
                    <p className="text-gray-800 whitespace-pre-line text-sm">{q.answer_text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
