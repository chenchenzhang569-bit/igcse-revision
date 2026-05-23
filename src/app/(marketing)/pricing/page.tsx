"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const PRICE_PER_SUBJECT = 50;
const PRICE_ALL = 250;
const ORIGINAL_PER = 100;
const ORIGINAL_ALL = 500;

const plans = [
  {
    name: "Free Trial",
    price: "¥0",
    original: "",
    period: "7 days. One subject of your choice.",
    features: [
      "Full access to one subject",
      "Complete topic notes + questions",
      "Past papers with mark schemes",
      "Mock exam downloads",
      "No credit card required",
    ],
    cta: "Start Free Trial",
    type: "trial" as const,
    popular: false,
  },
  {
    name: "Single Subject",
    price: `¥${PRICE_PER_SUBJECT}`,
    original: `¥${ORIGINAL_PER}`,
    period: "One-time payment. Lifetime access.",
    features: [
      "Complete topic notes",
      "Practice questions with answers",
      "Past papers with mark schemes",
      "Mock exam downloads",
      "Free preview available",
    ],
    cta: "Choose Subject",
    type: "single" as const,
    popular: false,
  },
  {
    name: "All Subjects",
    price: `¥${PRICE_ALL}`,
    original: `¥${ORIGINAL_ALL}`,
    period: "All exam boards. All subjects. Lifetime access.",
    features: [
      "Every subject across all exam boards",
      "CAIE + Edexcel included",
      "Full notes + questions + past papers",
      "Mock exam downloads",
      "Free preview available",
    ],
    cta: "Get Everything",
    type: "all" as const,
    popular: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<{ id: string; display_name: string; slug: string; code: string; board_name: string }[]>([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"trial" | "single">("single");
  const [user, setUser] = useState<any>(null);
  const [hasTrial, setHasTrial] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then(setSubjects)
      .catch(() => {});

    // Check auth + trial status
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u);
      if (u) {
        fetch("/api/payment/trial/check")
          .then((r) => r.json())
          .then((d) => setHasTrial(d.hasTrial))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleCTA = (type: "trial" | "single" | "all") => {
    if (type === "all") {
      if (!user) { router.push("/login"); return; }
      router.push("/checkout?plan=all");
    } else if (type === "single") {
      if (!user) { router.push("/login"); return; }
      setPickerMode("single");
      setShowSubjectPicker(true);
    } else if (type === "trial") {
      if (!user) { router.push("/login"); return; }
      if (hasTrial) return;
      setPickerMode("trial");
      setShowSubjectPicker(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-500 text-lg">Try free for 7 days. Pay per subject. No subscriptions.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white border rounded-2xl p-6 ${
              plan.popular
                ? "border-primary-500 shadow-xl ring-2 ring-primary-100"
                : plan.type === "trial"
                ? "border-green-200 bg-green-50/50"
                : "hover:shadow-lg transition"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                Best Value
              </span>
            )}
            {plan.type === "trial" && !plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                New User
              </span>
            )}
            <h3 className="text-lg font-bold text-primary-900 mb-1">{plan.name}</h3>
            <p className="text-xs text-gray-400 mb-4 min-h-[32px]">{plan.period}</p>
            <div className="flex items-baseline gap-2 mb-6">
              <span className={`text-3xl font-bold ${plan.type === "trial" ? "text-green-600" : "text-accent-500"}`}>
                {plan.price}
              </span>
              {plan.original && (
                <span className="text-base text-gray-400 line-through">{plan.original}</span>
              )}
            </div>
            <ul className="space-y-2 mb-8 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-gray-600">
                  <span className={`mt-0.5 shrink-0 ${plan.type === "trial" ? "text-green-500" : "text-accent-500"}`}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCTA(plan.type)}
              disabled={plan.type === "trial" && hasTrial}
              className={`block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition ${
                plan.popular
                  ? "bg-accent-500 text-white hover:bg-accent-600"
                  : plan.type === "trial"
                  ? hasTrial
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {plan.type === "trial" && hasTrial ? "Trial Used" : plan.cta} →
            </button>
          </div>
        ))}
      </div>

      {/* Subject Picker Modal */}
      {showSubjectPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-primary-900 mb-2">
              {pickerMode === "trial" ? "🎁 Choose Your Free Subject" : "Choose a Subject"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {pickerMode === "trial"
                ? "7-day full access to one subject. No credit card needed."
                : `Pay once — ¥${PRICE_PER_SUBJECT}. Lifetime access.`}
            </p>
            <div className="max-h-96 overflow-y-auto">
              {(() => {
                // Group subjects by exam board
                const boards = new Map<string, typeof subjects>();
                subjects.forEach((s) => {
                  const key = s.board_name || "Other";
                  if (!boards.has(key)) boards.set(key, []);
                  boards.get(key)!.push(s);
                });
                const formattedLabel = (s: typeof subjects[0]) =>
                  `${s.display_name} ${s.code || ""}`.trim();

                return Array.from(boards.entries()).map(([board, items]) => (
                  <div key={board} className="mb-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
                      {board}
                    </div>
                    <div className="space-y-1">
                      {items.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setShowSubjectPicker(false);
                            if (pickerMode === "trial") {
                              router.push(`/checkout?subject=${s.id}&trial=true`);
                            } else {
                              router.push(`/checkout?subject=${s.id}`);
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg border hover:border-primary-500 hover:bg-primary-50 transition flex justify-between items-center"
                        >
                          <span className="text-sm font-medium text-gray-800">{formattedLabel(s)}</span>
                          <span className={`text-xs font-semibold ml-2 shrink-0 ${pickerMode === "trial" ? "text-green-600" : "text-accent-500"}`}>
                            {pickerMode === "trial" ? "Free" : `¥${PRICE_PER_SUBJECT}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
              {subjects.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Loading subjects...</p>
              )}
            </div>
            <button
              onClick={() => setShowSubjectPicker(false)}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-16 pt-12 border-t">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">Questions?</h3>
        <p className="text-gray-500">
          Preview content for free on every subject before you buy.
        </p>
      </div>
    </div>
  );
}
