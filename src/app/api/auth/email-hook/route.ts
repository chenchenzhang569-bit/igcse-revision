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
        html: `<h2>Welcome to IGMaster!</h2><p>Please confirm your email to activate your account.</p>`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ 
        error: "Resend failed", 
        resendCode: res.status,
        resendError: data 
      }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
