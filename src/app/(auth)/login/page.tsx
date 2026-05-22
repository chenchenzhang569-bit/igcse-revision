// force-redeploy-v33-callback-hash
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase-client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      window.location.href = "/dashboard";
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
    <form
      onSubmit={handleLogin}
      className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-5"
    >
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
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
        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
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
            if (!email) {
              setError("Enter your email first");
              return;
            }
            setLoading(true);
            try {
              const supabase = getSupabaseClient();
              const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
              });
              if (resetErr) {
                alert(resetErr.message);
              } else {
                setError("");
                alert("Reset link sent! Check your email (including spam folder).");
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
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center space-y-4">
        <p className="text-5xl">✅</p>
        <h2 className="text-xl font-bold text-gray-900">Password updated!</h2>
        <p className="text-gray-500">Your password has been changed successfully.</p>
        <Link
          href="/login"
          className="inline-block bg-accent-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-accent-600 transition"
        >
          Sign In →
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-5"
    >
      <h2 className="text-lg font-bold text-gray-900 text-center">Set New Password</h2>
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          placeholder="At least 6 characters"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent-500 text-white py-2.5 rounded-lg font-semibold hover:bg-accent-600 disabled:opacity-50 transition"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const isReset = searchParams.get("reset") === "true";

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
          <p className="text-gray-500">
            {isReset ? "Set a new password for your account" : "Sign in to your account"}
          </p>
        </div>

        {isReset ? <ResetPasswordForm /> : <LoginForm />}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
