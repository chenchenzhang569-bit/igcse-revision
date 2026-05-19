"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import katex from "katex";
import "katex/dist/katex.min.css";
import { fixMathNotation } from "@/lib/math";

const markdownComponents = {
  img: (props: any) => (
    <img {...props} style={{ maxWidth: "100%", height: "auto" }} />
  ),
};

/**
 * Render mixed content: markdown + KaTeX math.
 * Splits text into math ($...$, $$...$$) and non-math segments.
 * Math segments are rendered via dangerouslySetInnerHTML (KaTeX).
 * Non-math segments are rendered via ReactMarkdown.
 */
export function MixedContent({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    const result: { type: "md" | "math"; content: string; display?: boolean }[] = [];
    const fixedText = fixMathNotation(text);

    const regex = /\$\$\s*([\s\S]*?)\s*\$\$|\$([^$\n]+?)\$/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(fixedText)) !== null) {
      if (m.index > lastIdx) {
        result.push({ type: "md", content: fixedText.slice(lastIdx, m.index) });
      }
      const isDisplay = !!m[1];
      const mathContent = (m[1] || m[2]).trim();
      // Skip pure currency amounts like $15.95, $26
      if (!isDisplay && /^\d[\d,.\s]*\.?\s*$/.test(mathContent)) {
        result.push({ type: "md", content: m[0] });
      } else {
        try {
          const html = katex.renderToString(mathContent, { displayMode: isDisplay, throwOnError: false });
          result.push({ type: "math", content: html, display: isDisplay });
        } catch {
          result.push({ type: "md", content: m[0] });
        }
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < fixedText.length) {
      result.push({ type: "md", content: fixedText.slice(lastIdx) });
    }
    return result;
  }, [text]);

  const cls = className || "";

  return (
    <div className={cls}>
      {parts.map((part, i) =>
        part.type === "math" ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: part.content }} />
        ) : (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={(url) => url} components={markdownComponents}>
            {part.content}
          </ReactMarkdown>
        )
      )}
    </div>
  );
}
