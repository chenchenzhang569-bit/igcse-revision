# IGMaster — IGCSE 在线复习平台

IGCSE 学生的一站式复习平台：历年真题、模拟考试、智能评分、笔记资料。

**网站:** [igmaster.org](https://igmaster.org)

---

## 技术栈

| 层 | 技术 |
|:--|:-----|
| 前端框架 | Next.js 14 (App Router) |
| 样式 | Tailwind CSS |
| 数据库 | Supabase PostgreSQL |
| 认证 | Supabase Auth + 邮箱验证 (Resend) |
| 文件存储 | Supabase Storage |
| 部署 (测试) | Vercel — `main` 分支自动部署 |
| 部署 (生产) | Zeabur 香港节点 — `production` 分支自动部署 |
| 域名 | 阿里云 DNS → CNAME → Zeabur |

## 分支策略

```
main        → Vercel 开发/测试环境
production  → Zeabur 正式上线环境（香港节点，国内可访问）
```

**工作流:**
1. 开发 → 推 `main` → Vercel 自动部署
2. 测试通过 → 开 PR (`main` → `production`)
3. 在 GitHub approve PR → 合并 → Zeabur 自动部署

> `production` 分支有保护规则：需要 PR + 1 个 approve，管理员也需遵守。

## 目录结构

```
src/
├── app/
│   ├── (marketing)/      # 前台页面（首页、科目、题目、定价等）
│   ├── (dashboard)/      # 用户后台（My Bank 等）
│   └── admin/            # 管理后台
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # 浏览器端 Supabase 客户端
│   │   ├── server.ts     # 服务端 SSR Supabase 客户端
│   │   └── admin.ts      # 管理客户端 (service_role key)
│   └── …                 # 其他工具库
├── types/
│   └── database.ts       # 数据库类型定义
docs/                     # 文档
scripts/                  # 维护脚本
```

## 部署

详见 [docs/deployment.md](docs/deployment.md)

## 环境变量

详见 [docs/deployment.md#环境变量](docs/deployment.md#环境变量)

## 数据库

详见 [docs/database-schema.md](docs/database-schema.md)

## API 接口

详见 [docs/api.md](docs/api.md)

## 运维

详见 [docs/operations.md](docs/operations.md)

## 备份

每天凌晨 3:00 自动数据库备份，每周日完整备份（数据库 + 文件 + 代码）。

详见 [docs/operations.md#备份方案](docs/operations.md#备份方案)

## 回滚

详见 [docs/rollback-plan.md](docs/rollback-plan.md)

---

## 开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local
# 填入真实值后:

# 启动开发服务器
npm run dev
```

## 许可

内部项目
