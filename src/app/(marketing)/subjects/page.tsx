import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const STATIC_SUBJECTS: Record<string, { name: string; display_name: string; board: string; code: string; icon: string }> = {
  "caie-physics":     { name: "Physics",     display_name: "Physics",     board: "CAIE",    code: "0625", icon: "⚛️" },
  "caie-chemistry":   { name: "Chemistry",   display_name: "Chemistry",   board: "CAIE",    code: "0620", icon: "🧪" },
  "caie-biology":     { name: "Biology",     display_name: "Biology",     board: "CAIE",    code: "0610", icon: "🧬" },
  "caie-mathematics": { name: "Mathematics", display_name: "Mathematics", board: "CAIE",    code: "0580", icon: "📐" },
  "edexcel-physics":  { name: "Physics",     display_name: "Physics",     board: "Edexcel", code: "4PH1", icon: "⚛️" },
  "edexcel-chemistry":{ name: "Chemistry",   display_name: "Chemistry",   board: "Edexcel", code: "4CH1", icon: "🧪" },
  "edexcel-biology":  { name: "Biology",     display_name: "Biology",     board: "Edexcel", code: "4BI1", icon: "🧬" },
  "edexcel-mathematics":{ name: "Mathematics", display_name: "Mathematics", board: "Edexcel", code: "4MA1", icon: "📐" },
};

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board } = await searchParams;
  const activeBoard = board || "CAIE";

  // Try DB, fallback to static
  const supabase = createClient();
  let query = supabase
    .from("subjects")
    .select("name, display_name, code, slug, icon, price_cny")
    .eq("is_published", true)
    .order("sort_order");

  const { data: dbSubjects } = await query;

  const allSubjects = (dbSubjects && dbSubjects.length > 0 ? dbSubjects : []).map((s: any) => ({
    ...s,
    board: "CAIE",
    price: s.price_cny ? `¥${(s.price_cny / 100).toFixed(0)}` : `¥299`,
  }));

  // If DB is empty, use static data filtered by board
  const staticSubjects = Object.entries(STATIC_SUBJECTS)
    .filter(([, v]) => v.board === activeBoard)
    .map(([slug, s]) => ({
      slug,
      display_name: s.display_name,
      name: s.name,
      board: s.board,
      code: s.code,
      icon: s.icon,
      price: "¥299",
    }));

  const displaySubjects = allSubjects.length > 0 ? allSubjects : staticSubjects;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">All Subjects</h1>
        <p className="text-gray-500 text-lg">Choose your exam board and subject</p>
      </div>

      {/* Board tabs */}
      <div className="flex justify-center gap-4 mb-10">
        {["CAIE", "Edexcel"].map((b) => (
          <Link
            key={b}
            href={`/subjects?board=${b}`}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              b === activeBoard
                ? "bg-primary-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {b}
          </Link>
        ))}
      </div>

      {/* Subject grid */}
      {displaySubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displaySubjects.map((s: any) => (
            <Link
              key={s.slug}
              href={`/subjects/${s.slug}?board=${s.board}`}
              className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{s.icon || "📚"}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-semibold">
                      {s.board}
                    </span>
                    <span className="text-xs text-gray-400">{s.code}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition">
                    {s.display_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{s.name}</p>
                  <p className="text-accent-500 font-bold mt-3">{s.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">No {activeBoard} subjects available yet</p>
      )}

      {/* CTA */}
      <div className="text-center mt-16 pt-12 border-t">
        <p className="text-gray-500 mb-4">Covering all CAIE &amp; Edexcel IGCSE subjects</p>
        <Link
          href="/register"
          className="inline-block bg-accent-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent-600 transition"
        >
          Sign Up to Unlock All →
        </Link>
      </div>
    </div>
  );
}
