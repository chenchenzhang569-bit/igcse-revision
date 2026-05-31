import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch { return null; }
}

// GET /api/admin/login-events?days=30
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", payload.sub)
    .maybeSingle();
  if (role?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const { data: events } = await admin
    .from("login_events")
    .select("user_id, logged_at")
    .gte("logged_at", since.toISOString())
    .order("logged_at");

  // Group by day
  const dayMap: Record<string, Set<string>> = {};
  if (events) {
    for (const e of events) {
      const day = e.logged_at.slice(0, 10); // YYYY-MM-DD
      if (!dayMap[day]) dayMap[day] = new Set();
      dayMap[day].add(e.user_id);
    }
  }

  // Fill all days
  const result: { date: string; dau: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, dau: dayMap[key]?.size || 0 });
  }

  return NextResponse.json(result);
}
