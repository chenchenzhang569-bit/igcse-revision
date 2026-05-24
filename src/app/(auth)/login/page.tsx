// force-redeploy-v42-auth-fix-2026
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get redirect param
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const redirectTo = searchParams?.get("redirect") || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      window.location.replace(redirectTo);
    } catch (err: any) {
      setError(
        err.name === "TimeoutError" || err.name === "AbortError"
          ? "Network timeout. Please check your connection."
          : "Network error. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Image
              src="/logo.png"
              alt="IGMaster"
              width={240}
              height={100}
              className="h-20 w-auto mx-auto"
            />
          </Link>
          <p className="text-gray-500">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-5"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={async () => {
                if (!email) { setError("Enter your email first"); return; }
                setLoading(true);
                try {
                  const supabase = getSupabaseClient();
                  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
                    email,
                    { redirectTo: `${window.location.origin}/auth/callback` }
                  );
                  if (resetErr) {
                    alert(resetErr.message);
                  } else {
                    setError("");
                    alert("Reset link sent! Check your email.");
                  }
                } catch {
                  alert("Failed to send reset email");
                }
                setLoading(false);
              }}
              className="text-sm text-primary-600 hover:underline mt-2 inline-block font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-500 text-white py-2.5 rounded-lg font-semibold hover:bg-accent-600 disabled:opacity-50 transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary-600 hover:underline font-semibold">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
// trigger
