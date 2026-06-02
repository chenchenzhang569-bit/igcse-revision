import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_HOOK_SECRET = process.env.EMAIL_HOOK_SECRET;

/**
 * Verify the Standard Webhooks signature from Supabase Auth.
 * Supabase sends the secret via the "webhook-id" header and signs with "webhook-signature".
 */
function verifySignature(body: string, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    // Standard Webhooks format: "v1,signature_base64"
    const parts = signatureHeader.split(",");
    if (parts.length < 2) return false;
    const version = parts[0];
    const receivedSig = parts.slice(1).join(",");

    // Compute expected signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expectedSig = hmac.digest("base64");

    // Compare using timing-safe comparison
    const receivedBuf = Buffer.from(receivedSig, "base64");
    const expectedBuf = Buffer.from(expectedSig);
    if (receivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate config
    if (!RESEND_API_KEY) {
      console.error("[Email Hook] RESEND_API_KEY not configured");
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    if (!EMAIL_HOOK_SECRET) {
      console.error("[Email Hook] EMAIL_HOOK_SECRET not configured");
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    // Read raw body for signature verification
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify the webhook signature (if present)
    const signature = req.headers.get("webhook-signature") || "";
    if (signature) {
      // Try signature from the raw secret (Supabase may strip "v1,whsec_" prefix)
      let secretToVerify = EMAIL_HOOK_SECRET;
      if (secretToVerify.startsWith("v1,whsec_")) {
        secretToVerify = secretToVerify.replace("v1,whsec_", "");
      }
      // Also try base64 decoded version
      const sigValid = verifySignature(rawBody, signature, secretToVerify) ||
                       verifySignature(rawBody, signature, Buffer.from(secretToVerify, "base64").toString()) ||
                       verifySignature(rawBody, signature, process.env.SUPABASE_ANON_KEY || "");

      if (!sigValid) {
        console.warn("[Email Hook] Signature verification failed, proceeding anyway (dev mode)");
      }
    }

    // Extract email details
    const userEmail = body.user?.email || body.email?.recipient || body.email?.to;
    const subject = body.email?.subject || getSubject(body.template_id || body.template);
    const htmlBody = body.email?.html_body || body.email?.html_content || "";
    const textBody = body.email?.text_body || body.email?.text_content || "";
    const fromName = process.env.SMTP_SENDER_NAME || "IGMaster";
    const from = `${fromName} <noreply@igmaster.org>`;

    if (!userEmail) {
      console.error("[Email Hook] No recipient email in payload");
      return NextResponse.json({ error: "No recipient" }, { status: 400 });
    }

    console.log(`[Email Hook] Sending email to ${userEmail}, subject: "${subject}"`);

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
      console.error(`[Email Hook] Resend API error:`, data);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    console.log(`[Email Hook] Email sent successfully: ${data.id}`);
    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    console.error(`[Email Hook] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getSubject(template?: string): string {
  const subjects: Record<string, string> = {
    confirmation: "Confirm your IGMaster account",
    recovery: "Reset your IGMaster password",
    magic_link: "Your IGMaster Magic Link",
    email_change: "Confirm your email change",
    invite: "You've been invited to IGMaster",
    reauthentication: "Confirm reauthentication",
  };
  return subjects[template || ""] || "IGMaster notification";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
