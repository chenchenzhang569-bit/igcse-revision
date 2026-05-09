"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
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
        setError(data.error || "登录失败，请重试");
        setLoading(false);
        return;
      }

      // Cookie 已由服务端 API 设置，直接跳转
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        setError("网络连接超时，请检查网络后重试");
      } else {
        setError("网络错误，请检查连接后重试");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600">
            🎓 IGCSE Revision
          </Link>
          <p className="text-gray-500 mt-2">登录你的账户</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-xl shadow-sm border space-y-5"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {loading ? "登录中..." : "登录"}
          </button>

          <p className="text-center text-sm text-gray-500">
            还没有账户？{" "}
            <Link href="/register" className="text-primary-600 hover:underline">
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
