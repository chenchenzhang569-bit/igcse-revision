import AlipaySdk from "alipay-sdk";
import * as crypto from "crypto";

let _alipay: AlipaySdk | null = null;

function ensurePem(key: string, type: "PRIVATE" | "PUBLIC"): string {
  if (key.includes("-----BEGIN")) return key;
  // Auto-wrap raw base64 with PEM headers + 64-char line breaks
  const body = key.replace(/\s/g, ""); // remove any whitespace
  const lines = body.match(/.{1,64}/g) || [body];
  return `-----BEGIN ${type} KEY-----\n${lines.join("\n")}\n-----END ${type} KEY-----`;
}

function getAlipay(): AlipaySdk {
  if (!_alipay) {
    const appId = process.env.ALIPAY_APP_ID;
    if (!appId) throw new Error("ALIPAY_APP_ID not configured");

    _alipay = new AlipaySdk({
      appId,
      privateKey: ensurePem(process.env.ALIPAY_PRIVATE_KEY!, "PRIVATE"),
      alipayPublicKey: ensurePem(process.env.ALIPAY_PUBLIC_KEY!, "PUBLIC"),
      gateway: process.env.ALIPAY_GATEWAY || "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
      signType: "RSA2",
      keyType: "PKCS8",
    });
  }
  return _alipay;
}

/**
 * 生成电脑网站支付表单 HTML
 */
export function createPagePayForm(params: {
  outTradeNo: string;
  totalAmount: string;
  subject: string;
  body?: string;
  returnUrl?: string;
}) {
  const alipay = getAlipay();

  const bizContent = {
    out_trade_no: params.outTradeNo,
    product_code: "FAST_INSTANT_TRADE_PAY",
    total_amount: params.totalAmount,
    subject: params.subject,
    body: params.body || params.subject,
  };

  return alipay.pageExec("alipay.trade.page.pay", {
    method: "GET",
    bizContent,
    returnUrl: params.returnUrl || process.env.ALIPAY_RETURN_URL,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL,
  });
}

/**
 * 验签支付宝异步通知
 */
export function verifyNotify(params: Record<string, string>): boolean {
  const publicKey = process.env.ALIPAY_PUBLIC_KEY;
  if (!publicKey) throw new Error("ALIPAY_PUBLIC_KEY not configured");

  const sign = params.sign;
  delete params.sign;
  delete params.sign_type;

  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${decodeURIComponent(params[k])}`)
    .join("&");

  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(sorted);
  return verify.verify(publicKey, sign, "base64");
}

/**
 * 生成唯一订单号
 */
export function generateTradeNo(): string {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `IGCSE${now}${rand}`;
}
