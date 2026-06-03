# API 文档

所有 API 路由位于 `src/app/api/` 目录下。使用 Next.js App Router 路由处理器。

---

## 公开 API（无需登录）

### 科目和内容

| 路径 | 方法 | 说明 | 参数 |
|:-----|:----:|:-----|:-----|
| `/api/subjects` | GET | 获取所有已发布科目 | — |
| `/api/pricing` | GET | 获取定价信息 | — |

### 认证

| 路径 | 方法 | 说明 | 请求体 |
|:-----|:----:|:-----|:-------|
| `/api/auth/login` | POST | 邮箱密码登录 | `{ email, password }` |
| `/api/auth/signup` | POST | 注册新用户 | `{ email, password, displayName }` |

> 认证路由通过服务端 Supabase Auth 代理，解决国内直接调用 supabase.co 不稳定的问题。

### 其他

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/errors/report` | POST | 前端错误报告 |
| `/api/invite/stats` | GET | 邀请统计 |
| `/api/invite/claim` | POST | 领取邀请 |

---

## 支付 API

| 路径 | 方法 | 说明 | 请求体 |
|:-----|:----:|:-----|:-------|
| `/api/payment/create` | POST | 创建支付宝支付订单 | `{ subjectId }` |
| `/api/payment/notify` | POST | 支付宝异步通知 | 支付宝回调参数 |
| `/api/payment/trial/start` | POST | 开始试用 | `{ subjectId }` |
| `/api/payment/trial/check` | GET | 检查试用状态 | `?subjectId=` |

> 支付宝相关 API 暂未上线（待注册个体户后开通）。

---

## Admin API（需管理员登录）

所有 admin API 路径以 `/api/admin/` 开头。需要验证管理员身份（`profiles.is_admin = true`）。

### 验证

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/check-role` | GET | 检查当前用户是否是 admin（前端管理后台用） |

### 仪表盘

| 路径 | 方法 | 说明 | 参数 |
|:-----|:----:|:-----|:-----|
| `/api/admin/dashboard` | GET | 管理后台数据（DAU、MAU、收入等） | `?subject_id=&type=` |
| `/api/admin/login-events` | GET | 登录事件趋势 | `?days=30` |

### 内容管理

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/subjects` | GET/POST | 科目列表/创建 |
| `/api/admin/subjects/[id]` | PUT/DELETE | 编辑/删除科目 |
| `/api/admin/topics` | GET/POST | 主题列表/创建 |
| `/api/admin/topics/[id]` | PUT/DELETE | 编辑/删除主题 |
| `/api/admin/questions` | GET/POST | 题目列表/创建 |
| `/api/admin/questions/[id]` | PUT/DELETE | 编辑/删除题目 |
| `/api/admin/notes` | GET/POST | 笔记列表/创建 |
| `/api/admin/notes/[id]` | PUT/DELETE | 编辑/删除笔记 |

### 文档上传

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/documents` | GET/DELETE | 列出/删除文档 |
| `/api/admin/past-papers/upload` | POST | 上传历年真题 PDF |
| `/api/admin/notes/upload` | POST | 上传笔记 |
| `/api/admin/mock-exams/upload` | POST | 上传模拟考试卷 |
| `/api/admin/mock-exams/[id]` | DELETE | 删除模拟考试卷 |
| `/api/admin/download-sme-ms` | POST | 从 SME 自动下载答案 PDF（需 admin） |

### 数据管理

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/coverage` | GET | 题目覆盖率统计 |
| `/api/admin/subject-qa` | GET | 科目题库统计 |
| `/api/admin/debug-qs` | GET | 题目调试信息 |

### 用户管理

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/[id]` | GET | 用户详情 |

### 系统

| 路径 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/errors` | GET/PATCH | 错误报告查看/状态修改 |

---

## 认证方式

### 普通用户 API

使用浏览器 Cookie（Supabase session cookie）。不需要手动传 token。

### Admin API

支持两种认证方式：

1. **Cookie 认证**（路由自动识别）— 管理员登录后，session cookie 自动携带
2. **Bearer Token**（前端管理后台用）— 请求头添加：
   ```
   Authorization: Bearer <supabase_access_token>
   ```

---

## 错误响应格式

```json
{
  "error": "错误描述信息"
}
```

HTTP 状态码：
- `400` — 请求参数错误
- `401` — 未认证
- `403` — 权限不足
- `404` — 资源不存在
- `500` — 服务器错误
