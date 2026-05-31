"use client";

import { useState } from "react";

type ViewMode = "card" | "table" | "pie" | "bar" | "line";

interface WidgetCardProps {
  title: string;
  defaultView?: ViewMode;
  views?: ViewMode[];
  hidden?: boolean;
  onToggle?: (hidden: boolean) => void;
  children: (view: ViewMode) => React.ReactNode;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  card: "📊", table: "📋", pie: "🥧", bar: "📊", line: "📈",
};

export default function WidgetCard({ title, defaultView = "card", views, hidden, onToggle, children }: WidgetCardProps) {
  const [view, setView] = useState<ViewMode>(defaultView);
  const available = views || [defaultView];

  if (hidden) return null;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center gap-1">
          {available.length > 1 && available.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-2 py-0.5 rounded transition ${view === v ? "bg-primary-100 text-primary-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}
              title={v}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
          {onToggle && (
            <button onClick={() => onToggle(true)} className="text-gray-400 hover:text-red-500 text-xs ml-1" title="Hide">✕</button>
          )}
        </div>
      </div>
      <div className="p-4">
        {children(view)}
      </div>
    </div>
  );
}
