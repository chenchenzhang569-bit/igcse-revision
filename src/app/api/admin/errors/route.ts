import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

// GET /api/admin/errors — Admin only (service_role bypasses RLS)
export async function GET(request: NextRequest) {
  const admin = createAdminClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  let query = admin
    .from("error_reports")
    .select("id, user_email, url, message, stack, user_agent, status, created_at, resolved_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Admin errors fetch failed:", error);
    return NextResponse.json({ errors: [], total: 0 }, { status: 500 });
  }

  return NextResponse.json({
    errors: data || [],
    total: count || 0,
    page,
    limit,
  });
}

// PATCH /api/admin/errors — Update error status
export async function PATCH(request: NextRequest) {
  const admin = createAdminClient();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "缺少 id 或 status" }, { status: 400 });
  }

  if (!["new", "in_progress", "resolved"].includes(status)) {
    return NextResponse.json({ error: "无效状态" }, { status: 400 });
  }

  const update: Record<string, any> = { status };
  if (status === "resolved") {
    update.resolved_at = new Date().toISOString();
  }

  const { error } = await admin.from("error_reports").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
