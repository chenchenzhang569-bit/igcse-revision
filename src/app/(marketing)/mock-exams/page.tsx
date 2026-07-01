import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mock Exams",
  description:
    "Take free IGCSE mock exams online for CAIE and Edexcel. Full-length practice papers with automatic scoring for Physics, Chemistry, Biology, Mathematics, and more.",
  keywords: [
    "IGCSE mock exams",
    "IGCSE practice tests",
    "IGCSE online exam",
    "CAIE mock exams",
    "Edexcel mock exams",
    "IGCSE exam practice",
    "IGCSE test online",
    // Chinese keywords
    "IGCSE 模拟考试",
    "IGCSE 在线测试",
    "IGCSE 模考",
    "IGCSE 刷题",
    "IGCSE 练习",
    "CAIE 模拟考试",
    "Edexcel 模拟考试",
    "IGCSE 考前模拟",
  ],
  openGraph: {
    title: "IGCSE Mock Exams | IGMaster",
    description:
      "Free IGCSE mock exams with automatic scoring. Practice full-length papers online.",
    url: "https://igmaster.org/mock-exams",
  },
  alternates: {
    canonical: "https://igmaster.org/mock-exams",
  },
};

export const revalidate = 3600;

const supabase = getSupabaseClient();

const SUBJECT_MAP: Record<string, { name: string; icon: string; slug: string }> = {
  physics: { name: "Physics (0625)", icon: "⚛️", slug: "caie-physics-0625" },
  chemistry: { name: "Chemistry (0620)", icon: "🧪", slug: "caie-chemistry-0620" },
  biology: { name: "Biology (0610)", icon: "🧬", slug: "caie-biology-0610" },
  maths: { name: "Mathematics (0580)", icon: "📐", slug: "caie-mathematics-0580" },
  "computer-science": { name: "Computer Science (0478)", icon: "💻", slug: "caie-computer-science-0478" },
  economics: { name: "Economics (0455)", icon: "📊", slug: "caie-economics-0455" },
  "0606": { name: "Additional Mathematics (0606)", icon: "➕", slug: "caie-additional-mathematics-0606" },
};

export default async function MockExamsIndexPage() {
  const { data: sets } = await supabase
    .from("mock_exam_sets")
    .select("subject, set_number")
    .order("subject");

  // Build set count per db subject
  const setCount: Record<string, number> = {};
  const subjectSet = new Set<string>();
  if (sets) {
    for (const s of sets as any[]) {
      if (s.subject) {
        subjectSet.add(s.subject);
        setCount[s.subject] = (setCount[s.subject] || 0) + 1;
      }
    }
  }

  const availableSubjects = Array.from(subjectSet)
    .map((dbSubject) => ({ dbSubject, ...SUBJECT_MAP[dbSubject] }))
    .filter((s) => s.slug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary-900 mb-2">Mock Exams</h1>
      <p className="text-gray-500 mb-8">Full-length mock exam papers. Select a subject to get started.</p>

      {availableSubjects.length === 0 ? (
        <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-600">
          <p className="font-medium">Mock exams coming soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableSubjects.map((s) => (
            <Link
              key={s.slug}
              href={`/mock-exams/${s.slug}`}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-primary-300 transition-all group flex items-center gap-4"
            >
              <span className="text-3xl">{s.icon}</span>
              <div>
                <h3 className="font-semibold text-primary-900 group-hover:text-primary-600 transition">{s.name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {setCount[s.dbSubject]} sets · Start mock exam →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
