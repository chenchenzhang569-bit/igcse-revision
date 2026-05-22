// force-redeploy-v31
"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import Image from "next/image";
import Link from "next/link";

export default function UpdatePasswordPage() {
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
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-5xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h1>
          <p className="text-gray-500 mb-6">Your password has been changed successfully.</p>
          <Link
            href="/login"
            className="inline-block bg-accent-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-accent-600 transition"
          >
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Image
              src="/logo.png"
              alt="IGMaster"
              width={160}
              height={67}
              className="h-14 w-auto mx-auto"
            />
          </Link>
          <p className="text-gray-500">Set a new password</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-5"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              New Password
            </label>
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
      </div>
    </div>
  );
}
