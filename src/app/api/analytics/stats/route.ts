import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getAnalyticsData, cleanupOldSessions } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch {
    return null;
  }
}

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  if (!payload?.sub) return false;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", payload.sub)
    .maybeSingle();
  return data?.role === "admin";
}

export async function GET(request: NextRequest) {
  const isAdmin = await checkAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clean up stale sessions on read
  await cleanupOldSessions();

  const data = await getAnalyticsData();

  if (!data) {
    return NextResponse.json({
      total_pv: 0,
      total_visitors: 0,
      daily: {},
      devices: {},
      browsers: {},
      os: {},
      pages: {},
      sources: {},
    });
  }

  // Compute derived stats
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = data.daily[today] || { pv: 0, visitors: 0, bounces: 0, sessions: 0, total_time: 0 };
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekKey = weekAgo.toISOString().slice(0, 10);

  let weekPv = 0,
    weekVisitors = 0,
    weekBounces = 0;
  for (const [day, stats] of Object.entries(data.daily)) {
    if (day >= weekKey) {
      weekPv += stats.pv;
      weekVisitors += stats.visitors;
      weekBounces += stats.bounces;
    }
  }

  return NextResponse.json({
    ...data,
    today_pv: todayStats.pv,
    today_visitors: todayStats.visitors,
    week_pv: weekPv,
    week_visitors: weekVisitors,
    bounce_rate: todayStats.pv > 0
      ? Math.round((todayStats.bounces / todayStats.pv) * 100)
      : 0,
  });
}
