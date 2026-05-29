"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import katex from "katex";
import "katex/dist/katex.min.css";
import { fixMathNotation } from "@/lib/math";

const markdownComponents = {
  img: (props: any) => {
    const src = props.src || "";
    // WeChat/Weixin browser does not render SVG text when loaded via <img>,
    // so we inline SVG data URIs using dangerouslySetInnerHTML.
    if (src.startsWith("data:image/svg+xml")) {
      let svg = "";
      if (src.includes(";base64,")) {
        try {
          svg = atob(src.split(";base64,")[1]);
        } catch { /* fall through to <img> */ }
      } else {
        svg = decodeURIComponent(src.slice(src.indexOf(",") + 1));
      }
      if (svg) {
        return (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ maxWidth: "100%", overflow: "hidden" }}
          />
        );
      }
    }
    return <img {...props} style={{ maxWidth: "100%", height: "auto" }} />;
  },
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

    // Skip $ followed by ), digit, space, or preceded by ( — these are currency ($20, ($), $ billion), not math
    const regex = /\$\$\s*([\s\S]*?)\s*\$\$|(?<![(\d])\$(?![)\d\s])[^$\n]+\$/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(fixedText)) !== null) {
      if (m.index > lastIdx) {
        result.push({ type: "md", content: fixedText.slice(lastIdx, m.index) });
      }
      const isDisplay = !!m[1];
      const mathContent = (m[1] || m[2]).trim();
      try {
        const html = katex.renderToString(mathContent, { displayMode: isDisplay, throwOnError: false });
        result.push({ type: "math", content: html, display: isDisplay });
      } catch {
        result.push({ type: "md", content: m[0] });
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
