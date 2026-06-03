import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch { return null; }
}

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  if (!payload?.sub) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", payload.sub)
    .maybeSingle();
  return data?.role === "admin" ? admin : null;
}

// GET /api/admin/analytics — return aggregated analytics_views data
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7", 10);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  try {
    // 1. Total pageviews in period
    const { data: totalRows } = await admin
      .from("analytics_views")
      .select("count")
      .gte("date", sinceStr);

    const totalViews = (totalRows || []).reduce((sum: number, r: any) => sum + (r.count || 0), 0);

    // 2. By tab (notes/mcq/structured/past-papers/mock-exams)
    const { data: byTab } = await admin
      .from("analytics_views")
      .select("tab, count")
      .gte("date", sinceStr)
      .not("tab", "is", null);

    const tabAgg: Record<string, number> = {};
    for (const r of byTab || []) {
      const t = r.tab || "other";
      tabAgg[t] = (tabAgg[t] || 0) + (r.count || 0);
    }

    // 3. By path (top 20)
    const { data: byPath } = await admin
      .from("analytics_views")
      .select("path, count")
      .gte("date", sinceStr)
      .order("count", { ascending: false })
      .limit(20);

    const pathAgg: Record<string, number> = {};
    for (const r of byPath || []) {
      pathAgg[r.path] = (pathAgg[r.path] || 0) + (r.count || 0);
    }

    // 4. Daily trend
    const { data: daily } = await admin
      .from("analytics_views")
      .select("date, count")
      .gte("date", sinceStr)
      .order("date", { ascending: true });

    const dailyAgg: Record<string, number> = {};
    for (const r of daily || []) {
      const d = r.date;
      dailyAgg[d] = (dailyAgg[d] || 0) + (r.count || 0);
    }

    return NextResponse.json({
      total_views: totalViews,
      by_tab: Object.entries(tabAgg)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      by_path: Object.entries(pathAgg)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      daily_trend: Object.entries(dailyAgg)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    console.error("Analytics API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
