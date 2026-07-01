"use client";

import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
  canonical?: string;
}

export function PageMeta({ title, description, canonical }: PageMetaProps) {
  useEffect(() => {
    // 设置页面标题
    const fullTitle = `${title} | IGMaster`;
    document.title = fullTitle;

    // 更新 meta description
    let metaDesc = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // 更新 OG title/description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", fullTitle);
    if (description) {
      const ogDesc = document.querySelector(
        'meta[property="og:description"]'
      );
      if (ogDesc) ogDesc.setAttribute("content", description);
    }

    // 设置 canonical URL
    let link = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    return () => {
      // 不需要清理，页面卸载自然恢复
    };
  }, [title, description, canonical]);

  return null;
}
