# Supabase 配置步骤（3 分钟）

## 1️⃣ 注册账号
打开 https://supabase.com → 点 "Start your project" → 用 GitHub 登录（最快）或用 beryl_zhong@hotmail.com 注册

## 2️⃣ 创建项目
- Name: `igcse-revision`
- Database Password: `Igcse2026!Rev`
- Region: 选 Singapore（离国内最近）
- 等 1-2 分钟数据库启动

## 3️⃣ 建表
左侧菜单 → SQL Editor → New Query → 粘贴以下两段：

### 先执行: supabase/migrations/001_schema.sql
（已在项目中，复制全部内容）

### 再执行: supabase/seed.sql
（已在项目中，复制全部内容）

## 4️⃣ 拿密钥
左侧菜单 → Project Settings → API
复制这两个值：
- URL: https://xxxxx.supabase.co
- anon public key: eyJh......

## 5️⃣ 填入 .env.local
编辑 ~/igcse-site/.env.local：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh......
```

## 6️⃣ 启动
```bash
cd ~/igcse-site
npm run dev
```
