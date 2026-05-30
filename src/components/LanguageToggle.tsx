"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition hover:bg-gray-100"
      title={lang === "zh" ? "Switch to English" : "切换到中文"}
    >
      <span className={lang === "zh" ? "text-primary-600 font-bold" : "text-gray-400"}>
        中
      </span>
      <span className="text-gray-300">|</span>
      <span className={lang === "en" ? "text-primary-600 font-bold" : "text-gray-400"}>
        EN
      </span>
    </button>
  );
}
