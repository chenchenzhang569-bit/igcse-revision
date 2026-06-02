import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = "re_APGGtiMK_AEQTqKdvyKxB3tXeJZeGFANm";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const userEmail = body.user?.email;
    if (!userEmail) {
      return NextResponse.json({ 
        error: "No user email",
        body: JSON.stringify(body).substring(0, 500)
      }, { status: 400 });
    }

    const subject = "Confirm your IGMaster account";
    const htmlBody = `<h2>Welcome to IGMaster!</h2><p>Please confirm your account.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://igmaster.org"}/auth/callback">Confirm Email</a></p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IGMaster <noreply@igmaster.org>",
        to: userEmail,
        subject,
        html: htmlBody,
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
