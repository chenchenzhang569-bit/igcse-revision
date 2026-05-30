"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, en } from "./translations";

type Lang = "zh" | "en";

const dicts: Record<Lang, Record<string, Record<string, string>>> = {
  zh: translations,
  en,
};

const LanguageContext = createContext<{
  lang: Lang;
  t: (section: string, key: string) => string;
  toggleLang: () => void;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "zh" || saved === "en") setLang(saved);
  }, []);

  const toggleLang = () => {
    const next = lang === "zh" ? "en" : "zh";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const t = (section: string, key: string): string => {
    return dicts[lang]?.[section]?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  const { t } = useLanguage();
  return t;
}
