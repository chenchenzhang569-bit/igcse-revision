import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let parsed: any = { parseError: "not JSON" };
  try { parsed = JSON.parse(rawBody); } catch {}
  
  const output = {
    length: rawBody.length,
    keys: parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
    structure: parsed && typeof parsed === "object" ? 
      Object.fromEntries(Object.entries(parsed).map(([k, v]) => 
        [k, typeof v === "object" ? (Array.isArray(v) ? `array(${v.length})` : Object.keys(v)) : typeof v]
      )) : null,
    sample: rawBody.substring(0, 2000),
  };
  
  return NextResponse.json(output);
}
