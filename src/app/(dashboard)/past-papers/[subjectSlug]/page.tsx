"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type PastPaper = {
  id: string;
  title: string;
  year: number;
  season: string;
  paper_number: number;
  paper_type: string;
  file_url: string;
  is_free: boolean;
};

export default function PastPapersPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const [subjectSlug, setSubjectSlug] = useState("");
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ subjectSlug }) => {
      setSubjectSlug(subjectSlug);
    });
  }, []);

  useEffect(() => {
    if (!subjectSlug) return;
    async function load() {
      // 先通过 slug 找到 subject_id
      const subRes = await fetch(`/api/subjects?slug=${subjectSlug}`);
      if (!subRes.ok) { setLoading(false); return; }
      const subjects = await subRes.json();
      const subject = subjects[0];
      if (!subject) { setLoading(false); return; }

      const res = await fetch(`/api/past-papers?subject_id=${subject.id}`);
      if (res.ok) setPapers(await res.json());
      setLoading(false);
    }
    load();
  }, [subjectSlug]);

  // 按年份分组
  const grouped: Record<string, PastPaper[]> = {};
  papers.forEach((p) => {
    const key = `${p.year} · ${p.season}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/subjects/${subjectSlug}`} className="text-sm text-gray-400 hover:text-primary-600 transition">
          ← 返回科目
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">📄 历年真题</h1>
        <p className="text-gray-500 mt-1">IGCSE 历年考试真题 PDF 下载</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-20">加载中...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          <p className="font-medium mb-1">暂无真题</p>
          <p className="text-sm">管理员正在上传中，请稍后再来</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([key, yearPapers]) => (
            <div key={key}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{key}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {yearPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{paper.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{paper.paper_type}</p>
                    </div>
                    <a
                      href={paper.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 text-sm font-medium hover:text-primary-700 transition"
                    >
                      下载
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
