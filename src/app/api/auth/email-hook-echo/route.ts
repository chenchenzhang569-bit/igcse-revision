import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint: Echo whatever Supabase sends to inspect the payload.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {}

    return NextResponse.json({
      received: true,
      contentType: headers["content-type"],
      contentLength: rawBody.length,
      headers: headers,
      bodyType: typeof rawBody,
      bodySample: rawBody.substring(0, 3000),
      parsedKeys: parsed ? Object.keys(parsed) : [],
      parsedFirstLevel: parsed ? Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, typeof v === "object" ? Object.keys(v as object) : typeof v])
      ) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
