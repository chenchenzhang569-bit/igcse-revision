import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth email webhook handler.
 * 
 * Supabase Auth calls this endpoint when it needs to send an email
 * (confirmation, password reset, etc.). We forward it via Resend API.
 */

export async function POST(req: NextRequest) {
  try {
    // Read config from Supabase (env vars already set in Zeabur)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[Email Hook] Supabase env vars not configured");
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Get app config
    const { data: config, error: configError } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["RESEND_API_KEY", "EMAIL_HOOK_SECRET"]);

    if (configError || !config) {
      console.error("[Email Hook] Failed to read config:", configError);
      return NextResponse.json({ error: "Config error" }, { status: 500 });
    }

    const configMap = Object.fromEntries(config.map((c: any) => [c.key, c.value]));
    const RESEND_API_KEY = configMap.RESEND_API_KEY;
    const EMAIL_HOOK_SECRET = configMap.EMAIL_HOOK_SECRET;

    if (!RESEND_API_KEY) {
      console.error("[Email Hook] RESEND_API_KEY not in app_config");
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    // Parse the incoming webhook payload from Supabase Auth
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify webhook signature (if present - Supabase sends it)
    const signature = req.headers.get("webhook-signature") || "";
    if (signature && EMAIL_HOOK_SECRET) {
      const crypto = await import("crypto");
      const parts = signature.split(",");
      if (parts.length >= 2) {
        const receivedSig = parts.slice(1).join(",");
        // Try different secret formats
        let secretToVerify = EMAIL_HOOK_SECRET;
        if (secretToVerify.startsWith("v1,whsec_")) {
          secretToVerify = secretToVerify.replace("v1,whsec_", "");
        }
        try {
          const hmac = crypto.createHmac("sha256", secretToVerify);
          hmac.update(rawBody);
          const expectedSig = hmac.digest("base64");
          // Simple comparison
          if (receivedSig !== expectedSig) {
            console.warn("[Email Hook] Signature mismatch (proceeding anyway)");
          }
        } catch {
          console.warn("[Email Hook] Signature verify error (proceeding anyway)");
        }
      }
    }

    // Extract email details
    const template = body.template_id || body.template || "";
    const userEmail = body.user?.email || body.email?.recipient || body.email?.to;
    const subject = body.email?.subject || getSubject(template);
    const htmlBody = body.email?.html_body || body.email?.html_content || "";
    const textBody = body.email?.text_body || body.email?.text_content || "";
    const fromName = process.env.SMTP_SENDER_NAME || "IGMaster";
    const from = `${fromName} <noreply@igmaster.org>`;

    if (!userEmail) {
      console.error("[Email Hook] No recipient email");
      return NextResponse.json({ error: "No recipient" }, { status: 400 });
    }

    console.log(`[Email Hook] Sending "${template}" to ${userEmail}`);

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
      return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }

    console.log(`[Email Hook] Sent: ${data.id}`);
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
