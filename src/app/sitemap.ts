import { MetadataRoute } from "next";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjQzODEsImV4cCI6MjA5Mzg0MDM4MX0.JEJv06MM1R20MfQ3AhSwrCR9r6WBKKUPvRGC6Y0TDWY";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://igmaster.org";

  const entries: MetadataRoute.Sitemap = [
    { url: base, priority: 1.0, changeFrequency: "weekly" },
    { url: `${base}/register`, priority: 0.8 },
    { url: `${base}/login`, priority: 0.7 },
    { url: `${base}/pricing`, priority: 0.8 },
    { url: `${base}/past-papers`, priority: 0.7 },
    { url: `${base}/mock-exams`, priority: 0.7 },
    { url: `${base}/subjects`, priority: 0.9 },
  ];

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subjects?select=slug&is_published=eq.true`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const subjects = await res.json();
      for (const s of subjects) {
        entries.push({ url: `${base}/subjects/${s.slug}`, priority: 0.8, changeFrequency: "weekly" });
      }
    }
  } catch {}

  return entries;
}
