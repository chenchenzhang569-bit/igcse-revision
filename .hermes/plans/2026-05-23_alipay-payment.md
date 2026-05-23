# 支付宝支付集成计划

## 当前状态

| 组件 | 状态 |
|------|------|
| `purchases` 表 | ✅ 已有 — user_id, subject_id, amount_cny, alipay_trade_no, status, paid_at |
| 定价页 `/pricing` | ✅ 已有 — 单科 ¥299 / 科学三件套 ¥699 |
| 用户认证 | ✅ Supabase Auth |
| 支付宝 SDK | ❌ 未安装 |
| 支付 API | ❌ 未创建 |
| 回调通知 | ❌ 未创建 |
| 购买后权限 | ❌ 未控制 |
| CTA 按钮 | ❌ 只是链接到 /subjects 和 /register |

---

## 支付宝配置准备（需用户完成）

1. 注册/登录 [支付宝开放平台](https://open.alipay.com)
2. 创建应用 → 获取 **APPID**
3. 生成密钥对（RSA2），上传公钥 → 获取 **支付宝公钥**
4. 签约产品：**电脑网站支付** 或 **手机网站支付**
5. 配置 `.env.local`：
   ```
   ALIPAY_APP_ID=2021xxxxxxxx
   ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
   ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
   ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
   ALIPAY_NOTIFY_URL=https://igcse-revision-cdgy.vercel.app/api/alipay/notify
   ALIPAY_RETURN_URL=https://igcse-revision-cdgy.vercel.app/dashboard?paid=true
   ```

---

## 开发步骤

### Phase 1: 支付宝 SDK 封装
- `src/lib/alipay.ts` — 签名、构建支付URL、验签
- 安装依赖：`npm install dayjs`（支付宝官方 SDK 庞大，手写轻量版）

### Phase 2: 支付 API 路由
- **`POST /api/alipay/create-order`** — 前端调用，生成订单 + 返回支付 URL
  - 接收 `subjectId`
  - 查 `subjects.price_cny`
  - 写 `purchases` 表（status=pending）
  - 调用支付宝 `alipay.trade.page.pay` 返回支付 URL
- **`POST /api/alipay/notify`** — 支付宝异步回调
  - 验签
  - 更新 `purchases.status='paid'` + `paid_at=now()`
  - 返回 `success`
- **`GET /api/alipay/return`** — 支付成功页面跳转

### Phase 3: 前端支付流程
- **Checkout 页面** — `/checkout?subject=xxx`
  - 显示科目名 + 价格
  - "去支付" 按钮 → 调用 create-order API → 跳转支付宝
- **定价页改造** — 按钮改为跳 `/checkout` 而非 `/subjects`
- **支付成功** — `/dashboard` 检测 `?paid=true` 弹窗提示

### Phase 4: 权限控制
- **内容解锁** — API 查询 `purchases` 判断用户是否已购买
  - 免费预览内容：`is_free_preview=true` 为主
  - 已购内容：完整访问
  - 未购内容：显示购买提示（不阻止查看题目列表，但限制答案/笔记）
- **购买状态组件** — `SubjectLock` 组件显示在未购科目页面
- **Dashboard 已购科目** — 展示已购科目列表 + 到期时间

### Phase 5: 测试
1. 支付宝沙箱环境测试（用户需申请沙箱账号）
2. 完整支付流程：选科 → 创建订单 → 支付宝支付 → 异步回调 → 权限更新
3. 退款/异常处理

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/lib/alipay.ts` | **新建** — 签名/验签/构建URL |
| `src/app/api/alipay/create-order/route.ts` | **新建** — 创建订单 |
| `src/app/api/alipay/notify/route.ts` | **新建** — 回调验签 |
| `src/app/(marketing)/checkout/page.tsx` | **新建** — 结算页 |
| `src/app/(marketing)/pricing/page.tsx` | **修改** — CTA 链接 |
| `src/middleware.ts` | **修改** — 内容访问控制 |
| `.env.local` | **修改** — 加支付宝配置 |

---

## 风险

- 支付宝沙箱环境需要企业/个体户主体，个人开发者可能无法开通
- 异步回调可能因 Vercel serverless 冷启动延迟导致支付宝超时重试
- `purchases.expires_at` 目前未使用（单次购买永久有效）

---

## 需要用户确认

1. 支付宝应用已创建？有 APPID 和密钥对？
2. 是否需要微信支付双通道？
3. 定价文案确认：¥299/科，科学三件套？
