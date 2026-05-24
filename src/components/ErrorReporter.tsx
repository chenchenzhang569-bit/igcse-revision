"use client";

import { useEffect } from "react";

/**
 * Global error reporter — catches unhandled errors and
 * unhandled promise rejections, firing them to /api/errors/report.
 * Mount once in a layout — silent, fire-and-forget.
 */
export default function ErrorReporter() {
  useEffect(() => {
    const report = (payload: Record<string, unknown>) => {
      fetch("/api/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // totally silent — never break the page for a report
      });
    };

    const onError: OnErrorEventHandler = (event, source, lineno, colno, error) => {
      report({
        message: (error as Error)?.message || String(event),
        stack: (error as Error)?.stack || null,
        url: source ? String(source) + (lineno ? ":" + lineno : "") : location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      report({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || null,
        url: location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
