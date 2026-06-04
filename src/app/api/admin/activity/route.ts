import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// GET /api/admin/activity — fetch activity logs with anomaly detection
export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hours = parseInt(searchParams.get("hours") || "24", 10);

  try {
    // 1. Recent activity list (last N hours)
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await admin
      .from("activity_logs")
      .select("id, user_id, activity_type, detail, page_url, created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(100);

    // 2. Download frequency (potential scraping)
    const { data: downloadCounts } = await admin
      .from("activity_logs")
      .select("user_id, activity_type")
      .eq("activity_type", "download:note")
      .gte("created_at", cutoff);

    // 3. View frequency
    const { data: viewCounts } = await admin
      .from("activity_logs")
      .select("user_id, activity_type")
      .like("activity_type", "view:%")
      .gte("created_at", cutoff);

    // Aggregate download counts
    const dlMap: Record<string, number> = {};
    for (const row of downloadCounts || []) {
      dlMap[row.user_id] = (dlMap[row.user_id] || 0) + 1;
    }

    // Aggregate view counts
    const viewMap: Record<string, number> = {};
    for (const row of viewCounts || []) {
      viewMap[row.user_id] = (viewMap[row.user_id] || 0) + 1;
    }

    // Find anomalies
    const anomalies: { user_id: string; type: string; count: number; reason: string }[] = [];
    for (const [uid, count] of Object.entries(dlMap)) {
      if (count >= 5) anomalies.push({ user_id: uid, type: "高频下载", count, reason: `${count}次下载` });
    }
    for (const [uid, count] of Object.entries(viewMap)) {
      if (count >= 30) anomalies.push({ user_id: uid, type: "高频浏览", count, reason: `${count}次浏览` });
    }

    // Activity summary
    const typeCounts: Record<string, number> = {};
    for (const row of recentLogs || []) {
      typeCounts[row.activity_type] = (typeCounts[row.activity_type] || 0) + 1;
    }

    // Fetch user emails for anomaly users
    const anomalyUids = [...new Set(anomalies.map(a => a.user_id))];
    let userMap: Record<string, string> = {};
    if (anomalyUids.length > 0) {
      const { data: users } = await admin.auth.admin.listUsers();
      if (users) {
        for (const u of users.users) {
          if (anomalyUids.includes(u.id)) {
            userMap[u.id] = u.email || u.id.slice(0, 8);
          }
        }
      }
    }

    return NextResponse.json({
      recent: recentLogs || [],
      summary: typeCounts,
      anomalies: anomalies.map(a => ({ ...a, email: userMap[a.user_id] || a.user_id.slice(0, 8) })),
      period: `${hours}h`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
