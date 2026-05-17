import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  "https://aondldqwwvttwpervrfq.supabase.co",
  "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
);

const SUBJECT_MAP: Record<string, { name: string; icon: string; dbSubject: string }> = {
  "caie-physics-0625": { name: "Physics", icon: "⚛️", dbSubject: "physics" },
  "caie-chemistry-0620": { name: "Chemistry", icon: "🧪", dbSubject: "chemistry" },
  "caie-biology-0610": { name: "Biology", icon: "🧬", dbSubject: "biology" },
  "caie-mathematics-0580": { name: "Mathematics", icon: "📐", dbSubject: "maths" },
};

const TIER_COLORS: Record<string, string> = {
  Core: "bg-blue-50 border-blue-200 text-blue-700",
  Extended: "bg-purple-50 border-purple-200 text-purple-700",
};

const PAPER_ICONS: Record<string, string> = {
  MCQ: "📋",
  Theory: "📝",
  Practical: "🔬",
};

export default async function MockExamsPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;
  const subject = SUBJECT_MAP[subjectSlug];
  if (!subject) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">← Home</Link>
      </div>
    );
  }

  // Fetch mock exam sets
  const { data: sets } = await supabase
    .from("mock_exam_sets")
    .select("id, set_number, tier, slug")
    .eq("subject", subject.dbSubject)
    .order("set_number");

  if (!sets || sets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Link href="/" className="text-sm text-gray-400 hover:text-primary-600">← Home</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">
          {subject.icon} {subject.name} Mock Exams
        </h1>
        <div className="mt-8 bg-gray-50 border rounded-xl p-8 text-center text-gray-600">
          <p className="font-medium">Mock exams coming soon</p>
        </div>
      </div>
    );
  }

  // Fetch all papers and question counts for these sets
  const setIds = sets.map((s: any) => s.id);
  const { data: papers } = await supabase
    .from("mock_exam_papers")
    .select("id, set_id, paper_type, paper_number, minutes, total_marks, slug")
    .in("set_id", setIds)
    .order("paper_type");

  // Count questions per paper
  const paperIds = papers?.map((p: any) => p.id) || [];
  const { data: qCounts } = await supabase
    .from("mock_exam_questions")
    .select("paper_id")
    .in("paper_id", paperIds);

  const countMap: Record<string, number> = {};
  if (qCounts) {
    for (const q of qCounts as any[]) {
      countMap[q.paper_id] = (countMap[q.paper_id] || 0) + 1;
    }
  }

  // Group papers by set
  const papersBySet: Record<string, any[]> = {};
  if (papers) {
    for (const p of papers as any[]) {
      if (!papersBySet[p.set_id]) papersBySet[p.set_id] = [];
      papersBySet[p.set_id].push(p);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-primary-600">← Home</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">
        {subject.icon} {subject.name} Mock Exams
      </h1>
      <p className="text-gray-500 mt-1">CAIE IGCSE — 8 complete mock exam sets</p>

      <div className="mt-8 space-y-6">
        {sets.map((set: any) => {
          const setPapers = papersBySet[set.id] || [];
          return (
            <div key={set.id} className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">Set {set.set_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[set.tier] || "bg-gray-100 text-gray-600"}`}>
                    {set.tier}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {setPapers.reduce((sum: number, p: any) => sum + (countMap[p.id] || 0), 0)} questions
                </span>
              </div>
              <div className="divide-y">
                {setPapers.map((paper: any) => {
                  const qCount = countMap[paper.id] || 0;
                  return (
                    <Link
                      key={paper.id}
                      href={`/mock-exams/${subjectSlug}/${paper.slug}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{PAPER_ICONS[paper.paper_type] || "📄"}</span>
                        <div>
                          <span className="font-medium text-gray-800 group-hover:text-primary-600 transition">
                            {paper.paper_number} — {paper.paper_type}
                          </span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {paper.minutes} min · {paper.total_marks} marks · {qCount} questions
                          </div>
                        </div>
                      </div>
                      <span className="text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                        Start →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
