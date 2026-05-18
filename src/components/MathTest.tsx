"use client";

export function MathTest({ text }: { text: string }) {
  // Simple renderMath inline
  try {
    const katex = (globalThis as any).katex;
    if (katex) {
      const html = text.replace(/\$(.+?)\$/g, (_: string, m: string) => {
        try { return katex.renderToString(m, { throwOnError: false }); } catch { return m; }
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }
  } catch {}
  return <span>{text}</span>;
}
