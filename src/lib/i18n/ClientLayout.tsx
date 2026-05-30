"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import type { ReactNode } from "react";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
