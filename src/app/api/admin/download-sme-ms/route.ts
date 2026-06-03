import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const SME_ACCOUNT = {
  email: process.env.SME_EMAIL || "inspiringchermann@vmail.dev",
  password: process.env.SME_PASSWORD || "WXVm8Chqq2",
};

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSmeToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const resp = await fetch(
    "https://www.savemyexams.com/api/auth/v1/supertokens/signin/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        formFields: [
          { id: "email", value: SME_ACCOUNT.email },
          { id: "password", value: SME_ACCOUNT.password },
        ],
      }),
    }
  );

  const token = resp.headers.get("st-access-token");
  if (!token) throw new Error("SME login failed");
  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return token;
}

export async function POST(req: NextRequest) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return authErr;

    const { qsId, subId, displayName } = await req.json();
    if (!qsId || !subId || !displayName) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const token = await getSmeToken();

    // 1. Generate answers PDF URL
    const genResp = await fetch(
      "https://www.savemyexams.com/api/usage/v1/pdf-downloads",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          data: {
            type: "pdf_download",
            attributes: { download_type: "topic_question_set_answers_pdf" },
            relationships: {
              topic_question_set: {
                data: { id: qsId, type: "topic_question_set" },
              },
            },
          },
        }),
      }
    );

    if (!genResp.ok) {
      const err = await genResp.json();
      return NextResponse.json(
        { error: "SME generate failed", detail: err },
        { status: genResp.status }
      );
    }

    const genData = await genResp.json();
    const dlUrl = genData?.data?.attributes?.download_url;
    if (!dlUrl) {
      return NextResponse.json(
        { error: "No download_url in response" },
        { status: 500 }
      );
    }

    // 2. Download PDF
    const pdfResp = await fetch(dlUrl);
    if (!pdfResp.ok) {
      return NextResponse.json(
        { error: "PDF download failed", status: pdfResp.status },
        { status: 500 }
      );
    }
    const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());

    // 3. Upload to Supabase Storage
    const safeName = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `cs/topic-questions/ms/${safeName}.pdf`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const upResp = await fetch(
      `${supabaseUrl}/storage/v1/object/past-papers/${fileName}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/pdf",
        },
        body: pdfBuffer,
      }
    );

    if (!upResp.ok) {
      const upErr = await upResp.text();
      return NextResponse.json(
        { error: "Upload failed", detail: upErr },
        { status: 500 }
      );
    }

    const fileUrl = `${supabaseUrl}/storage/v1/object/public/past-papers/${fileName}`;

    // 4. Insert into past_papers
    const insertResp = await fetch(`${supabaseUrl}/rest/v1/past_papers`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        subtopic_id: subId,
        title: `${displayName} MS`,
        paper_type: "MCQ MS",
        file_url: fileUrl,
        file_name: fileName,
        season: "SME",
      }),
    });

    if (!insertResp.ok) {
      return NextResponse.json(
        { error: "DB insert failed", status: insertResp.status },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, name: displayName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
