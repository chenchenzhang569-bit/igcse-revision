"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PastPaper = {
  id: string;
  title: string;
  year: number;
  season: string;
  paper_number: number;
  paper_type: string;
  file_url: string;
  is_free: boolean;
  subject_id: string;
};

export default function PastPapersAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    subject_id: "", title: "", year: new Date().getFullYear(),
    season: "Summer", paper_number: 1, paper_type: "Question Paper", is_free: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push("/login?redirect=/admin/past-papers"); return; }
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function fetchPapers() {
    const res = await fetch("/api/past-papers");
    if (res.ok) setPapers(await res.json());
  }

  useEffect(() => { if (!loading) fetchPapers(); }, [loading]);

  async function handleDelete(id: string) {
    if (!confirm("确认删除？")) return;
    const res = await fetch(`/api/admin/past-papers/${id}`, { method: "DELETE" });
    if (res.ok) fetchPapers();
    else alert("删除失败");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg("请选择 PDF 文件"); return; }
    setSaving(true); setMsg("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("subject_id", form.subject_id);
    fd.append("title", form.title);
    fd.append("year", String(form.year));
    fd.append("season", form.season);
    fd.append("paper_number", String(form.paper_number));
    fd.append("paper_type", form.paper_type);
    fd.append("is_free", String(form.is_free));

    const res = await fetch("/api/admin/past-papers/upload", { method: "POST", body: fd });
    if (res.ok) {
      setMsg("✅ 上传成功");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchPapers();
    } else {
      const d = await res.json();
      setMsg("❌ " + (d.error || "失败"));
    }
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  const grouped: Record<string, PastPaper[]> = {};
  papers.forEach((p) => {
    const key = `${p.year} · ${p.season}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-primary-600">🎓 IGCSE</Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium">真题管理</span>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">后台首页</Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">返回前台</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border space-y-3 mb-8">
          <h3 className="font-medium">上传真题 PDF</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input className="border rounded px-3 py-2 text-sm" placeholder="科目 ID" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
            <input className="border rounded px-3 py-2 text-sm" placeholder="标题" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="年份" value={form.year} onChange={e => setForm({...form, year: Number(e.target.value)})} required />
            <select className="border rounded px-3 py-2 text-sm" value={form.season} onChange={e => setForm({...form, season: e.target.value})}>
              <option value="Summer">夏季 (May/Jun)</option>
              <option value="Winter">冬季 (Oct/Nov)</option>
              <option value="Spring">春季 (Feb/Mar)</option>
            </select>
            <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="试卷号" value={form.paper_number} onChange={e => setForm({...form, paper_number: Number(e.target.value)})} required />
            <select className="border rounded px-3 py-2 text-sm" value={form.paper_type} onChange={e => setForm({...form, paper_type: e.target.value})}>
              <option value="Question Paper">试卷</option>
              <option value="Mark Scheme">评分标准</option>
              <option value="Insert">附加材料</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="border rounded px-3 py-2 text-sm flex-1" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_free} onChange={e => setForm({...form, is_free: e.target.checked})} /> 免费
            </label>
            <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50">
              {saving ? "上传中..." : "上传真题"}
            </button>
          </div>
          {file && <p className="text-xs text-gray-400">📄 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
          {msg && <p className="text-sm">{msg}</p>}
        </form>

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <p className="text-gray-400 text-center py-12">暂无真题</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([key, yearPapers]) => (
              <div key={key}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{key}</h2>
                <div className="space-y-2">
                  {yearPapers.map((paper) => (
                    <div key={paper.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                      <div>
                        <span className="font-medium">{paper.title}</span>
                        <span className="text-xs text-gray-400 ml-2">{paper.paper_type} · Paper {paper.paper_number}</span>
                        {paper.is_free && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded ml-2">免费</span>}
                      </div>
                      <div className="flex gap-2">
                        <a href={paper.file_url} target="_blank" className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">预览</a>
                        <button onClick={() => handleDelete(paper.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
