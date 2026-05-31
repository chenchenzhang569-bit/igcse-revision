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
  widgetId?: string; // for storing per-widget settings
}

const VIEW_LABELS: Record<ViewMode, string> = {
  card: "🔢", table: "📋", pie: "🥧", bar: "📊", line: "📈",
};

const ALL_VIEW_MODES: ViewMode[] = ["card", "table", "pie", "bar", "line"];

function loadSettings(widgetId: string): { defaultView: ViewMode; views: ViewMode[] } | null {
  try {
    const raw = localStorage.getItem(`widget_settings_${widgetId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSettings(widgetId: string, settings: { defaultView: ViewMode; views: ViewMode[] }) {
  localStorage.setItem(`widget_settings_${widgetId}`, JSON.stringify(settings));
}

export default function WidgetCard({
  title, defaultView: _default, views: _views, hidden, onToggle, children, widgetId,
}: WidgetCardProps) {
  const saved = widgetId ? loadSettings(widgetId) : null;
  const fallbackViews = _views || [_default || "card"];
  const [available, setAvailable] = useState<ViewMode[]>(saved?.views || fallbackViews);
  const [view, setView] = useState<ViewMode>(saved?.defaultView || _default || "card");
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = (dv: ViewMode, av: ViewMode[]) => {
    setView(dv);
    setAvailable(av);
    if (widgetId) saveSettings(widgetId, { defaultView: dv, views: av });
    setShowSettings(false);
  };

  const resetSettings = () => {
    const dv = _default || "card";
    const av = _views || [dv];
    setView(dv);
    setAvailable(av);
    if (widgetId) localStorage.removeItem(`widget_settings_${widgetId}`);
    setShowSettings(false);
  };

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
          {widgetId && (
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)}
                className={`text-xs px-1 py-0.5 rounded ${saved ? "text-primary-500" : "text-gray-400 hover:text-gray-600"}`}
                title="自定义视图">⚙</button>
              {showSettings && (
                <div className="absolute right-0 top-7 z-20 bg-white border rounded-lg shadow-lg p-3 w-48">
                  <p className="text-xs font-semibold text-gray-600 mb-2">默认视图</p>
                  <div className="flex gap-1 mb-3">
                    {ALL_VIEW_MODES.map((m) => (
                      <button key={m} onClick={() => { view !== m && setView(m); }}
                        className={`text-xs px-2 py-1 rounded ${view === m ? "bg-primary-100 text-primary-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
                        {VIEW_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">显示模式</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ALL_VIEW_MODES.map((m) => (
                      <label key={m} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={available.includes(m)}
                          onChange={() => {
                            if (available.includes(m)) setAvailable(available.filter(v => v !== m));
                            else setAvailable([...available, m]);
                          }}
                          className="w-3 h-3" />
                        {VIEW_LABELS[m]}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateSettings(view, available)}
                      className="text-xs px-3 py-1 bg-primary-900 text-white rounded">保存</button>
                    <button onClick={resetSettings}
                      className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600">重置</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
