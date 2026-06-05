import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email_id, body } = await req.json();
    if (!email_id || !body) {
      return NextResponse.json({ error: "missing email_id or body" }, { status: 400 });
    }

    // Fetch the original email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: email, error: fetchErr } = await supabase
      .from("inbound_emails")
      .select("*")
      .eq("id", email_id)
      .single();

    if (fetchErr || !email) {
      return NextResponse.json({ error: "email not found" }, { status: 404 });
    }

    // Get Resend API key from app_config
    const { data: config } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "RESEND_API_KEY")
      .single();

    const resendKey = config?.value || process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });
    }

    // Build reply
    const replySubject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
    const replyBody = `${body}\n\n---\n${email.body_text || ""}`;

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "support@igmaster.org",
        to: email.sender,
        subject: replySubject,
        text: replyBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend reply error:", err);
      return NextResponse.json({ error: "failed to send reply" }, { status: 500 });
    }

    // Mark as replied
    await supabase
      .from("inbound_emails")
      .update({ replied: true })
      .eq("id", email_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reply error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
