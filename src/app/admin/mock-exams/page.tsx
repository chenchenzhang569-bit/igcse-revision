"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MockExam = {
  id: string; subject_id: string; title: string; description: string | null;
  file_url: string; answer_url: string | null;
  duration_minutes: number | null; total_marks: number | null;
  is_free_preview: boolean;
};

export default function MockExamsAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const fQ = useRef<HTMLInputElement>(null);
  const fA = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [form, setForm] = useState({ subject_id: "", title: "", description: "", duration_minutes: "", total_marks: "", is_free_preview: false });
  const [fileQ, setFileQ] = useState<File | null>(null);
  const [fileA, setFileA] = useState<File | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push("/login?redirect=/admin/mock-exams"); return; }
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function fetchExams() {
    const res = await fetch("/api/mock-exams");
    if (res.ok) setExams(await res.json());
  }
  useEffect(() => { if (!loading) fetchExams(); }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileQ) { setMsg("请选择试卷 PDF"); return; }
    setSaving(true); setMsg("");
    const fd = new FormData();
    fd.append("subject_id", form.subject_id);
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("duration_minutes", form.duration_minutes);
    fd.append("total_marks", form.total_marks);
    fd.append("is_free_preview", String(form.is_free_preview));
    fd.append("file_q", fileQ);
    if (fileA) fd.append("file_a", fileA);

    const res = await fetch("/api/admin/mock-exams/upload", { method: "POST", body: fd });
    if (res.ok) {
      setMsg("✅ 上传成功");
      setFileQ(null); setFileA(null);
      if (fQ.current) fQ.current.value = "";
      if (fA.current) fA.current.value = "";
      fetchExams();
    } else { const d = await res.json(); setMsg("❌ " + (d.error || "失败")); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除？")) return;
    const res = await fetch(`/api/admin/mock-exams/${id}`, { method: "DELETE" });
    if (res.ok) fetchExams(); else alert("删除失败");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-primary-600">🎓 IGCSE</Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium">模拟试卷管理</span>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">后台首页</Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">返回前台</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border space-y-3 mb-8">
          <h3 className="font-medium">上传模拟试卷</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input className="border rounded px-3 py-2 text-sm" placeholder="科目 ID" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
            <input className="border rounded px-3 py-2 text-sm" placeholder="标题" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            <input className="border rounded px-3 py-2 text-sm" placeholder="描述" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="时长(分钟)" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} />
            <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="总分" value={form.total_marks} onChange={e => setForm({...form, total_marks: e.target.value})} />
          </div>
          <div className="space-y-2">
            <div><label className="text-xs text-gray-500">试卷 PDF *</label>
              <input ref={fQ} type="file" accept=".pdf" onChange={e => setFileQ(e.target.files?.[0] || null)} className="border rounded px-3 py-2 text-sm w-full" required />
              {fileQ && <p className="text-xs text-gray-400">📄 {fileQ.name}</p>}
            </div>
            <div><label className="text-xs text-gray-500">答案 PDF（可选）</label>
              <input ref={fA} type="file" accept=".pdf" onChange={e => setFileA(e.target.files?.[0] || null)} className="border rounded px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_free_preview} onChange={e => setForm({...form, is_free_preview: e.target.checked})} /> 免费预览
            </label>
            <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
              {saving ? "上传中..." : "上传试卷"}
            </button>
          </div>
          {msg && <p className="text-sm">{msg}</p>}
        </form>

        {exams.length === 0 ? (
          <p className="text-gray-400 text-center py-12">暂无模拟试卷</p>
        ) : (
          <div className="space-y-3">
            {exams.map((e) => (
              <div key={e.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                <div>
                  <span className="font-medium">{e.title}</span>
                  {e.description && <span className="text-gray-400 text-sm ml-2">— {e.description}</span>}
                  <div className="text-xs text-gray-400 mt-1">
                    {e.duration_minutes && <span>⏱ {e.duration_minutes}分钟</span>}
                    {e.total_marks && <span className="ml-3">📊 {e.total_marks}分</span>}
                    {e.is_free_preview && <span className="ml-3 text-green-500">免费</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={e.file_url} target="_blank" className="text-xs text-blue-500 px-2 py-1">试卷</a>
                  {e.answer_url && <a href={e.answer_url} target="_blank" className="text-xs text-green-500 px-2 py-1">答案</a>}
                  <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
