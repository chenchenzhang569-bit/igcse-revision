import { MetadataRoute } from "next";

const SITE_URL = "https://igmaster.org";

// 所有静态页面路由
const staticRoutes = [
  "",
  "/subjects",
  "/past-papers",
  "/mock-exams",
  "/pricing",
  "/checkout",
  "/disclaimer",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // 静态页面
  for (const route of staticRoutes) {
    entries.push({
      url: `${SITE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 1.0 : 0.8,
    });
  }

  // 从数据库获取所有科目
  try {
    const res = await fetch(
      "https://aondldqwwvttwpervrfq.supabase.co/rest/v1/subjects?select=slug,updated_at",
      {
        headers: {
          apikey:
            "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL",
        },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const subjects: { slug: string; updated_at?: string }[] =
        await res.json();
      for (const subj of subjects) {
        entries.push({
          url: `${SITE_URL}/subjects/${subj.slug}`,
          lastModified: subj.updated_at
            ? new Date(subj.updated_at)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.9,
        });
        // past papers for each subject
        entries.push({
          url: `${SITE_URL}/past-papers/${subj.slug}`,
          lastModified: subj.updated_at
            ? new Date(subj.updated_at)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
        // mock exams for each subject
        entries.push({
          url: `${SITE_URL}/mock-exams/${subj.slug}`,
          lastModified: subj.updated_at
            ? new Date(subj.updated_at)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (e) {
    console.error("Sitemap fetch subjects failed:", e);
  }

  return entries;
}
