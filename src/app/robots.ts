import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/auth/",
        "/dashboard/",
        "/api/",
        "/_next/",
        "/banned",
      ],
    },
    sitemap: "https://igmaster.org/sitemap.xml",
  };
}
