import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

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
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  const userId = payload?.sub;
  if (!userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId.toString())
    .maybeSingle();
  return data?.role === "admin" ? admin : null;
}

// GET /api/admin/users/[id] — user detail (purchases, stats)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get purchases
  const { data: purchases, error } = await admin
    .from("purchases")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  // Filter: by default exclude pending, unless ?showAll=true
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("showAll") === "true";
  const filtered = showAll ? purchases : (purchases || []).filter((p) => p.status !== "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get subject names (with exam board + code)
  const subjectIds = [...new Set(purchases.filter((p) => p.subject_id).map((p) => p.subject_id))];
  const { data: subjects } = await admin
    .from("subjects")
    .select("id, display_name, code, exam_board_id")
    .in("id", subjectIds);

  const { data: examBoards } = await admin
    .from("exam_boards")
    .select("id, name");

  const boardMap: Record<string, string> = {};
  if (examBoards) {
    for (const b of examBoards) {
      boardMap[b.id] = b.name;
    }
  }

  const subjectMap: Record<string, string> = {};
  if (subjects) {
    for (const s of subjects) {
      const board = boardMap[s.exam_board_id] || "";
      const code = s.code ? ` · ${s.code}` : "";
      subjectMap[s.id] = `${board} ${s.display_name}${code}`;
    }
  }

  const enriched = (filtered || []).map((p) => ({
    ...p,
    subject_name: p.subject_id ? subjectMap[p.subject_id] || p.subject_id : "All Subjects",
  }));

  // Get user info from auth
  const { data: authUser } = await admin.auth.admin.getUserById(id);

  return NextResponse.json({
    user: authUser?.user
      ? {
          email: authUser.user.email,
          created_at: authUser.user.created_at,
          last_sign_in_at: authUser.user.last_sign_in_at,
          banned: authUser.user.banned_until
            ? new Date(authUser.user.banned_until) > new Date()
            : false,
        }
      : null,
    purchases: enriched,
    total: (purchases || []).length,
    filtered: (filtered || []).length,
  });
}

// PATCH /api/admin/users/[id] — update purchase
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { purchaseId, subject_id, amount_cny, expires_at, status } = body;

  if (!purchaseId) {
    return NextResponse.json({ error: "Missing purchaseId" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (subject_id !== undefined) update.subject_id = subject_id;
  if (amount_cny !== undefined) update.amount_cny = amount_cny;
  if (expires_at !== undefined) update.expires_at = expires_at;
  if (status !== undefined) update.status = status;

  const { error } = await admin
    .from("purchases")
    .update(update)
    .eq("id", purchaseId)
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// POST /api/admin/users/[id] — add purchase
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { subject_id, amount_cny, expires_at, status } = body;

  if (!subject_id || amount_cny === undefined) {
    return NextResponse.json({ error: "Missing subject_id or amount_cny" }, { status: 400 });
  }

  const { error } = await admin.from("purchases").insert({
    user_id: id,
    subject_id,
    amount_cny,
    expires_at: expires_at || null,
    status: status || "paid",
    paid_at: new Date().toISOString(),
    alipay_trade_no: `MANUAL_${Date.now()}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — delete purchase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const purchaseId = searchParams.get("purchaseId");

  if (!purchaseId) {
    return NextResponse.json({ error: "Missing purchaseId" }, { status: 400 });
  }

  const { error } = await admin
    .from("purchases")
    .delete()
    .eq("id", purchaseId)
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
