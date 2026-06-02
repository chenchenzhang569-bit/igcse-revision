import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = "re_APGGtiMK_AEQTqKdvyKxB3tXeJZeGFANm";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try { body = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const userEmail = body.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "No user email" }, { status: 400 });
    }

    // Build the confirmation link from Supabase's email_data
    const siteUrl = "https://igmaster.org";
    const tokenHash = body.email_data?.token_hash || "";
    const actionType = body.email_data?.email_action_type || "signup";
    const redirectTo = body.email_data?.redirect_to || siteUrl;
    
    const confirmUrl = tokenHash 
      ? `${siteUrl}/auth/callback?token_hash=${tokenHash}&type=${actionType}&next=${encodeURIComponent(redirectTo)}`
      : `${siteUrl}/login`;

    const html = `<h2>Welcome to IGMaster!</h2>
<p>Please confirm your email address to activate your account.</p>
<p style="margin:24px 0">
  <a href="${confirmUrl}" 
     style="background:#001C71;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
    Confirm Your Email
  </a>
</p>
<p>Or copy this link: <br><a href="${confirmUrl}">${confirmUrl}</a></p>
<p style="color:#888;font-size:12px">If you didn't create an account, ignore this email.</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IGMaster <noreply@igmaster.org>",
        to: userEmail,
        subject: "Confirm your IGMaster account",
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || "Send failed" }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
