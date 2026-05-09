"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Subject = {
  id: string;
  name: string;
  display_name: string;
  code: string | null;
  slug: string;
  price_cny: number;
  is_published: boolean;
  exam_boards: { name: string; slug: string } | null;
};

type Topic = {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  subject_id: string;
};

type Note = {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  is_free_preview: boolean;
};

type Tab = "subjects" | "topics" | "notes";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("subjects");

  // subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

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
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            返回首页
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {(["subjects", "topics", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {{ subjects: "科目", topics: "主题", notes: "笔记" }[t]}
            </button>
          ))}
        </div>

        {/* Subjects */}
        {tab === "subjects" && (
          <div>
            <SubjectForm onSaved={fetchSubjects} />
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
                  <span className={`text-xs px-2 py-1 rounded ${s.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.is_published ? "已发布" : "草稿"}
                  </span>
                </div>
              ))}
              {subjects.length === 0 && <p className="text-gray-400 text-center py-8">暂无科目</p>}
            </div>
          </div>
        )}

        {/* Topics */}
        {tab === "topics" && (
          <div>
            <TopicForm onSaved={fetchTopics} />
            <div className="mt-6 space-y-2">
              {topics.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-lg border">
                  <span className="font-medium">{t.display_name}</span>
                  <span className="text-gray-400 ml-2">({t.slug})</span>
                </div>
              ))}
              {topics.length === 0 && <p className="text-gray-400 text-center py-8">暂无主题</p>}
            </div>
          </div>
        )}

        {/* Notes */}
        {tab === "notes" && (
          <div>
            <NoteForm onSaved={fetchNotes} />
            <div className="mt-6 space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="bg-white p-4 rounded-lg border">
                  <span className="font-medium">{n.title}</span>
                  <span className={`text-xs ml-2 px-2 py-0.5 rounded ${n.is_free_preview ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>
                    {n.is_free_preview ? "免费预览" : "付费"}
                  </span>
                  <p className="text-sm text-gray-500 mt-1 truncate">{n.content.slice(0, 100)}</p>
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

function SubjectForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", display_name: "", code: "", slug: "", exam_board_slug: "caie", price_cny: 29900, is_published: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg("✅ 添加成功");
      setForm({ name: "", display_name: "", code: "", slug: "", exam_board_slug: "caie", price_cny: 29900, is_published: true });
      onSaved();
    } else {
      const data = await res.json();
      setMsg("❌ " + (data.error || "失败"));
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border space-y-3">
      <h3 className="font-medium">添加科目</h3>
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded px-3 py-2 text-sm" placeholder="名称 (英文)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="显示名 (中文)" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="代码 (如 0580)" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required />
        <select className="border rounded px-3 py-2 text-sm" value={form.exam_board_slug} onChange={e => setForm({...form, exam_board_slug: e.target.value})}>
          <option value="caie">CAIE</option>
          <option value="edexcel">Edexcel</option>
        </select>
        <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="价格 (分)" value={form.price_cny} onChange={e => setForm({...form, price_cny: Number(e.target.value)})} />
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
        {saving ? "保存中..." : "添加科目"}
      </button>
    </form>
  );
}

function TopicForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ subject_id: "", name: "", display_name: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg("✅ 添加成功");
      setForm({ subject_id: "", name: "", display_name: "", slug: "" });
      onSaved();
    } else {
      const data = await res.json();
      setMsg("❌ " + (data.error || "失败"));
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border space-y-3">
      <h3 className="font-medium">添加主题</h3>
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded px-3 py-2 text-sm" placeholder="科目 ID" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="名称 (英文)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="显示名 (中文)" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm" placeholder="slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required />
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
        {saving ? "保存中..." : "添加主题"}
      </button>
    </form>
  );
}

function NoteForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ topic_id: "", title: "", content: "", is_free_preview: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg("✅ 添加成功");
      setForm({ topic_id: "", title: "", content: "", is_free_preview: false });
      onSaved();
    } else {
      const data = await res.json();
      setMsg("❌ " + (data.error || "失败"));
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border space-y-3">
      <h3 className="font-medium">添加笔记</h3>
      <div className="space-y-3">
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="主题 ID" value={form.topic_id} onChange={e => setForm({...form, topic_id: e.target.value})} required />
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="标题" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
        <textarea className="border rounded px-3 py-2 text-sm w-full h-32" placeholder="内容 (Markdown)" value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_free_preview} onChange={e => setForm({...form, is_free_preview: e.target.checked})} />
          免费预览
        </label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
        {saving ? "保存中..." : "添加笔记"}
      </button>
    </form>
  );
}
