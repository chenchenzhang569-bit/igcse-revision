"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type MockExam = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  answer_url: string | null;
  duration_minutes: number | null;
  total_marks: number | null;
  is_free_preview: boolean;
};

export default function MockExamsPage({
  params,
}: {
  params: { subjectSlug: string };
}) {
  const subjectSlug = params.subjectSlug;
  const [exams, setExams] = useState<MockExam[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectSlug) return;
    async function load() {
      const subRes = await fetch(`/api/subjects?slug=${subjectSlug}`);
      if (subRes.ok) {
        const subs = await subRes.json();
        if (subs[0]) {
          setSubjectName(subs[0].display_name);
          const examRes = await fetch(`/api/mock-exams?subject_id=${subs[0].id}`);
          if (examRes.ok) setExams(await examRes.json());
        }
      }
      setLoading(false);
    }
    load();
  }, [subjectSlug]);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/subjects/${subjectSlug}`} className="text-sm text-gray-400 hover:text-primary-600 transition">
          ← Back to {subjectName || "Subject"}
        </Link>
        <h1 className="text-3xl font-bold text-primary-900 mt-2">📝 {subjectName} Mock Exams</h1>
        <p className="text-gray-500 mt-1">Self-assessment mock exams to identify gaps</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-20">Loading...</p>
      ) : exams.length === 0 ? (
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">
          <p className="font-medium mb-1">No mock exams yet</p>
          <p className="text-sm">Our team is preparing them. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white border rounded-xl p-6 hover:shadow-md transition">
              <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
              {exam.description && <p className="text-sm text-gray-500 mt-1 mb-4">{exam.description}</p>}
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                {exam.duration_minutes && <span>⏱ {exam.duration_minutes} min</span>}
                {exam.total_marks && <span>📊 {exam.total_marks} marks</span>}
                {exam.answer_url ? <span>✅ Answers included</span> : <span>⏳ Answers pending</span>}
              </div>
              <div className="flex gap-3">
                <a
                  href={exam.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                >
                  Download Paper
                </a>
                {exam.answer_url && (
                  <a
                    href={exam.answer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Download Answers
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
