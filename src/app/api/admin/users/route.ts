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
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "admin" ? admin : null;
}

// GET /api/admin/users?page=1&search=xxx
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get users from Supabase Auth
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({
    page: page,
    perPage: limit,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const userIds = authUsers.users.map((u) => u.id);

  // Get purchases for these users
  const { data: purchases } = await admin
    .from("purchases")
    .select("user_id, subject_id, amount_cny, status, expires_at")
    .in("user_id", userIds);

  // Group purchases by user
  const purchasesByUser: Record<string, any[]> = {};
  if (purchases) {
    for (const p of purchases) {
      if (!purchasesByUser[p.user_id]) purchasesByUser[p.user_id] = [];
      purchasesByUser[p.user_id].push(p);
    }
  }

  // Get all subjects for lookup
  const { data: subjects } = await admin
    .from("subjects")
    .select("id, display_name");

  const subjectMap: Record<string, string> = {};
  if (subjects) {
    for (const s of subjects) {
      subjectMap[s.id] = s.display_name;
    }
  }

  const users = authUsers.users.map((u) => {
    const userPurchases = purchasesByUser[u.id] || [];
    const paidSubjects = userPurchases.filter((p) => p.status === "paid");
    const totalPaid = paidSubjects.reduce((sum: number, p: any) => sum + (p.amount_cny || 0), 0);

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
      paid_subjects: paidSubjects.map((p: any) => ({
        id: p.subject_id,
        name: subjectMap[p.subject_id] || p.subject_id,
        expires_at: p.expires_at,
      })),
      total_paid: totalPaid,
      purchase_count: paidSubjects.length,
    };
  });

  return NextResponse.json({
    users,
    total: authUsers.total || 0,
    page,
    limit,
  });
}

// PATCH /api/admin/users — ban/unban
export async function PATCH(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ban } = body;

  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  if (ban) {
    // Ban: set banned_until to far future
    await admin.auth.admin.updateUserById(id, {
      ban_duration: "876600h", // ~100 years
    });
  } else {
    // Unban
    await admin.auth.admin.updateUserById(id, {
      ban_duration: "0h",
    });
  }

  return NextResponse.json({ success: true });
}
