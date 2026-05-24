"use client";

import { useState } from "react";

export interface BugContext {
  board: string;
  subject: string;
  code: string;
  subtopic?: string;
  set?: string;
  paper?: string;
  questionNo?: string;
  questionType?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: BugContext;
}

const ERROR_TYPES = ["Wrong Question", "Wrong Answer", "Wrong Grading", "Missing Diagram", "Other"] as const;

function buildContextLabel(c: BugContext): string {
  const parts = [`${c.board} ${c.subject} ${c.code}`];
  if (c.set) {
    parts.push(`Mock Exam · ${c.set}`);
    if (c.paper) parts.push(c.paper);
  } else if (c.subtopic) {
    parts.push(c.subtopic);
  }
  if (c.questionNo) {
    const suffix = c.questionType ? ` (${c.questionType})` : "";
    parts.push(c.questionNo + suffix);
  }
  return parts.join(" · ");
}

export default function ReportBugModal({ open, onClose, context }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const toggle = (t: string) => {
    const next = new Set(selected);
    next.has(t) ? next.delete(t) : next.add(t);
    setSelected(next);
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setStatus("sending");
    const types = Array.from(selected).join(", ");
    const desc = description.trim() ? ` | ${description.trim()}` : "";
    const contextLabel = buildContextLabel(context);
    const message = `[${contextLabel}] ${types}${desc}`;

    try {
      const res = await fetch("/api/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, url: location.pathname, userAgent: navigator.userAgent }),
      });
      if (res.ok) {
        setStatus("done");
        setTimeout(() => {
          onClose();
          setSelected(new Set());
          setDescription("");
          setStatus("idle");
        }, 1500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-primary-900 mb-3">🐛 Report Issue</h3>

        {/* Context — read-only */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4">
          {buildContextLabel(context)}
        </div>

        {/* Error types */}
        <p className="text-xs font-semibold text-gray-600 mb-2">Type (required)</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {ERROR_TYPES.map((t) => {
            const isSelected = selected.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  isSelected
                    ? "bg-accent-500 text-white border-accent-500"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-xs font-semibold text-gray-600 mb-1">Note (optional)</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any extra detail..."
          className="w-full h-20 border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary-500 mb-4"
        />

        {/* Status */}
        {status === "error" && (
          <p className="text-red-500 text-xs mb-3">Failed to send. Please try again.</p>
        )}
        {status === "done" && (
          <p className="text-emerald-600 text-xs mb-3 font-semibold">✅ Submitted — thank you!</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || status === "sending" || status === "done"}
            className="flex-1 py-2.5 rounded-xl bg-accent-500 text-white font-semibold text-sm hover:bg-accent-600 disabled:opacity-50 transition"
          >
            {status === "sending" ? "Sending..." : status === "done" ? "✅ Done" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
