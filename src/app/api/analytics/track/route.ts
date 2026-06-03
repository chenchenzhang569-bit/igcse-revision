import { NextResponse } from "next/server";
import { processPageView, processSessionUpdate, TrackEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    const body: TrackEvent = await request.json();
    
    // Validate required fields
    if (!body.session_id || !body.page_url || !body.event_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Process in parallel
    await Promise.all([
      processPageView(body),
      processSessionUpdate(body.session_id, body.event_type),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("analytics track error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
