# IGMaster 待办计划 — 2026-05-24

---

## #1 支付宝跳转修复 ⏳ 等部署

**问题**：点击 "Pay with Alipay" 后页面显示支付宝 URL 文字，不跳转

**根因**：Vercel 部署的是 `main` 分支（非 `master`），被部署的版本用 `document.write()` 把 JSON 写入了页面

**修复**：
- 改为 `window.location.href = data.url` 直接跳转
- 代码已在 `main` 和 `master` 分支（commit `1abb4e1`）
- 等 Vercel 每日部署限额重置（明天 ~18:00 CST）

**部署**：
```bash
# Vercel Deploy Hook（不占配额）
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_y6URO31ghKrn3UACTEC6NQUs1qlI/P6ROfumGJQ"

# 或 Vercel CLI（需 token）
vercel deploy --prod --token $VERCEL_TOKEN
```

**涉及文件**：
- `src/app/checkout/page.tsx` L96：`window.location.href = data.url`

---

## #2 SubTopic Back/Next 导航

**方案 A**：同 Topic 内导航

**位置**：`/subjects/[slug]/topics/[topicSlug]/[subtopicSlug]` 页面底部

**逻辑**：
- 通过 `getSubtopics(subjectKey, topicSlug)` 取同一 Topic 的所有子专题
- 找到当前子专题在列表中的位置
- 第一个隐藏 ←，最后一个隐藏 →
- 点击跳转到相邻子专题页面

**视觉**：
```
┌──────────────────────────────────┐
│  ← 1.1 Measurement    1.3 Mass →│
└──────────────────────────────────┘
```
- 白底圆角卡片，`primary-900` 文字 + 灰色箭头
- 移动端压缩为 `← 1.2` / `4.3 →`

**不碰**：TopicTabs 组件不改，放在 Tab 内容下方

**涉及文件**：
- `src/app/(marketing)/subjects/[slug]/topics/[topicSlug]/[subtopicSlug]/page.tsx` — 加导航组件
- 新建 `src/components/SubTopicNav.tsx` — Client Component 导航条

**数据来源**：`src/lib/subtopic-data.ts` → `getSubtopics()`

---

## #3 Admin Dashboard

**页面**：`/admin`（已有页面，替换假数据）

**统计卡片**：

| 卡片 | SQL / 来源 |
|---|---|
| 总题目数 | `SELECT count(*) FROM questions` |
| 注册用户 | `auth.users` count |
| 付费用户 | `SELECT count(distinct user_id) FROM purchases WHERE status='paid'` |
| 近 30 天收入 | `SELECT sum(amount_cny) FROM purchases WHERE status='paid' AND created_at > now()-interval'30d'` |
| 活跃答题用户 | `SELECT count(distinct user_id) FROM user_answers WHERE created_at > now()-interval'7d'` |
| 试用用户 | `SELECT count(distinct user_id) FROM purchases WHERE status='trial'` |

**图表**：
- 按科目题目数柱状图（recharts）
- 近 7 天新增用户折线图

**涉及文件**：
- `src/app/admin/page.tsx` — 改接 real API
- `src/app/api/admin/stats/route.ts` — 聚合查询 API

---

## #4 Admin User Management

**页面**：`/admin/users` 列表 + `/admin/users/[id]` 详情

**用户列表列**：邮箱、注册时间、最后登录、订阅状态、已购科目、角色、操作

**用户详情功能**：
- 基本信息
- 购买记录列表
- 安全日志（已有 `user_security_log` 表）
- 操作：重置密码、禁用/启用、改 admin 角色

**技术要点**：
- 重置密码：Supabase Admin API `generateLink({ type: 'recovery' })`
- 禁用：自建 `user_disabled` 表 或 Supabase `admin.banUser()`
- 角色：自建 `user_roles` (user_id, role, granted_by, created_at)
- 权限保护：Admin API middleware 查 JWT → `user_roles` → 非 admin 返 403
- **第一批 admin**：先手动在 DB 给你加 admin 角色

**涉及文件**：
- `src/app/admin/users/page.tsx` — 列表
- `src/app/admin/users/[id]/page.tsx` — 详情
- `src/app/api/admin/users/route.ts` — CRUD API
- `src/app/api/admin/users/[id]/route.ts` — 单用户操作
- `supabase/migrations/003_user_roles.sql` — 建表

---

## #5 Admin 上传工具

**页面**：`/admin/upload`

**一个表单搞定**：
```
1. 层级选择：○ Topic  ● Subtopic
2. 科目 ▾ → 主题 ▾ → [子专题 ▾]
3. 类型选择（根据层级不同）
4. 标题 + 文件上传
```

**数据流**：
```
表单 → POST /api/admin/upload (FormData)
     → Supabase Storage.upload("pmt-pdfs", file)
     → INSERT INTO past_papers 或 notes
     → 返回 success
```

**上传映射**：

| 选择 | 存到表 | paper_type |
|---|---|---|
| SubTopic → Notes | `notes` | — |
| SubTopic → MCQ QP | `past_papers` | `MCQ QP` |
| SubTopic → MCQ MS | `past_papers` | `MCQ MS` |
| SubTopic → Topic QP | `past_papers` | `Topic QP` |
| SubTopic → Topic MS | `past_papers` | `Topic MS` |
| Topic → Past Paper QP | `past_papers` | `Topic QP` |
| Topic → Past Paper MS | `past_papers` | `Topic MS` |

**安全**：只 INSERT 不 UPDATE/DELETE。传错手动去 Supabase 删。

**涉及文件**：
- `src/app/admin/upload/page.tsx` — 上传表单
- `src/app/api/admin/upload/route.ts` — 处理上传
- AdminLayout 加菜单项

---

## #6 前端错误收集 + Admin 查看修复

**数据库**：
```sql
CREATE TABLE error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id),
  question_text text,        -- 存原文，方便直接看
  user_answer text,           -- 学生写了什么
  correct_answer text,        -- 标准答案
  error_type text,            -- grading/missing_image/parsing/other
  note text,                  -- 学生留言
  url text,                   -- 出错页面
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false
);
```

**前端**：评分结果页底部加一行低调小字
> *Answer doesn't seem right? [Let us know]*
> 点开弹窗：Type ▾ + Note → Submit

**Admin 查看页** `/admin/errors`：
- 按科目 + 错误类型筛选
- 每条显示：题目文字 + 学生答案 vs 标准答案 对比
- **一键修复**：
  - 评分错 → 编辑 `answer_text` 另存
  - 图片缺 → 内嵌上传 → 写 `questions.images`
  - 解析错 → 编辑 `question_text`
- **[已修复 ✓]** 按钮 → 灰掉，下次不再显示

**涉及文件**：
- 新建 `supabase/migrations/004_error_reports.sql`
- `src/app/api/report/route.ts` — POST 接收报错
- `src/components/ReportButton.tsx` — 前端小按钮
- `src/app/admin/errors/page.tsx` — Admin 查看修复

---

## 优先级建议

| 顺序 | 事项 | 理由 |
|---|---|---|
| 🔴 1 | 支付宝跳转 | 阻塞付费，明天立马部署 |
| 🟡 2 | SubTopic 导航 | 用户体验改进，代码量小 |
| 🟡 3 | Admin 上传 | 你急需补 PDF 文档 |
| 🟢 4 | 错误收集 | 被动等用户反馈，不急 |
| 🟢 5 | Admin Dashboard | 锦上添花 |
| 🟢 6 | User Management | 用户还少，不急 |

---

## 环境信息

- **项目路径**：`/home/ubuntu/igcse-site`
- **Vercel 项目**：`igcse-revision-cdgy`
- **部署分支**：`main`
- **Supabase**：`aondldqwwvttwpervrfq.supabase.co`
- **Vercel Token**：`$VERCEL_TOKEN`（存于 `.env.local`）
- **Deploy Hook**：`https://api.vercel.com/v1/integrations/deploy/prj_y6URO31ghKrn3UACTEC6NQUs1qlI/P6ROfumGJQ`
