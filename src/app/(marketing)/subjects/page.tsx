"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Subject {
  slug: string;
  display_name: string;
  name: string;
  board: string;
  code: string;
  icon: string;
  price: string;
  originalPrice: string;
}

export default function SubjectsPage() {
  const [activeBoard, setActiveBoard] = useState<"CAIE" | "Edexcel">("CAIE");
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("subjects")
      .select("slug, display_name, name, code, icon, price_cny")
      .eq("is_published", true)
      .order("sort_order")
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setSubjects(
            data.map((s: any) => ({
              slug: s.slug,
              display_name: s.display_name || s.name,
              name: s.name,
              board: s.slug?.startsWith("edexcel") ? "Edexcel" : "CAIE",
              code: s.code || "",
              icon: s.icon || "📚",
              price: s.price_cny ? `¥${(s.price_cny / 100).toFixed(0)}` : "¥50",
              originalPrice: s.price_cny ? `¥${(s.price_cny / 100 * 2).toFixed(0)}` : "¥100",
            }))
          );
        }
      });
  }, []);

  const filtered = subjects.filter((s) => s.board === activeBoard);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">All Subjects</h1>
        <p className="text-gray-500 text-lg">CAIE &amp; Edexcel IGCSE</p>
      </div>

      {/* Board Tabs */}
      <div className="flex justify-center gap-2 mb-10">
        {(["CAIE", "Edexcel"] as const).map((board) => (
          <button
            key={board}
            onClick={() => setActiveBoard(board)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeBoard === board
                ? "bg-primary-900 text-white shadow-md"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {board}
            <span className="ml-1.5 text-xs opacity-70">
              ({subjects.filter((s) => s.board === board).length})
            </span>
          </button>
        ))}
      </div>

      {/* Subject Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((s) => (
            <Link
              key={s.slug}
              href={`/subjects/${s.slug}?board=${s.board}`}
              className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{s.icon}</span>
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
      ) : (
        <p className="text-center text-gray-400 py-12">No subjects found for {activeBoard}</p>
      )}

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
