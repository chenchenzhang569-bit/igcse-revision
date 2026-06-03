"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// Math topic slugs for search
const MATH_TOPICS: { slug: string; name: string }[] = [
  { slug: "number", name: "Number" },
  { slug: "algebra-graphs", name: "Algebra & Graphs" },
  { slug: "coordinate-geometry", name: "Coordinate Geometry" },
  { slug: "geometry", name: "Geometry" },
  { slug: "mensuration", name: "Mensuration" },
  { slug: "trigonometry", name: "Trigonometry" },
  { slug: "vectors-transformations", name: "Vectors & Transformations" },
  { slug: "probability", name: "Probability" },
  { slug: "statistics", name: "Statistics" },
];

// Full topic list from DB topics (used for science subjects with subtopics)
// For math, we use a hardcoded list since topics are sections, not subtopics
const MATH_FULL_TOPICS: { slug: string; name: string }[] = [
  { slug: "types-of-numbers", name: "Types of Numbers" },
  { slug: "powers-roots-and-standard-form", name: "Powers, Roots & Standard Form" },
  { slug: "fractions-decimals-and-percentages", name: "Fractions, Decimals & Percentages" },
  { slug: "introduction-to-fractions", name: "Introduction to Fractions" },
  { slug: "operations-with-fractions", name: "Operations with Fractions" },
  { slug: "percentages", name: "Percentages" },
  { slug: "simple-and-compound-interest", name: "Simple & Compound Interest" },
  { slug: "money-calculations", name: "Money Calculations" },
  { slug: "time-currency-and-conversions", name: "Time, Currency & Conversions" },
  { slug: "reading-and-ordering-numbers", name: "Reading & Ordering Numbers" },
  { slug: "operations-with-numbers-and-decimals", name: "Operations with Numbers & Decimals" },
  { slug: "rounding-estimation-and-bounds", name: "Rounding, Estimation & Bounds" },
  { slug: "prime-factors-hcf-and-lcm", name: "Prime Factors, HCF & LCM" },
  { slug: "ratio-and-proportion", name: "Ratio & Proportion" },
  { slug: "using-a-calculator", name: "Using a Calculator" },
  { slug: "introduction-to-algebra", name: "Introduction to Algebra" },
  { slug: "linear-equations", name: "Linear Equations" },
  { slug: "simultaneous-equations", name: "Simultaneous Equations" },
  { slug: "expanding-and-factorising-brackets", name: "Expanding & Factorising Brackets" },
  { slug: "rearranging-formulas", name: "Rearranging Formulas" },
  { slug: "inequalities", name: "Inequalities" },
  { slug: "sequences", name: "Sequences" },
  { slug: "linear-graphs", name: "Linear Graphs" },
  { slug: "further-graphs", name: "Further Graphs" },
  { slug: "real-life-graphs", name: "Real-Life Graphs" },
  { slug: "basic-angle-properties", name: "Basic Angle Properties" },
  { slug: "angles-in-polygons-and-parallel-lines", name: "Angles in Polygons & Parallel Lines" },
  { slug: "bearings-constructions-and-scale-drawings", name: "Bearings, Constructions & Scale Drawings" },
  { slug: "circle-theorems", name: "Circle Theorems" },
  { slug: "symmetry-and-shapes", name: "Symmetry & Shapes" },
  { slug: "congruence-and-similarity", name: "Congruence & Similarity" },
  { slug: "area-and-perimeter", name: "Area & Perimeter" },
  { slug: "circles-arcs-and-sectors", name: "Circles, Arcs & Sectors" },
  { slug: "volume-and-surface-area", name: "Volume & Surface Area" },
  { slug: "compound-measures", name: "Compound Measures" },
  { slug: "pythagoras", name: "Pythagoras" },
  { slug: "trigonometry-topic", name: "Trigonometry" },
  { slug: "transformations", name: "Transformations" },
  { slug: "basic-probability", name: "Basic Probability" },
  { slug: "set-notation-and-probability-diagrams", name: "Set Notation & Probability Diagrams" },
  { slug: "averages-and-range", name: "Averages & Range" },
  { slug: "statistical-diagrams", name: "Statistical Diagrams" },
  { slug: "scatter-graphs-and-correlation", name: "Scatter Graphs & Correlation" },
];

// Map from DB topic slugs to frontend topic slugs
const DB_TO_FRONTEND: Record<string, string> = {
  "caie-mathematics-0580-types-of-numbers": "types-of-numbers",
  "caie-mathematics-0580-powers-roots-and-standard-form": "powers-roots-and-standard-form",
  "caie-mathematics-0580-fractions-decimals-and-percentages": "fractions-decimals-and-percentages",
  "caie-mathematics-0580-introduction-to-fractions": "introduction-to-fractions",
  "caie-mathematics-0580-operations-with-fractions": "operations-with-fractions",
  "caie-mathematics-0580-percentages": "percentages",
  "caie-mathematics-0580-simple-and-compound-interest": "simple-and-compound-interest",
  "caie-mathematics-0580-money-calculations": "money-calculations",
  "caie-mathematics-0580-time-currency-and-conversions": "time-currency-and-conversions",
  "caie-mathematics-0580-reading-and-ordering-numbers": "reading-and-ordering-numbers",
  "caie-mathematics-0580-operations-with-numbers-and-decimals": "operations-with-numbers-and-decimals",
  "caie-mathematics-0580-rounding-estimation-and-bounds": "rounding-estimation-and-bounds",
  "caie-mathematics-0580-prime-factors-hcf-and-lcm": "prime-factors-hcf-and-lcm",
  "caie-mathematics-0580-ratio-and-proportion": "ratio-and-proportion",
  "caie-mathematics-0580-using-a-calculator": "using-a-calculator",
  "caie-mathematics-0580-introduction-to-algebra": "introduction-to-algebra",
  "caie-mathematics-0580-linear-equations": "linear-equations",
  "caie-mathematics-0580-simultaneous-equations": "simultaneous-equations",
  "caie-mathematics-0580-expanding-and-factorising-brackets": "expanding-and-factorising-brackets",
  "caie-mathematics-0580-rearranging-formulas": "rearranging-formulas",
  "caie-mathematics-0580-inequalities": "inequalities",
  "caie-mathematics-0580-sequences": "sequences",
  "caie-mathematics-0580-linear-graphs": "linear-graphs",
  "caie-mathematics-0580-further-graphs": "further-graphs",
  "caie-mathematics-0580-real-life-graphs": "real-life-graphs",
  "caie-mathematics-0580-basic-angle-properties": "basic-angle-properties",
  "caie-mathematics-0580-angles-in-polygons-and-parallel-lines": "angles-in-polygons-and-parallel-lines",
  "caie-mathematics-0580-bearings-constructions-and-scale-drawings": "bearings-constructions-and-scale-drawings",
  "caie-mathematics-0580-circle-theorems": "circle-theorems",
  "caie-mathematics-0580-symmetry-and-shapes": "symmetry-and-shapes",
  "caie-mathematics-0580-congruence-and-similarity": "congruence-and-similarity",
  "caie-mathematics-0580-area-and-perimeter": "area-and-perimeter",
  "caie-mathematics-0580-circles-arcs-and-sectors": "circles-arcs-and-sectors",
  "caie-mathematics-0580-volume-and-surface-area": "volume-and-surface-area",
  "caie-mathematics-0580-compound-measures": "compound-measures",
  "caie-mathematics-0580-pythagoras": "pythagoras",
  "caie-mathematics-0580-trigonometry": "trigonometry",
  "caie-mathematics-0580-transformations": "transformations",
  "caie-mathematics-0580-basic-probability": "basic-probability",
  "caie-mathematics-0580-set-notation-and-probability-diagrams": "set-notation-and-probability-diagrams",
  "caie-mathematics-0580-averages-and-range": "averages-and-range",
  "caie-mathematics-0580-statistical-diagrams": "statistical-diagrams",
  "caie-mathematics-0580-scatter-graphs-and-correlation": "scatter-graphs-and-correlation",
  "caie-mathematics-0580-algebraic-roots-and-indices": "algebraic-roots-and-indices",
};

const SLUG_TO_KEY: Record<string, string> = {
  "caie-mathematics-0580": "mathematics",
  "edexcel-mathematics-4ma1": "mathematics",
};

export function TopicSearchBox({ subjectKey, topicSlug }: { subjectKey: string; topicSlug: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const topics = useMemo(() => {
    // For math, use the full topic list
    if (subjectKey === "mathematics" || subjectKey === "maths") {
      return MATH_FULL_TOPICS;
    }
    return [];
  }, [subjectKey]);

  const subjectSlug = Object.entries(SLUG_TO_KEY).find(([, v]) => v === subjectKey)?.[0] || `caie-${subjectKey}-0620`;

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, topics]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  if (topics.length === 0) return null;

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (query) setOpen(true); }}
        placeholder="Search topics..."
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 w-48"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border rounded-lg shadow-lg w-64 max-h-64 overflow-y-auto">
          {filtered.map((t) => (
            <Link
              key={t.slug}
              href={`/subjects/${subjectSlug}/topics/${t.slug}?tab=structured`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-gray-50 text-gray-700 border-b border-gray-100 last:border-0"
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
