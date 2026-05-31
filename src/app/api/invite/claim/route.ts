import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// POST /api/invite/claim — claim reward (free 1 subject for 1 year)
export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Service-key client for profile/purchase queries
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );

  // Get profile
  const { data: profile } = await admin
    .from("profiles")
    .select("invite_count, reward_claimed, reward_subject")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Re-count paid invites
  const { data: invited } = await admin
    .from("profiles")
    .select("id")
    .eq("invited_by", user.id);

  let paidCount = 0;
  if (invited && invited.length > 0) {
    const invitedIds = invited.map((p: any) => p.id);
    const { data: purchases } = await admin
      .from("purchases")
      .select("user_id")
      .in("user_id", invitedIds)
      .eq("status", "paid");
    if (purchases) paidCount = new Set(purchases.map((p: any) => p.user_id)).size;
  }

  if (paidCount < 3) {
    return NextResponse.json({ error: `需要3位付费用户，当前${paidCount}位` }, { status: 400 });
  }
  if (profile.reward_claimed) {
    return NextResponse.json({ error: "已领取过奖励" }, { status: 400 });
  }

  const { subjectId } = await request.json();
  if (!subjectId) {
    return NextResponse.json({ error: "请选择科目" }, { status: 400 });
  }

  // Create reward purchase (free, 1 year)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { error: purchaseErr } = await admin.from("purchases").insert({
    user_id: user.id,
    subject_id: subjectId,
    amount_cny: 0,
    status: "reward",
    expires_at: expiresAt.toISOString(),
  });

  if (purchaseErr) {
    return NextResponse.json({ error: purchaseErr.message }, { status: 500 });
  }

  // Mark reward as claimed
  await admin.from("profiles").update({
    reward_claimed: true,
    reward_subject: subjectId,
  }).eq("id", user.id);

  return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() });
}
