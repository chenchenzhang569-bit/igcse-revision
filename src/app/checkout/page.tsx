"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subject");
  const plan = searchParams.get("plan");
  const isTrial = searchParams.get("trial") === "true";

  const [subject, setSubject] = useState<{ id: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const PRICE = 50; // ¥50 per subject
  const PRICE_ALL = 250;

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login?redirect=checkout");
        return;
      }
      setUser(data.session.user);
    });
  }, []);

  useEffect(() => {
    if (!subjectId || !user) return;
    fetch(`/api/subjects?id=${subjectId}`)
      .then((r) => r.json())
      .then((data) => {
        // The API returns an array, find the one
        const s = Array.isArray(data) ? data.find((x: any) => x.id === subjectId) : data;
        setSubject(s || null);
      })
      .catch(() => setError("Failed to load subject"));
  }, [subjectId, user]);

  const handlePay = async () => {
    if (!subjectId && plan !== "all") return;
    setStatus("submitting");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // Create order and get Alipay form
      const body = plan === "all"
        ? { plan: "all" }
        : { subjectId };

      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment failed");
        setStatus("error");
        return;
      }

      // Redirect to Alipay
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || "Network error");
      setStatus("error");
    }
  };

  const handleTrial = async () => {
    if (!subjectId) return;
    setStatus("submitting");

    try {
      const res = await fetch("/api/payment/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });

      if (!res.ok) {
        let errText = "Trial failed";
        try {
          const err = await res.json();
          errText = err.error || "Trial failed";
        } catch {
          const text = await res.clone().text();
          errText = text.slice(0, 200) || `HTTP ${res.status}`;
        }
        setError(errText);
        setStatus("error");
        return;
      }

      const data = await res.json();
      router.push(`/dashboard?trial=started&subject=${encodeURIComponent(data.subject)}`);
    } catch (e: any) {
      setError(e.message || "Network error");
      setStatus("error");
    }
  };

  // Loading state
  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Redirecting to login...</p>
    </div>;
  }

  // All-subjects plan
  if (plan === "all") {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-primary-900 mb-2">All Subjects</h1>
          <p className="text-gray-500 mb-8">CAIE + Edexcel — every subject, lifetime access</p>
          <div className="text-4xl font-bold text-accent-500 mb-2">¥{PRICE_ALL}</div>
          <p className="text-sm text-gray-400 line-through mb-8">¥500</p>

          {status === "error" && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            onClick={handlePay}
            disabled={status === "submitting"}
            className="w-full py-3 rounded-xl bg-accent-500 text-white font-semibold hover:bg-accent-600 disabled:opacity-50 transition"
          >
            {status === "submitting" ? "Creating order..." : "Pay with Alipay"}
          </button>
          <button
            onClick={() => router.back()}
            className="mt-3 w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Single subject or trial
  if (!subject) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading subject...</p>
    </div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-primary-900 mb-1">
          {isTrial ? "🎁 Free Trial" : "Checkout"}
        </h1>
        <p className="text-gray-500 mb-6">{subject.display_name}</p>

        {isTrial ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-700 text-sm font-medium mb-1">7-Day Free Trial</p>
              <p className="text-green-600 text-xs">
                Full access to {subject.display_name} for 7 days. No credit card required.
              </p>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2 text-center">¥0</div>
          </>
        ) : (
          <>
            <div className="text-4xl font-bold text-accent-500 mb-2 text-center">¥{PRICE}</div>
            <p className="text-sm text-gray-400 line-through text-center mb-2">¥100</p>
          </>
        )}

        <p className="text-sm text-gray-500 text-center mb-8">
          {isTrial ? "Expires in 7 days" : "One-time payment. Lifetime access."}
        </p>

        {status === "error" && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={isTrial ? handleTrial : handlePay}
          disabled={status === "submitting"}
          className={`w-full py-3 rounded-xl text-white font-semibold transition disabled:opacity-50 ${
            isTrial
              ? "bg-green-500 hover:bg-green-600"
              : "bg-accent-500 hover:bg-accent-600"
          }`}
        >
          {status === "submitting"
            ? "Processing..."
            : isTrial
            ? "Start Free Trial"
            : "Pay with Alipay"}
        </button>

        <button
          onClick={() => router.back()}
          className="mt-3 w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
