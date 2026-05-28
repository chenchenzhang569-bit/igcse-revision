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

  const pemKey = getPrivateKey();
  let keyObj: crypto.KeyObject;
  try {
    keyObj = crypto.createPrivateKey({ key: pemKey, format: "pem", type: "pkcs8" });
  } catch {
    keyObj = crypto.createPrivateKey({ key: pemKey, format: "pem" });
  }

  return crypto.sign("RSA-SHA256", Buffer.from(sorted, "utf8"), keyObj).toString("base64");
}

export function createPagePayUrl(params: {
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

  const query = Object.entries(signParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  return `${gateway}?${query}&sign=${encodeURIComponent(signature)}`;
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

export async function queryTrade(outTradeNo: string): Promise<string | null> {
  const bizContent = JSON.stringify({ out_trade_no: outTradeNo });

  const signParams: Record<string, string> = {
    app_id: process.env.ALIPAY_APP_ID!,
    method: "alipay.trade.query",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
    version: "1.0",
    biz_content: bizContent,
  };

  const signature = sign(signParams);

  const gateway = process.env.ALIPAY_GATEWAY || "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
  const body = new URLSearchParams({ ...signParams, sign: signature }).toString();

  const res = await fetch(gateway, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  // Parse JSON response: { alipay_trade_query_response: { trade_status, ... } }
  try {
    const json = JSON.parse(text);
    const resp = json.alipay_trade_query_response;
    if (resp?.code === "10000") return resp.trade_status;
    return null;
  } catch {
    return null;
  }
}
