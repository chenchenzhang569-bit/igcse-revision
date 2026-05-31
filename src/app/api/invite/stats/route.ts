import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// GET /api/invite/stats — get user's invite stats
export async function GET(request: NextRequest) {
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

  // Service-key client for profiles queries (RLS blocks anon key)
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );

  // Get profile with invite data
  const { data: profile } = await admin
    .from("profiles")
    .select("invite_code, invited_by, invite_count, reward_claimed, reward_subject")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Generate invite code if not set
  let inviteCode = profile.invite_code;
  if (!inviteCode) {
    inviteCode = "IG" + user.id.substring(0, 6).toUpperCase();
    await admin.from("profiles").update({ invite_code: inviteCode }).eq("id", user.id);
  }

  // Count invited users who PAID
  const { data: paidInvites } = await admin
    .from("profiles")
    .select("id")
    .eq("invited_by", user.id);

  // Check which of these have paid purchases
  let paidCount = 0;
  if (paidInvites && paidInvites.length > 0) {
    const invitedIds = paidInvites.map((p: any) => p.id);
    const { data: purchases } = await admin
      .from("purchases")
      .select("user_id")
      .in("user_id", invitedIds)
      .eq("status", "paid");
    
    if (purchases) {
      paidCount = new Set(purchases.map((p: any) => p.user_id)).size;
    }
  }

  const canClaim = paidCount >= 3 && !profile.reward_claimed;
  const inviteLink = `https://igcse-revision-cdgy.vercel.app/?invite=${inviteCode}`;

  return NextResponse.json({
    inviteCode,
    inviteLink,
    totalInvited: paidInvites?.length || 0,
    paidCount,
    canClaim,
    rewardClaimed: profile.reward_claimed,
    rewardSubject: profile.reward_subject,
    isTopInviter: paidCount >= 5,
  });
}
