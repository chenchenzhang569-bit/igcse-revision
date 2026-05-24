import * as crypto from "crypto";

let _privateKey: string | null = null;
let _publicKey: string | null = null;

function getPrivateKey(): string {
  if (_privateKey) return _privateKey;
  const raw = process.env.ALIPAY_PRIVATE_KEY!;
  if (!raw) throw new Error("ALIPAY_PRIVATE_KEY not configured");
  _privateKey = ensurePem(raw, "PRIVATE");
  return _privateKey;
}

function getPublicKey(): string {
  if (_publicKey) return _publicKey;
  const raw = process.env.ALIPAY_PUBLIC_KEY!;
  if (!raw) throw new Error("ALIPAY_PUBLIC_KEY not configured");
  _publicKey = ensurePem(raw, "PUBLIC");
  return _publicKey;
}

function ensurePem(key: string, type: "PRIVATE" | "PUBLIC"): string {
  if (key.includes("-----BEGIN")) return key.trim();
  const body = key.replace(/\s/g, "");
  const lines = body.match(/.{1,64}/g) || [body];
  return `-----BEGIN ${type} KEY-----\n${lines.join("\n")}\n-----END ${type} KEY-----`;
}

function sign(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(sorted, "utf8");
  return signer.sign(getPrivateKey(), "base64");
}

export function createPagePayForm(params: {
  outTradeNo: string;
  totalAmount: string;
  subject: string;
  body?: string;
  returnUrl?: string;
}) {
  const bizContent = JSON.stringify({
    out_trade_no: params.outTradeNo,
    product_code: "FAST_INSTANT_TRADE_PAY",
    total_amount: params.totalAmount,
    subject: params.subject,
    body: params.body || params.subject,
  });

  const signParams: Record<string, string> = {
    app_id: process.env.ALIPAY_APP_ID!,
    method: "alipay.trade.page.pay",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
    version: "1.0",
    notify_url: process.env.ALIPAY_NOTIFY_URL || "",
    return_url: params.returnUrl || process.env.ALIPAY_RETURN_URL || "",
    biz_content: bizContent,
  };

  const signature = sign(signParams);

  const gateway = process.env.ALIPAY_GATEWAY || "https://openapi-sandbox.dl.alipaydev.com/gateway.do";

  const formFields = Object.entries(signParams)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}" />`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting to Alipay...</title></head>
<body>
<form id="alipay" action="${gateway}" method="GET">
${formFields}
<input type="hidden" name="sign" value="${escapeHtml(signature)}" />
</form>
<script>document.getElementById("alipay").submit();</script>
</body>
</html>`;
}

export function verifyNotify(params: Record<string, string>): boolean {
  const sign = params.sign;
  if (!sign) return false;
  delete (params as any).sign;
  delete (params as any).sign_type;

  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${decodeURIComponent(params[k])}`)
    .join("&");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(sorted, "utf8");
  return verifier.verify(getPublicKey(), sign, "base64");
}

export function generateTradeNo(): string {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `IGCSE${now}${rand}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
