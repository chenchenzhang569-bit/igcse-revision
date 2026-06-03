# 部署文档

## 概览

IGMaster 采用双平台部署策略，通过 GitHub 分支自动触发部署：

| 环境 | 平台 | 节点 | 域名 | 触发分支 |
|:----|:----|:----|:----|:--------|
| 开发/测试 | Vercel | 全球 CDN | vercel.app 子域名 | `main` |
| 正式生产 | Zeabur | **香港** | igmaster.org | `production` |

---

## 环境变量

以下变量需在 **Vercel** 和 **Zeabur** 两个平台都设置。

### 必填变量

| 变量名 | 说明 | 获取方式 |
|:-------|:-----|:---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公开 anon key | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理密钥（最高权限） | 同上（注意：不是 anon key） |
| `NEXT_PUBLIC_SITE_URL` | 网站完整 URL | 生产: `https://igmaster.org` |

### 可选变量（有默认值）

| 变量名 | 说明 | 默认值 |
|:-------|:-----|:-------|
| `SME_EMAIL` | SaveMyExams 登录邮箱 | `inspiringchermann@vmail.dev` |
| `SME_PASSWORD` | SaveMyExams 登录密码 | 硬编码 fallback |

### 支付相关（暂未上线）

| 变量名 | 说明 |
|:-------|:-----|
| `ALIPAY_APP_ID` | 支付宝 APPID |
| `ALIPAY_PRIVATE_KEY` | 支付宝 RSA 私钥 |
| `ALIPAY_PUBLIC_KEY` | 支付宝 RSA 公钥 |
| `ALIPAY_GATEWAY` | 支付宝网关 URL（默认沙箱） |
| `ALIPAY_NOTIFY_URL` | 异步通知 URL |
| `ALIPAY_RETURN_URL` | 同步跳转 URL |

---

## Vercel 部署

1. 在 [vercel.com](https://vercel.com) 导入 GitHub 仓库 `chenchenzhang569-bit/igcse-revision`
2. 框架自动检测为 Next.js
3. 在 Vercel 项目设置中添加环境变量（见上表）
4. 设置生产分支为 `main`
5. 每次推 `main` 自动部署

---

## Zeabur 部署

1. 在 [zeabur.com](https://zeabur.com) 创建项目
2. 选择香港节点（国内用户可访问）
3. 绑定 GitHub 仓库，部署分支设为 `production`
4. 在 Zeabur 环境变量页面添加所有环境变量
5. 绑定域名 `igmaster.org`（CNAME：`igmaster.zeabur.app`）

> Zeabur 香港节点无需 ICP 备案。

---

## 域名 DNS 配置

| 记录类型 | 主机记录 | 值 | 说明 |
|:---------|:---------|:---|:-----|
| CNAME | `@` | `igmaster.zeabur.app` | 根域名指向 Zeabur |
| CNAME | `www` | `igmaster.zeabur.app` | www 子域名指向 Zeabur |

DNS 托管在阿里云云解析（dns.console.aliyun.com）。

### 应急切换

如果 Zeabur 宕机，将 CNAME 改为指向 Vercel：
```
@ → igcse-revision.vercel.app
```

> 注意：Vercel 也需要绑定 `igmaster.org` 域名才能生效。

---

## 构建与部署检查

每次推代码前验证：

```bash
npm run build
```

注意：本地构建需要 `.env.local` 文件中的 Supabase 密钥。如果没有，构建会因缺少环境变量而失败——这是正常的，部署平台有完整的环境变量。
