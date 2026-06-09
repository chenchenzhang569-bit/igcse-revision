import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase-client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// force-redeploy-v4-inline-r2
export const revalidate = 3600;

const supabase = getSupabaseClient();

const SUBJECT_MAP: Record<string, { name: string; icon: string; dbSubject: string }> = {
  "caie-physics-0625": { name: "Physics", icon: "⚛️", dbSubject: "physics" },
  "caie-chemistry-0620": { name: "Chemistry", icon: "🧪", dbSubject: "chemistry" },
  "caie-biology-0610": { name: "Biology", icon: "🧬", dbSubject: "biology" },
  "caie-mathematics-0580": { name: "Mathematics", icon: "📐", dbSubject: "maths" },
  "caie-computer-science-0478": { name: "Computer Science", icon: "💻", dbSubject: "computer-science" },
  "caie-economics-0455": { name: "Economics", icon: "📊", dbSubject: "economics" },
  "caie-additional-mathematics-0606": { name: "Additional Math", icon: "➕", dbSubject: "0606" },
  "edexcel-biology-4bi1": { name: "Biology (Edexcel)", icon: "🧬", dbSubject: "edexcel-biology" },
  "edexcel-chemistry-4ch1": { name: "Chemistry (Edexcel)", icon: "🧪", dbSubject: "edexcel-chemistry" },
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
  params: { subjectSlug: string };
}) {
  const { subjectSlug } = params;
  const subject = SUBJECT_MAP[subjectSlug];
  if (!subject) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Subject not found</p>
        <Link href="/" className="text-primary-600 mt-4 inline-block font-semibold">← Home</Link>
      </div>
    );
  }

  // --- Paywall check ---
  let hasAccess = false;
  let subjectId: string | null = null;
  let subjectBoard: string | null = null;
  try {
    const serverClient = createClient();
    // Get subject_id and board from DB
    const parts = subjectSlug.split("-");
    const code = parts[parts.length - 1]?.toUpperCase();
    const { data: subjectRow } = await serverClient
      .from("subjects")
      .select("id, exam_boards(slug)")
      .eq("code", code)
      .single();
    subjectId = subjectRow?.id || null;
    subjectBoard = (subjectRow as any)?.exam_boards?.slug || null;

    const { data: { user } } = await serverClient.auth.getUser();
    if (user && subjectId) {
      const { data: purchases } = await serverClient
        .from("purchases")
        .select("id, subject_id, status, expires_at")
        .eq("user_id", user.id)
        .in("status", ["paid", "trial"]);
      if (purchases && purchases.length > 0) {
        const now = new Date();
        if (purchases.some((p: any) => !p.subject_id && (!p.expires_at || new Date(p.expires_at) > now))) {
          hasAccess = true;
        } else {
          hasAccess = purchases.some((p: any) =>
            p.subject_id === subjectId &&
            (!p.expires_at || new Date(p.expires_at) > now)
          );
        }
      }
    }
  } catch (e) {
    console.error("Paywall check failed:", e);
  }

  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Link href="/" className="text-sm text-gray-400 hover:text-primary-600 transition mb-4 inline-block">← Back to Home</Link>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-4xl sm:text-5xl">{subject.icon}</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">CAIE IGCSE {subject.name}</h1>
          </div>
        </div>
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Subscribe to Access</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get full access to mock exams for {subject.name}
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
          >
            View Plans →
          </Link>
          <p className="text-xs text-gray-400 mt-4">Starting from ¥50 per subject</p>
        </div>
      </div>
    );
  }
  // --- End paywall ---

  // Fetch mock exam data
  const R2_SUBJECTS = ["edexcel-biology", "edexcel-chemistry"];
  const isR2Subject = R2_SUBJECTS.includes(subject.dbSubject);

  if (isR2Subject) {
    // Fetch from R2 directly (inline, no HTTP self-call)
    const r2Acct = process.env.R2_ACCOUNT_ID || "7524670a3d7d50fd979765dedb5b378d";
    const r2Key = process.env.R2_ACCESS_KEY || "baf9fd99dfe0501ceb0f8da65bccfbfc";
    const r2Secret = process.env.R2_SECRET_KEY || "";
    const r2s3 = new S3Client({
      region: "auto",
      endpoint: `https://${r2Acct}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2Key, secretAccessKey: r2Secret },
    });
    let rawQuestions: any[];
    try {
      const r2Filename = subject.dbSubject === "edexcel-chemistry"
        ? "mock/edexcel_chem_mock_questions.json"
        : "mock/edexcel_bio_mock_questions.json";
      const cmd = new GetObjectCommand({
        Bucket: "sme-images",
        Key: r2Filename,
      });
      const resp = await r2s3.send(cmd);
      const body = await resp.Body!.transformToString("utf-8");
      rawQuestions = JSON.parse(body);
    } catch (e) {
      console.error("R2 direct fetch error:", e);
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
    } // end catch

    // Group by set/paper
    const setMap: Record<string, { setNumber: number; slug: string; papers: any[] }> = {};
    const paperQuestionCount: Record<string, number> = {};

    for (const q of rawQuestions) {
      const setKey = q.set; // "set-1"
      const paperKey = `${q.set}-${q.paper}`; // "set-1-paper-1b"
      if (!setMap[setKey]) {
        setMap[setKey] = {
          setNumber: parseInt(q.set.split("-")[1]),
          slug: q.set,
          papers: [],
        };
      }
      // Add paper if not yet in set
      const isPaper1c = q.paper === "paper-1c";
      const isPaper1b = q.paper === "paper-1b";
      const paperNum = isPaper1c ? "1C" : (isPaper1b ? "1B" : "2B");
      const paperMins = (isPaper1c || isPaper1b) ? 120 : 75;
      const slugPrefix = subjectSlug === "edexcel-chemistry-4ch1" ? "edexcel-chemistry-" : "edexcel-biology-";
      const paperSlug = `${slugPrefix}${q.set}-${q.paper}`;
      const existingPaper = setMap[setKey].papers.find((p) => p.slug === paperSlug);
      if (!existingPaper) {
        setMap[setKey].papers.push({
          id: paperKey,
          paper_type: "Theory",
          paper_number: paperNum,
          minutes: paperMins,
          total_marks: 0,
          slug: paperSlug,
        });
        paperQuestionCount[paperKey] = 0;
      }
      paperQuestionCount[paperKey] = (paperQuestionCount[paperKey] || 0) + 1;
      // Sum marks
      const p = setMap[setKey].papers.find((p) => p.slug === paperSlug);
      if (p) p.total_marks += (q.marks || 0);
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Link href="/" className="text-sm text-gray-400 hover:text-primary-600">← Home</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 mt-4">
          {subject.icon} {subject.name} Mock Exams
        </h1>
        <p className="text-gray-500 mt-1">Edexcel IGCSE Biology — 3 complete mock exam sets</p>
        <div className="mt-8 space-y-8">
          {Object.entries(setMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([setKey, setData]) => (
              <div key={setKey} className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-800">Set {setData.setNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 border-purple-200 text-purple-700">
                      Extended
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {setData.papers.reduce((sum, p) => sum + (paperQuestionCount[p.id] || 0), 0)} questions
                  </span>
                </div>
                <div className="divide-y">
                  {setData.papers.map((paper: any) => {
                    const qCount = paperQuestionCount[paper.id] || 0;
                    return (
                      <Link
                        key={paper.id}
                        href={`/mock-exams/${subjectSlug}/${paper.slug}`}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📝</span>
                          <div>
                            <span className="font-medium text-gray-800 group-hover:text-primary-600 transition">
                              {paper.paper_number} — Theory
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
            ))}
        </div>
      </div>
    );
  }

  // Original DB-based fetch for CAIE subjects
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

      <div className="mt-8 space-y-8">
        {(() => {
          const syllabusNames: Record<string, string> = {
            "0580": "CIE Math 0580",
            "0607": "International Math 0607",
          };
          const grouped: Record<string, any[]> = {};
          for (const s of sets) {
            const prefix = s.slug.split("-")[0];
            const key = syllabusNames[prefix] ? prefix : "_default";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(s);
          }
          return Object.entries(grouped).map(([key, groupSets]) => (
            <div key={key}>
              {key !== "_default" && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 ml-1">
                  {syllabusNames[key] || key}
                </h3>
              )}
              <div className="space-y-6">
                {groupSets.map((set: any) => {
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
          ));
        })()}
      </div>
    </div>
  );
}
