"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Document {
  id: string;
  title: string;
  file_url: string;
  subject_id: string;
  subtopic_id?: string;
  created_at: string;
  type: string;
}

interface Subject {
  id: string;
  display_name: string;
  code: string | null;
  board_name: string;
}

interface Subtopic {
  id: string;
  display_name: string;
}

const NOTE_TYPES = [
  { value: "notes", label: "笔记" },
  { value: "question_paper", label: "题目PDF" },
  { value: "mcq_pdf", label: "MCQ PDF" },
];

export default function AdminUploadPage() {
  const [token, setToken] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [selSubject, setSelSubject] = useState("");
  const [selSubtopic, setSelSubtopic] = useState("");
  const [noteType, setNoteType] = useState("notes");

  // Past papers list
  const [pastPapers, setPastPapers] = useState<Document[]>([]);
  const [pastLoading, setPastLoading] = useState(false);

  // Notes list
  const [notes, setNotes] = useState<Document[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<"past_paper" | "notes">("past_paper");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");

  // Auth
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null);
    });
  }, []);

  // Fetch subjects
  useEffect(() => {
    if (!token) return;
    fetch("/api/subjects", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : d.subjects || []));
  }, [token]);

  // Fetch subtopics when subject changes
  useEffect(() => {
    if (!token || !selSubject) { setSubtopics([]); return; }
    fetch(`/api/topics?subject_id=${selSubject}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setSubtopics(Array.isArray(d) ? d : d.topics || []))
      .catch(() => setSubtopics([]));
  }, [token, selSubject]);

  // Fetch past papers
  const fetchPastPapers = useCallback(() => {
    if (!token || !selSubject) return;
    setPastLoading(true);
    fetch(`/api/admin/documents?type=past_papers&subject_id=${selSubject}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPastPapers(d.items || []))
      .finally(() => setPastLoading(false));
  }, [token, selSubject]);

  useEffect(() => { fetchPastPapers(); }, [fetchPastPapers]);

  // Fetch notes
  const fetchNotes = useCallback(() => {
    if (!token || !selSubject || !selSubtopic) return;
    setNotesLoading(true);
    const params = new URLSearchParams({
      type: "notes",
      subject_id: selSubject,
      subtopic_id: selSubtopic,
    });
    fetch(`/api/admin/documents?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setNotes(d.items || []))
      .finally(() => setNotesLoading(false));
  }, [token, selSubject, selSubtopic]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Upload
  const handleUpload = async () => {
    if (!token || !selSubject || !uploadFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("subject_id", selSubject);

      if (uploadType === "notes" && selSubtopic) {
        formData.append("topic_id", selSubtopic);
      }
      if (uploadTitle) formData.append("title", uploadTitle);

      const apiPath =
        uploadType === "past_paper"
          ? "/api/admin/past-papers/upload"
          : "/api/admin/notes/upload";

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setShowUpload(false);
        setUploadFile(null);
        setUploadTitle("");
        if (uploadType === "past_paper") fetchPastPapers();
        else fetchNotes();
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete
  const handleDelete = async (doc: Document) => {
    if (!token || !confirm(`Delete "${doc.title}"?`)) return;

    const res = await fetch(
      `/api/admin/documents?id=${doc.id}&type=${doc.type === "past_paper" ? "past_papers" : "notes"}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      if (doc.type === "past_paper") fetchPastPapers();
      else fetchNotes();
    }
  };

  // Edit
  const openEdit = (doc: Document) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditSubject(doc.subject_id);
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!token || !editDoc) return;

    const res = await fetch("/api/admin/documents", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: editDoc.id,
        type: editDoc.type === "past_paper" ? "past_papers" : "notes",
        title: editTitle,
        subject_id: editSubject,
        subtopic_id: editDoc.subtopic_id,
      }),
    });

    if (res.ok) {
      setShowEdit(false);
      if (editDoc.type === "past_paper") fetchPastPapers();
      else fetchNotes();
    }
  };

  const subjectLabel = (s: Subject) =>
    `${s.board_name} ${s.display_name}${s.code ? ` · ${s.code}` : ""}`;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("zh-CN");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-primary-900 mb-6">📤 文档管理</h1>

      {/* Subject selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 mb-1">科目</label>
        <select
          value={selSubject}
          onChange={(e) => {
            setSelSubject(e.target.value);
            setSelSubtopic("");
          }}
          className="w-full max-w-md px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20"
        >
          <option value="">选择科目</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {subjectLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {!selSubject && (
        <div className="text-center py-16 text-gray-400">请先选择科目</div>
      )}

      {selSubject && (
        <>
          {/* ──── Past Papers ──── */}
          <div className="bg-white border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-primary-900">历年真题</h2>
              <button
                onClick={() => {
                  setUploadType("past_paper");
                  setUploadTitle("");
                  setUploadFile(null);
                  setShowUpload(true);
                }}
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary-900 text-white hover:bg-primary-800 transition"
              >
                📎 上传
              </button>
            </div>

            {pastLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : pastPapers.length === 0 ? (
              <p className="text-sm text-gray-400">暂无历年真题</p>
            ) : (
              <div className="space-y-1">
                {pastPapers.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener"
                        className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1"
                      >
                        查看
                      </a>
                      <button
                        onClick={() => openEdit(doc)}
                        className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ──── SubTopic selector ──── */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              SubTopic（选填，选后支持上传笔记/题目/MCQ）
            </label>
            <select
              value={selSubtopic}
              onChange={(e) => setSelSubtopic(e.target.value)}
              className="w-full max-w-md px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            >
              <option value="">不限（只看历年真题）</option>
              {subtopics.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* ──── Notes ──── */}
          {selSubtopic && (
            <div className="bg-white border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-primary-900">
                    SubTopic 文档
                  </h2>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="px-3 py-1 border rounded-lg text-xs"
                  >
                    {NOTE_TYPES.map((nt) => (
                      <option key={nt.value} value={nt.value}>
                        {nt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setUploadType("notes");
                    setUploadTitle("");
                    setUploadFile(null);
                    setShowUpload(true);
                  }}
                  className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary-900 text-white hover:bg-primary-800 transition"
                >
                  📎 上传
                </button>
              </div>

              {notesLoading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-gray-400">暂无文档</p>
              ) : (
                <div className="space-y-1">
                  {notes
                    .filter((n: any) => n.type === noteType || n.type === noteType)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {doc.title}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener"
                            className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1"
                          >
                            查看
                          </a>
                          <button
                            onClick={() => openEdit(doc)}
                            className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary-900 mb-4">
              上传{uploadType === "past_paper" ? "历年真题" : "文档"}
            </h3>

            <label className="block text-xs font-semibold text-gray-500 mb-1">标题</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder={uploadFile?.name || "文件名"}
              className="w-full px-3 py-2 border rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            />

            <label className="block text-xs font-semibold text-gray-500 mb-1">PDF 文件</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-sm mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 py-2 rounded-xl bg-primary-900 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 transition"
              >
                {uploading ? "上传中..." : "上传"}
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary-900 mb-4">编辑文档</h3>

            <label className="block text-xs font-semibold text-gray-500 mb-1">标题</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-900/20"
            />

            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="flex-1 py-2 rounded-xl bg-primary-900 text-white text-sm font-semibold hover:bg-primary-800 transition"
              >
                保存
              </button>
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
