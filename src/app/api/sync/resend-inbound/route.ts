import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get Resend API key (try env var first, then app_config)
    let resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "RESEND_API_KEY")
        .single();
      resendKey = data?.value || null;
    }

    if (!resendKey) {
      return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });
    }

    // Fetch inbound emails from Resend
    const res = await fetch("https://api.resend.com/emails/inbound?limit=50", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend inbound fetch error:", err);
      return NextResponse.json({ error: "fetch failed" }, { status: 500 });
    }

    const data = await res.json();
    const emails: any[] = data.data || [];
    if (emails.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch existing message_ids for dedup
    const { data: existing } = await supabase
      .from("inbound_emails")
      .select("headers");

    const seenIds = new Set(
      (existing || [])
        .map((r: any) => r.headers?.message_id)
        .filter(Boolean)
    );

    let synced = 0;
    for (const email of emails) {
      if (seenIds.has(email.message_id)) continue;

      const { error } = await supabase.from("inbound_emails").insert({
        sender: email.from || "",
        recipient: Array.isArray(email.to) ? email.to.join(", ") : email.to || "",
        subject: email.subject || "",
        body_text: email.text || "",
        body_html: email.html || "",
        headers: { message_id: email.message_id },
      });

      if (error) {
        console.error("Insert error:", error.message, "for", email.message_id);
      } else {
        synced++;
      }
    }

    return NextResponse.json({ synced });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
