import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

function groupByBoard(subjects: any[]) {
  const map = new Map<string, any[]>();
  subjects.forEach((s) => {
    const board = s.board || "Other";
    if (!map.has(board)) map.set(board, []);
    map.get(board)!.push(s);
  });
  // CAIE first, then Edexcel
  const order = ["CAIE", "Edexcel"];
  const result: [string, any[]][] = [];
  order.forEach((b) => { if (map.has(b)) result.push([b, map.get(b)!]); });
  // Any remaining boards
  map.forEach((v, k) => { if (!order.includes(k)) result.push([k, v]); });
  return result;
}

export default async function SubjectsPage() {
  const supabase = createClient();
  const { data: dbSubjects } = await supabase
    .from("subjects")
    .select("name, display_name, code, slug, icon, price_cny")
    .eq("is_published", true)
    .order("sort_order");

  const allSubjects = (dbSubjects || []).map((s: any) => ({
    ...s,
    board: s.slug?.startsWith("edexcel") ? "Edexcel" : "CAIE",
    price: s.price_cny ? `¥${(s.price_cny / 100).toFixed(0)}` : `¥50`,
    originalPrice: s.price_cny ? `¥${(s.price_cny / 100 * 2).toFixed(0)}` : `¥100`,
  }));

  // Fallback to static if DB empty
  const staticSubjects = Object.entries(STATIC_SUBJECTS).map(([slug, s]) => ({
    slug,
    display_name: s.display_name,
    name: s.name,
    board: s.board,
    code: s.code,
    icon: s.icon,
    price: "¥50",
    originalPrice: "¥100",
  }));

  const displaySubjects = allSubjects.length > 0 ? allSubjects : staticSubjects;
  const grouped = groupByBoard(displaySubjects);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">All Subjects</h1>
        <p className="text-gray-500 text-lg">CAIE &amp; Edexcel IGCSE</p>
      </div>

      {grouped.map(([board, subjects]) => (
        <div key={board} className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-bold text-primary-900">{board}</h2>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {subjects.map((s: any) => (
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
                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="text-accent-500 font-bold text-lg">{s.price}</span>
                      <span className="text-sm text-gray-400 line-through">{s.originalPrice}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="text-center mt-16 pt-12 border-t">
        <p className="text-gray-500 mb-4">Covering all CAIE &amp; Edexcel IGCSE subjects</p>
        <Link
          href="/pricing"
          className="inline-block bg-accent-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent-600 transition"
        >
          Get Full Access →
        </Link>
      </div>
    </div>
  );
}
