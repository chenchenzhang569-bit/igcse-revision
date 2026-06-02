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
        body: rawBody.substring(0, 500)
      }, { status: 400 });
    }

    // Use Supabase's actual email content with confirmation link
    const htmlBody = body.email?.html_body || body.email?.html || 
      `<h2>Welcome to IGMaster!</h2><p>Please confirm your email to activate your account.</p>`;
    const textBody = body.email?.text_body || body.email?.text || "";
    const subject = body.email?.subject || "Confirm your IGMaster account";

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
        text: textBody || "",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ 
        error: "Resend failed", 
        resendStatus: res.status,
        resendData: data 
      }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
