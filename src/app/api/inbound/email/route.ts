import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Validate webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secret);
  const payloadBytes = encoder.encode(payload);

  return crypto.subtle
    .importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
    .then((key) => crypto.subtle.verify("HMAC", key, hexToBytes(signature), payloadBytes))
    .catch(() => false);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body
    const body = await req.text();
    const signature = req.headers.get("svix-signature") || req.headers.get("x-resend-signature") || "";
    const secret = process.env.RESEND_INBOUND_SECRET || "whsec_dHLSIXNbGeQPrJmiu6/ZhbC4ermjIqQC";

    // Parse the body
    const data = JSON.parse(body);

    // Extract email data
    const sender = data.from || data.email || "";
    const recipient = data.to || data.recipient || "";
    const subject = data.subject || "";
    const bodyText = data.text || data.body_plain || "";
    const bodyHtml = data.html || data.body_html || "";
    const headers = data.headers || {};

    if (!sender) {
      return NextResponse.json({ error: "missing sender" }, { status: 400 });
    }

    // Insert into Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("inbound_emails").insert({
      sender,
      recipient,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      headers,
    });

    if (error) {
      console.error("Failed to store inbound email:", error);
      return NextResponse.json({ error: "db insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Inbound email webhook error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
