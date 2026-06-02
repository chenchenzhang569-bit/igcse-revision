import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = "re_APGGtiMK_AEQTqKdvyKxB3tXeJZeGFANm";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    // Read raw body once
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON", received: rawBody.substring(0, 200) }, { status: 400 });
    }

    // Log everything for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    const debug = {
      headers,
      bodyKeys: Object.keys(body),
      bodySample: JSON.stringify(body).substring(0, 1000),
    };
    console.log("[Email Hook] DEBUG:", JSON.stringify(debug));

    // Try EVERY field name pattern that Supabase could use
    const userEmail = body.user?.email
      || body.email?.to
      || (Array.isArray(body.email?.to) ? body.email?.to[0] : null)
      || body.email?.recipient
      || body.email?.address
      || body.recipient
      || body.to
      || body.email;

    const subject = body.email?.subject
      || body.subject
      || "IGMaster notification";

    const htmlBody = body.email?.html_body
      || body.email?.html_content
      || body.email?.html
      || body.html_body
      || body.html
      || "";

    const textBody = body.email?.text_body
      || body.email?.text_content
      || body.email?.text
      || body.text_body
      || body.text
      || "";

    const from = "IGMaster <noreply@igmaster.org>";

    if (!userEmail) {
      console.error("[Email Hook] No recipient found. Full body:", JSON.stringify(body).substring(0, 2000));
      return NextResponse.json({ 
        error: "No recipient email found in payload", 
        debug: { bodyKeys: Object.keys(body), body: JSON.stringify(body).substring(0, 500) } 
      }, { status: 400 });
    }

    // Send via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: userEmail,
        subject,
        html: htmlBody,
        text: textBody || stripHtml(htmlBody),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[Email Hook] Resend error:`, data);
      return NextResponse.json({ error: data.message || data.error || "Send failed" }, { status: 500 });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Email Hook] Sent ${data.id} to ${userEmail} in ${elapsed}ms`);
    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    console.error(`[Email Hook] Error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
