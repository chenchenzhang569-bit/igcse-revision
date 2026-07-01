/**
 * 彩虹易支付 V1 旧版接口
 * 文档: https://api.gxzwgs.cn/doc/v1_legacy_api.html
 */
import * as crypto from "crypto";

const YIPAY_BASE = "https://api.gxzwgs.cn";
const PID = 2069;
const KEY = "c8iGZ3528F3g5d85mCrk8d26D88d3XXI";

/**
 * MD5 签名
 * 1. 排除 sign、sign_type 和空值
 * 2. 按参数名 ASCII 排序
 * 3. key=value&key2=value2 + KEY → md5
 */
function md5Sign(params: Record<string, string | undefined>): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("md5").update(sorted + KEY).digest("hex");
}

/**
 * 验证易支付回调签名
 */
export function verifySign(params: Record<string, string>): boolean {
  const sign = params.sign;
  if (!sign) return false;
  const calculated = md5Sign(params);
  return calculated === sign;
}

/**
 * 生成商户订单号
 */
export function generateTradeNo(): string {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `IGCSE${now}${rand}`;
}

export interface CreateOrderParams {
  outTradeNo: string;
  type: string;        // alipay | wxpay
  name: string;        // 商品名称
  money: string;       // 金额（元），如 "50.00"
  notifyUrl: string;   // 异步通知地址
  returnUrl: string;   // 跳转通知地址
  clientIp: string;    // 用户IP
  device?: string;     // pc | mobile | wechat | alipay
  param?: string;      // 业务扩展参数（支付后原样返回）
}

export interface CreateOrderResult {
  code: number;       // 1=成功
  msg?: string;       // 失败原因
  trade_no?: string;  // 平台订单号
  payurl?: string;    // 跳转URL
  qrcode?: string;    // 二维码链接
  urlscheme?: string; // 小程序跳转
}

/**
 * API接口支付 — 创建订单，返回支付URL
 * POST https://api.gxzwgs.cn/mapi.php
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const payload: Record<string, string> = {
    pid: String(PID),
    type: params.type,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    return_url: params.returnUrl,
    name: params.name,
    money: params.money,
    clientip: params.clientIp,
    device: params.device || "pc",
    sign_type: "MD5",
    ...(params.param ? { param: params.param } : {}),
  };
  payload.sign = md5Sign(payload);

  const body = new URLSearchParams(payload).toString();
  const res = await fetch(`${YIPAY_BASE}/mapi.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}
