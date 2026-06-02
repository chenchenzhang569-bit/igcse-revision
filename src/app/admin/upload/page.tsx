"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

interface Document {
  id: string;
  title: string;
  file_url: string;
  subject_id: string;
  subtopic_id?: string;
  created_at: string;
  type: string;
  doc_type?: string;
  year?: number;
  season?: string;
  paper_number?: number;
  paper_type?: string;
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
  pmt_code?: string;
  name?: string;
  topic_id?: string;
  topic_name?: string;
}

const NOTE_TYPES = [
  { value: "notes", label: "笔记" },
  { value: "question_paper", label: "题目PDF" },
  { value: "mcq_pdf", label: "MCQ PDF" },
];

// ──── DocRow Component ────
function DocRow({
  doc, formatDate, onEdit, onDelete,
}: {
  doc: Document;
  formatDate: (d: string) => string;
  onEdit: (d: Document) => void;
  onDelete: (d: Document) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{doc.title}</p>
        <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <a href={doc.file_url} target="_blank" rel="noopener" className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1">查看</a>
        <button onClick={() => onEdit(doc)} className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1">编辑</button>
        <button onClick={() => onDelete(doc)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">🗑</button>
      </div>
    </div>
  );
}

// ──── YearSeasonAccordion Component ────

const SEASON_ORDER: Record<string, number> = {
  "Mar": 1, "Feb/Mar": 1,
  "May/Jun": 2,
  "Oct/Nov": 3, "Nov": 3,
};

const SEASON_LABEL: Record<string, string> = {
  "Mar": "Mar", "Feb/Mar": "Feb/Mar",
  "May/Jun": "May/Jun",
  "Oct/Nov": "Oct/Nov", "Nov": "Nov",
};

function YearSeasonAccordion({
  papers,
  onEdit,
  onDelete,
  formatDate,
}: {
  papers: Document[];
  onEdit: (d: Document) => void;
  onDelete: (d: Document) => void;
  formatDate: (d: string) => string;
}) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  // Group by year → season
  const grouped: Record<number, Record<string, Document[]>> = {};
  for (const p of papers) {
    const y = p.year;
    if (!y) continue;  // skip papers without year
    const s = p.season || "Unknown";
    if (!grouped[y]) grouped[y] = {};
    if (!grouped[y][s]) grouped[y][s] = [];
    grouped[y][s].push(p);
  }

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  const toggleYear = (y: number) => {
    setExpandedYear(expandedYear === y ? null : y);
    setExpandedSeason(null);
  };

  const toggleSeason = (s: string) => {
    setExpandedSeason(expandedSeason === s ? null : s);
  };

  return (
    <div className="space-y-1">
      {years.map((year) => {
        const seasons = grouped[year];
        const seasonKeys = Object.keys(seasons).sort(
          (a, b) => (SEASON_ORDER[a] || 99) - (SEASON_ORDER[b] || 99)
        );
        const yearCount = Object.values(seasons).flat().length;

        return (
          <div key={year}>
            {/* Year row */}
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
            >
              <span className="text-sm font-bold text-gray-700">
                {expandedYear === year ? "▼" : "▶"} {year}
              </span>
              <span className="text-xs text-gray-400">{yearCount} papers</span>
            </button>

            {/* Seasons (expand when year is open) */}
            {expandedYear === year && (
              <div className="ml-3 border-l-2 border-gray-200 pl-3 space-y-0.5">
                {seasonKeys.map((season) => {
                  const seasonPapers = seasons[season];
                  const seasonLabel = SEASON_LABEL[season] || season;

                  return (
                    <div key={season}>
                      {/* Season row */}
                      <button
                        onClick={() => toggleSeason(season)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 text-left"
                      >
                        <span className="text-xs font-semibold text-gray-600">
                          {expandedSeason === season ? "▼" : "▶"} {seasonLabel}
                        </span>
                        <span className="text-xs text-gray-400">{seasonPapers.length} papers</span>
                      </button>

                      {/* Papers (expand when season is open) */}
                      {expandedSeason === season && (
                        <div className="ml-2 space-y-0.5">
                          {seasonPapers.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-100"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 truncate">
                                  Paper {doc.paper_number} {doc.paper_type}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener"
                                  className="text-xs text-gray-400 hover:text-primary-900 px-1"
                                >
                                  查看
                                </a>
                                <button
                                  onClick={() => onEdit(doc)}
                                  className="text-xs text-gray-400 hover:text-primary-900 px-1"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => onDelete(doc)}
                                  className="text-xs text-gray-400 hover:text-red-500 px-1"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminUploadPage() {
  const [token, setToken] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);

  // Read URL params for navigation from subject QA widget
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get("subject_id") || "";
  const urlSubtopic = searchParams.get("subtopic_id") || "";

  const [selSubject, setSelSubject] = useState(urlSubject);
  const [selSubtopic, setSelSubtopic] = useState(urlSubtopic);
  const [subtopicSearch, setSubtopicSearch] = useState("");
  const [noteType, setNoteType] = useState("notes");

  // Past papers list
  const [pastPapers, setPastPapers] = useState<Document[]>([]);
  const [pastLoading, setPastLoading] = useState(false);

  // Notes list
  const [notes, setNotes] = useState<Document[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Subtopic papers (MCQ QP/MS + Topic QP/MS)
  const [subtopicPapers, setSubtopicPapers] = useState<Document[]>([]);
  const [subtopicPapersLoading, setSubtopicPapersLoading] = useState(false);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<"past_paper" | "notes">("past_paper");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAnswerFile, setUploadAnswerFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadSeason, setUploadSeason] = useState("May/Jun");
  const [uploadPaperNum, setUploadPaperNum] = useState(1);
  const [uploadPaperType, setUploadPaperType] = useState("Question Paper");

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
      .then((d) => {
        const items = (d.items || []).map((item: any) => {
          // Parse doc_type from content field: [type:mcq_pdf]actual content
          const m = (item.content || "").match(/^\[type:(\w+)\]/);
          return { ...item, doc_type: m ? m[1] : "notes" };
        });
        setNotes(items);
      })
      .finally(() => setNotesLoading(false));
  }, [token, selSubject, selSubtopic]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Fetch subtopic papers (MCQ + Topic QP/MS)
  const fetchSubtopicPapers = useCallback(() => {
    if (!token || !selSubject || !selSubtopic) return;
    setSubtopicPapersLoading(true);
    const params = new URLSearchParams({
      type: "past_papers",
      subject_id: selSubject,
      subtopic_id: selSubtopic,
    });
    fetch(`/api/admin/documents?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setSubtopicPapers(d.items || []))
      .finally(() => setSubtopicPapersLoading(false));
  }, [token, selSubject, selSubtopic]);

  useEffect(() => { fetchSubtopicPapers(); }, [fetchSubtopicPapers]);

  // Upload
  const handleUpload = async () => {
    if (!token || !selSubject || !uploadFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadAnswerFile) formData.append("answer_file", uploadAnswerFile);
      formData.append("subject_id", selSubject);
      formData.append("doc_type", noteType);

      if (uploadType === "notes" && selSubtopic) {
        const selSub = subtopics.find(st => st.id === selSubtopic);
        formData.append("topic_id", selSub?.topic_id || selSubtopic);
        formData.append("subtopic_id", selSubtopic);
      }
      if (uploadType === "past_paper") {
        formData.append("year", String(uploadYear));
        formData.append("season", uploadSeason);
        formData.append("paper_number", String(uploadPaperNum));
        formData.append("paper_type", uploadPaperType);
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
      if (doc.type === "past_paper") { fetchPastPapers(); fetchSubtopicPapers(); }
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
              <h2 className="text-lg font-bold text-primary-900">
                历年真题 <span className="text-sm font-normal text-gray-400">({pastPapers.length})</span>
              </h2>
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
              <YearSeasonAccordion papers={pastPapers} onEdit={openEdit} onDelete={handleDelete} formatDate={formatDate} />
            )}
          </div>

          {/* ──── SubTopic selector ──── */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              SubTopic（选填，选后支持上传笔记/题目/MCQ）
            </label>
            {!selSubject ? (
              <p className="text-sm text-gray-400">请先选择科目</p>
            ) : (
              <div className="relative max-w-md">
                <input
                  type="text"
                  value={subtopicSearch}
                  onChange={(e) => setSubtopicSearch(e.target.value)}
                  placeholder="搜索 SubTopic 编号或名称..."
                  className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20"
                />
                <select
                  value={selSubtopic}
                  onChange={(e) => {
                    setSelSubtopic(e.target.value);
                    setSubtopicSearch("");
                  }}
                  size={Math.min(8, subtopics.filter(st => {
                    const q = subtopicSearch.toLowerCase();
                    if (!q) return true;
                    return (st.pmt_code || "").toLowerCase().includes(q) ||
                           (st.display_name || "").toLowerCase().includes(q) ||
                           (st.topic_name || "").toLowerCase().includes(q);
                  }).length + 1)}
                  className="w-full mt-1 px-2 py-1 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20 bg-white"
                >
                  <option value="">不限（只看历年真题）</option>
                  {subtopics
                    .filter(st => {
                      const q = subtopicSearch.toLowerCase();
                      if (!q) return true;
                      return (st.pmt_code || "").toLowerCase().includes(q) ||
                             (st.display_name || "").toLowerCase().includes(q) ||
                             (st.topic_name || "").toLowerCase().includes(q);
                    })
                    .sort((a, b) => {
                      // Sort by pmt_code numerically: split "1.1" → [1,1], "1.10" → [1,10]
                      const segA = (a.pmt_code || "").split(".").map(Number);
                      const segB = (b.pmt_code || "").split(".").map(Number);
                      const len = Math.max(segA.length, segB.length);
                      for (let i = 0; i < len; i++) {
                        const va = segA[i] ?? 999;
                        const vb = segB[i] ?? 999;
                        if (va !== vb) return va - vb;
                      }
                      return 0;
                    })
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.pmt_code ? `${st.pmt_code} ` : ""}{st.name || st.display_name}{st.topic_name ? ` — ${st.topic_name}` : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}
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

              {(() => {
                // "笔记" tab: show notes table
                // "题目PDF"/"MCQ PDF" tabs: show past_papers table
                const isNotesTab = noteType === "notes";
                const loading = isNotesTab ? notesLoading : subtopicPapersLoading;
                
                if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

                if (isNotesTab) {
                  return notes.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无笔记</p>
                  ) : (
                    <div className="space-y-1">
                      {notes.map((doc) => (
                        <DocRow key={doc.id} doc={doc} formatDate={formatDate} onEdit={openEdit} onDelete={handleDelete} />
                      ))}
                    </div>
                  );
                }

                // 题目PDF / MCQ PDF tabs → filter past_papers by paper_type
                const typeFilter = noteType === "question_paper"
                  ? ["Topic QP", "Topic MS", "QP", "MS"]
                  : ["MCQ QP", "MCQ MS"];
                const filtered = subtopicPapers.filter(p => typeFilter.includes(p.paper_type || ""));
                
                return filtered.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无{NOTE_TYPES.find(nt => nt.value === noteType)?.label || "文档"}</p>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((doc) => (
                      <DocRow key={doc.id} doc={doc} formatDate={formatDate} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                );
              })()}
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

            {uploadType === "past_paper" && (
              <>
              <label className="block text-xs font-semibold text-gray-500 mb-1">真题类型</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setUploadPaperType("Question Paper")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${uploadPaperType === "Question Paper" ? "bg-primary-900 text-white" : "bg-gray-100 text-gray-500"}`}>试卷 (QP)</button>
                <button onClick={() => setUploadPaperType("Mark Scheme")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${uploadPaperType === "Mark Scheme" ? "bg-primary-900 text-white" : "bg-gray-100 text-gray-500"}`}>答案 (MS)</button>
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">年份</label>
                  <input type="number" value={uploadYear} onChange={(e) => setUploadYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">季节</label>
                  <select value={uploadSeason} onChange={(e) => setUploadSeason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20">
                    <option>May/Jun</option>
                    <option>Oct/Nov</option>
                    <option>Feb/Mar</option>
                  </select>
                </div>
                <div className="w-16">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">No.</label>
                  <input type="number" value={uploadPaperNum} onChange={(e) => setUploadPaperNum(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/20" />
                </div>
              </div>
              </>
            )}

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
