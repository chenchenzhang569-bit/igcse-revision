"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Subject = {
  id: string; name: string; display_name: string; code: string | null;
  slug: string; exam_board_id: string; price_cny: number; is_published: boolean;
  exam_boards: { name: string; slug: string } | null;
};
type Topic = {
  id: string; name: string; display_name: string; slug: string; subject_id: string;
};
type Note = {
  id: string; topic_id: string; title: string; content: string;
  is_free_preview: boolean; file_url?: string; file_name?: string;
};
type Tab = "subjects" | "topics" | "notes";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [editNote, setEditNote] = useState<Note | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login?redirect=/admin");
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function fetchSubjects() {
    const res = await fetch("/api/admin/subjects");
    if (res.ok) setSubjects(await res.json());
  }
  async function fetchTopics() {
    const res = await fetch("/api/admin/topics");
    if (res.ok) setTopics(await res.json());
  }
  async function fetchNotes() {
    const res = await fetch("/api/admin/notes");
    if (res.ok) setNotes(await res.json());
  }

  useEffect(() => {
    if (!loading) {
      if (tab === "subjects") fetchSubjects();
      else if (tab === "topics") fetchTopics();
      else if (tab === "notes") fetchNotes();
    }
  }, [tab, loading]);

  async function handleDelete(api: string, id: string, label: string, refresh: () => void) {
    if (!confirm(`确认删除${label}？`)) return;
    const res = await fetch(`/api/admin/${api}/${id}`, { method: "DELETE" });
    if (res.ok) refresh();
    else alert("删除失败");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-primary-600">🎓 IGCSE</Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium">管理后台</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">返回首页</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {(["subjects", "topics", "notes"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setEditSubject(null); setEditTopic(null); setEditNote(null); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {{ subjects: "科目", topics: "主题", notes: "笔记" }[t]}
            </button>
          ))}
        </div>

        {/* ====== SUBJECTS ====== */}
        {tab === "subjects" && (
          <div>
            <SubjectForm edit={editSubject} onSaved={() => { setEditSubject(null); fetchSubjects(); }} onCancel={() => setEditSubject(null)} />
            <div className="mt-6 space-y-2">
              {subjects.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <span className="text-lg mr-2">{s.code || "📚"}</span>
                    <span className="font-medium">{s.display_name}</span>
                    <span className="text-gray-400 ml-2">({s.name})</span>
                    <span className="text-sm text-gray-400 ml-2">¥{(s.price_cny / 100).toFixed(0)}</span>
                    <span className="text-xs ml-2 text-gray-400">{s.exam_boards?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${s.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.is_published ? "已发布" : "草稿"}
                    </span>
                    <button onClick={() => { setEditSubject(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">编辑</button>
                    <button onClick={() => handleDelete("subjects", s.id, "这个科目", fetchSubjects)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">删除</button>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && <p className="text-gray-400 text-center py-8">暂无科目</p>}
            </div>
          </div>
        )}

        {/* ====== TOPICS ====== */}
        {tab === "topics" && (
          <div>
            <TopicForm edit={editTopic} onSaved={() => { setEditTopic(null); fetchTopics(); }} onCancel={() => setEditTopic(null)} />
            <div className="mt-6 space-y-2">
              {topics.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <span className="font-medium">{t.display_name}</span>
                    <span className="text-gray-400 ml-2">({t.slug})</span>
                    <span className="text-xs text-gray-300 ml-2">ID: {t.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditTopic(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">编辑</button>
                    <button onClick={() => handleDelete("topics", t.id, "这个主题", fetchTopics)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">删除</button>
                  </div>
                </div>
              ))}
              {topics.length === 0 && <p className="text-gray-400 text-center py-8">暂无主题</p>}
            </div>
          </div>
        )}

        {/* ====== NOTES ====== */}
        {tab === "notes" && (
          <div>
            <NoteForm edit={editNote} onSaved={() => { setEditNote(null); fetchNotes(); }} onCancel={() => setEditNote(null)} />
            <div className="mt-6 space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="bg-white p-4 rounded-lg border flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{n.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${n.is_free_preview ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>
                        {n.is_free_preview ? "免费预览" : "付费"}
                      </span>
                      {n.file_url && <span className="text-xs text-green-500">📎 PDF</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">{n.content?.slice(0, 100) || "（仅 PDF）"}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditNote(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">编辑</button>
                    <button onClick={() => handleDelete("notes", n.id, "这条笔记", fetchNotes)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">删除</button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && <p className="text-gray-400 text-center py-8">暂无笔记</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== SUBJECT FORM ==========
function SubjectForm({ edit, onSaved, onCancel }: {
  edit: Subject | null; onSaved: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ name: "", display_name: "", code: "", slug: "", exam_board_id: "a672826f-9431-422c-b56c-28fe184c0612", price_cny: 29900, is_published: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (edit) setForm({ name: edit.name, display_name: edit.display_name, code: edit.code || "", slug: edit.slug, exam_board_id: edit.exam_board_id, price_cny: edit.price_cny, is_published: edit.is_published });
  }, [edit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const method = edit ? "PUT" : "POST";
    const url = edit ? `/api/admin/subjects/${edit.id}` : "/api/admin/subjects";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setMsg(`✅ ${edit ? "更新" : "添加"}成功`); if (!edit) setForm({ name: "", display_name: "", code: "", slug: "", exam_board_id: "a672826f-9431-422c-b56c-28fe184c0612", price_cny: 29900, is_published: true }); onSaved(); }
    else { const d = await res.json(); setMsg("❌ " + (d.error || "失败")); }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className={`bg-white p-4 rounded-lg border space-y-3 ${edit ? "ring-2 ring-blue-400" : ""}`}>
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{edit ? "编辑科目" : "添加科目"}</h3>
        {edit && <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">✕ 取消</button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded px-3 py-2 text-sm" placeholder="名称 (英文)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="显示名 (中文)" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="代码" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required />
        <select className="border rounded px-3 py-2 text-sm" value={form.exam_board_id} onChange={e => setForm({...form, exam_board_id: e.target.value})}>
          <option value="a672826f-9431-422c-b56c-28fe184c0612">CAIE</option>
          <option value="8e13308d-b803-439c-8808-e8f36f6ab6b8">Edexcel</option>
        </select>
        <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="价格 (分)" value={form.price_cny} onChange={e => setForm({...form, price_cny: Number(e.target.value)})} />
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
        {saving ? "保存中..." : edit ? "更新科目" : "添加科目"}
      </button>
    </form>
  );
}

// ========== TOPIC FORM ==========
function TopicForm({ edit, onSaved, onCancel }: {
  edit: Topic | null; onSaved: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ subject_id: "", name: "", display_name: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (edit) setForm({ subject_id: edit.subject_id, name: edit.name, display_name: edit.display_name, slug: edit.slug });
  }, [edit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const method = edit ? "PUT" : "POST";
    const url = edit ? `/api/admin/topics/${edit.id}` : "/api/admin/topics";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setMsg(`✅ ${edit ? "更新" : "添加"}成功`); if (!edit) setForm({ subject_id: "", name: "", display_name: "", slug: "" }); onSaved(); }
    else { const d = await res.json(); setMsg("❌ " + (d.error || "失败")); }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className={`bg-white p-4 rounded-lg border space-y-3 ${edit ? "ring-2 ring-blue-400" : ""}`}>
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{edit ? "编辑主题" : "添加主题"}</h3>
        {edit && <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">✕ 取消</button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded px-3 py-2 text-sm" placeholder="科目 ID" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="名称 (英文)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="显示名 (中文)" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required />
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
        {saving ? "保存中..." : edit ? "更新主题" : "添加主题"}
      </button>
    </form>
  );
}

// ========== NOTE FORM ==========
function NoteForm({ edit, onSaved, onCancel }: {
  edit: Note | null; onSaved: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ topic_id: "", title: "", content: "", is_free_preview: false });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (edit) setForm({ topic_id: edit.topic_id, title: edit.title, content: edit.content || "", is_free_preview: edit.is_free_preview });
  }, [edit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");

    if (edit && !file) {
      // 纯文本编辑，不需要文件
      const res = await fetch(`/api/admin/notes/${edit.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setMsg("✅ 更新成功"); onSaved(); }
      else { const d = await res.json(); setMsg("❌ " + (d.error || "失败")); }
    } else {
      // 新增 或 替换 PDF
      const formData = new FormData();
      formData.append("topic_id", form.topic_id);
      formData.append("title", form.title);
      formData.append("content", form.content);
      formData.append("is_free_preview", String(form.is_free_preview));
      if (file) formData.append("file", file);
      const res = await fetch("/api/admin/notes/upload", {
        method: "POST", body: formData,
      });
      if (res.ok) { setMsg("✅ 添加成功"); setForm({ topic_id: "", title: "", content: "", is_free_preview: false }); setFile(null); if (fileRef.current) fileRef.current.value = ""; onSaved(); }
      else { const d = await res.json(); setMsg("❌ " + (d.error || "失败")); }
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className={`bg-white p-4 rounded-lg border space-y-3 ${edit ? "ring-2 ring-blue-400" : ""}`}>
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{edit ? "编辑笔记" : "添加笔记（支持 PDF 上传）"}</h3>
        {edit && <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">✕ 取消</button>}
      </div>
      <div className="space-y-3">
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="主题 ID" value={form.topic_id} onChange={e => setForm({...form, topic_id: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="标题" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
        <textarea className="border rounded px-3 py-2 text-sm w-full h-24" placeholder="内容描述 (可选，Markdown)" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
        {!edit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF 文件</label>
            <input ref={fileRef} type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="border rounded px-3 py-2 text-sm w-full" />
            {file && <p className="text-xs text-gray-400 mt-1">📄 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_free_preview} onChange={e => setForm({...form, is_free_preview: e.target.checked})} /> 免费预览
        </label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
        {saving ? "保存中..." : edit ? "更新笔记" : "添加笔记"}
      </button>
    </form>
  );
}
