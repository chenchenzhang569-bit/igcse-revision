"use client";

import { useState } from "react";

export default function SubmitErrorsPage() {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[${subject||"General"}] ${topic ? topic+": " : ""}${description}`,
          url: location.pathname,
          userAgent: navigator.userAgent,
        }),
      });
      if (res.ok) {
        setStatus("done");
        setSubject(""); setTopic(""); setDescription("");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">Submit Errors</h1>
        <p className="text-gray-500">
          Found a mistake? Let us know and we&apos;ll fix it ASAP.
        </p>
      </div>

      {status === "done" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="text-emerald-700 font-semibold mt-3">Report submitted — thank you!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            >
              <option value="">— Select —</option>
              <option>Physics</option>
              <option>Chemistry</option>
              <option>Biology</option>
              <option>Mathematics</option>
              <option>Economics</option>
              <option>Computer Science</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Topic / Page</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="e.g. Physics 1.1 — Forces"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="Describe what&apos;s wrong..."
            />
          </div>

          {status === "error" && (
            <p className="text-red-500 text-sm">Failed to send. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={status === "sending" || !description.trim()}
            className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {status === "sending" ? "Sending..." : "Submit Report"}
          </button>
        </form>
      )}
    </div>
  );
}
