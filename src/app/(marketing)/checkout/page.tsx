"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan"); // "all"
  const subjectId = params.get("subject");
  const isTrial = params.get("trial") === "true";

  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (plan === "all") {
      setSubjectName("All Subjects (CAIE + Edexcel)");
    } else if (subjectId) {
      fetch("/api/subjects")
        .then((r) => r.json())
        .then((subs: any[]) => {
          const s = subs.find((x: any) => x.id === subjectId);
          setSubjectName(s?.display_name || subjectId);
        })
        .catch(() => setSubjectName(subjectId));
    } else {
      router.push("/pricing");
    }
  }, [plan, subjectId]);

  const price = plan === "all" ? 250 : 50;
  const original = plan === "all" ? 500 : 100;
  const label = isTrial ? "7-Day Free Trial" : plan === "all" ? "All Subjects Bundle" : subjectName;

  const handlePay = async () => {
    if (isTrial) {
      // Start trial
      setLoading(true);
      setError("");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/payment/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.error) {
        setError(data.error);
      } else {
        router.push(`/dashboard?trial=started`);
      }
    } else {
      // Pay with Alipay
      setLoading(true);
      setError("");

      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: plan === "all" ? undefined : subjectId, plan }),
      });
      const html = await res.text();

      if (res.status !== 200 || html.startsWith("{")) {
        try {
          const err = JSON.parse(html);
          setError(err.error || "Payment failed");
        } catch {
          setError("Payment failed");
        }
        setLoading(false);
        return;
      }

      // Write Alipay form to document and submit
      document.open();
      document.write(html);
      document.close();
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-white border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-900 mb-6">Checkout</h1>

        <div className="border rounded-xl p-4 mb-6 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">
              {isTrial ? "🎁 7-Day Free Trial" : "Order Summary"}
            </span>
          </div>
          <p className="font-semibold text-gray-800">{label}</p>
          {!isTrial && (
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-accent-500">¥{price}</span>
              <span className="text-sm text-gray-400 line-through">¥{original}</span>
            </div>
          )}
          {isTrial && (
            <p className="text-green-600 font-bold text-lg mt-2">Free — No payment needed</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {isTrial ? (
          <div className="text-xs text-gray-400 mb-4">
            <p>• Full access to all content for 7 days</p>
            <p>• No credit card required</p>
            <p>• One trial per account</p>
          </div>
        ) : (
          <div className="text-xs text-gray-400 mb-4">
            <p>• One-time payment, lifetime access</p>
            <p>• Secure payment via Alipay</p>
            {plan === "all" && <p>• Save ¥250 vs buying separately</p>}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-white transition ${
            isTrial
              ? "bg-green-500 hover:bg-green-600"
              : "bg-accent-500 hover:bg-accent-600"
          } disabled:opacity-50`}
        >
          {loading ? "Processing..." : isTrial ? "🎁 Start Free Trial" : `Pay ¥${price} with Alipay`}
        </button>

        <button
          onClick={() => router.push("/pricing")}
          className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to Pricing
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-400">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
