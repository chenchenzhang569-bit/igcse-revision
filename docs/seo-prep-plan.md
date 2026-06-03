# IGMaster SEO 预备方案

> 准备阶段，不对外，不动 production。配好等你下令上线。

---

## 一、现状审计

### 🔴 核心问题

| # | 问题 | 严重度 | 影响 |
|:-|:-----|:------:|:----|
| 1 | 所有内容页面需要登录 | 🔴 致命 | Google 无法索引 subjects/past-papers/topics |
| 2 | 全部 page.tsx 是 `"use client"` | 🔴 致命 | 无 SSR，`generateMetadata` 不可用 |
| 3 | 没有 `generateMetadata` | 🔴 致命 | 所有页面共用同一个 title/description |
| 4 | 没有 sitemap.xml | 🟠 高 | Google 不知道有哪些页面 |
| 5 | 没有 robots.txt | 🟠 高 | 返回 307 重定向，不是正常文件 |
| 6 | Meta 描述含 Edexcel | 🟡 中 | 实际 Edexcel 已隐藏，关键词不准确 |
| 7 | 全英文，无视中文关键词 | 🟡 中 | 国内学生搜中文词找不到 |
| 8 | OpenGraph locale = en_GB | 🟢 低 | 面向 UK，非中国 |
| 9 | 无结构化数据 (schema) | 🟡 中 | 没有 FAQ / Course schema |

### 当前公开页面（200 状态）

- `/` — 首页
- `/pricing` — 定价页
- `/login` — 登录页
- `/register` — 注册页

### 当前受保护页面（307 → login）

- `/subjects` — 科目列表
- `/subjects/[slug]` — 科目详情
- `/subjects/[slug]/sections/[sectionSlug]` — 科目章节
- `/subjects/[slug]/topics/[topicSlug]` — 知识点
- `/subjects/[slug]/topics/[topicSlug]/[subtopicSlug]` — 子知识点
- `/past-papers` / `/past-papers/[subjectSlug]` / `.../[yearSeason]`
- `/mock-exams` / `.../[subjectSlug]` / `.../[paperSlug]`

### 当前 Meta（`src/app/layout.tsx`）

```ts
title: { default: "IGMaster — IGCSE Revision & Past Papers", template: "%s | IGMaster" }
description: "Free IGCSE past papers, topic questions, revision notes, and mock exams for CAIE and Edexcel..."
keywords: ["IGCSE","past papers","revision","CAIE","Edexcel","exam preparation","IGCSE notes"]
og:locale: en_GB
robots: { index: true, follow: true }   // ← 但内容页全 307，等于没索引
```

---

## 二、关键词洞察（CAIE 方向）

国内 CAIE IGCSE 学生搜索习惯分三类：

### 学生高频搜索词

| 类型 | 例子 | 搜索意图 |
|:----|:-----|:--------|
| 真题搜索 | `IGCSE 0580 past paper` `IGCSE 数学 真题` | 找卷子做 |
| 笔记搜索 | `CAIE biology notes` `IGCSE 物理 笔记` `IGCSE 经济 0455 复习资料` | 找复习资料 |
| 题目搜索 | `IGCSE 三角函数 题目` `IGCSE 化学 0620 topic questions` | 针对知识点练 |
| 答案/MS | `0580 mark scheme` `IGCSE 数学 答案` | 对答案 |
| 资料聚合 | `IGCSE 备考资料 免费` `CAIE IGCSE 资源` | 找一站资源 |

### 家长搜索词

`IGCSE 选课` `IGCSE 哪科容易拿 A*` `国际学校 IGCSE 备考` `CAIE 考试局 介绍`

### 优先优化的关键词（按科目）

```
# 数学 0580（最多搜索量）
IGCSE Mathematics 0580 past papers
IGCSE 数学 0580 真题
0580 topic questions by topic
CAIE IGCSE Maths revision notes

# 附加数学 0606
IGCSE Additional Mathematics 0606
0606 past papers
IGCSE 附加数学 笔记

# 物理 0625
IGCSE Physics 0625 past papers
IGCSE 物理 0625 真题
CAIE Physics revision notes

# 化学 0620
IGCSE Chemistry 0620 past papers
IGCSE 化学 笔记
0620 topic questions

# 生物 0610
IGCSE Biology 0610 past papers
CAIE IGCSE Biology notes
0610 复习资料

# 经济 0455
IGCSE Economics 0455 past papers
IGCSE 经济 0455 笔记
CAIE Economics topic questions

# 计算机 0478
IGCSE Computer Science 0478
IGCSE 计算机 0478 真题
0478 revision notes
```

---

## 三、竞品参考

| 对手 | 优势 | 弱点 | 可借鉴点 |
|:----|:-----|:-----|:--------|
| **SaveMyExams** | 内容质量高，SEO 极强，几乎占满 IGCSE 长尾关键词 | 付费墙 | 题目-知识点对齐方式 |
| **Physics & Maths Tutor** | Past papers by topic 免费，Google 排名极高 | 只有物理/数学/生物/化学 | by-topic 分类是 SEO 利器 |
| **ZNotes** | 社区驱动，笔记免费，UI 简洁 | 内容深度不够 | 笔记+社区模式 |
| **PapaCambridge** | 真题最全的老牌站 | UI 过时，广告多 | 真题库覆盖度 |
| **XtremePapers** | 老站，域名年龄优势 | 体验差，弹窗多 | 域名信任度 |

### IGMaster 差异化优势

- ✅ by-topic 分类（PMT 模式）+ 笔记（SME 质量）+ 真题 = 一站搞定
- ✅ 国内访问速度快（阿里云香港）
- ✅ 对比 PMT：覆盖更多科目（经济/CS）
- ✅ 对比 SME：免费内容更多

---

## 四、实施方案（备好，你说开始就执行）

### Phase 1: SEO 基础（半天）

**1.1 改全局 meta（`src/app/layout.tsx`）**

```ts
// 去掉 Edexcel，聚焦 CAIE，加中文关键词
title: "IGMaster — CAIE IGCSE Revision & Past Papers"
description: "Free CAIE IGCSE past papers, topic questions and revision notes for Mathematics (0580/0606), Physics (0625), Chemistry (0620), Biology (0610), Economics (0455) and Computer Science (0478). 免费 IGCSE 真题下载和复习笔记。"
keywords: ["IGCSE", "CAIE", "past papers", "IGCSE 真题", "revision notes", "IGCSE 复习笔记",
           "0580", "0606", "0625", "0620", "0610", "0455", "0478",
           "IGCSE 数学", "IGCSE 物理", "IGCSE 化学", "IGCSE 生物", "IGCSE 经济", "IGCSE 计算机"]
og:locale: zh_CN  // 或保持 en_GB 但加 zh_CN alternate
```

**1.2 首页改 Server Component（`src/app/(marketing)/page.tsx`）**

- 移除 `"use client"`
- 首页内容改为 SSR + 静态内容
- 加 `generateMetadata`

**1.3 添加 robots.txt**

```txt
User-agent: *
Allow: /
Sitemap: https://igmaster.org/sitemap.xml
```

**1.4 添加 sitemap.xml**

开 `/api/sitemap` 路由，用 DB 数据生成动态 sitemap：

```ts
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const subjects = await fetchSubjects()
  const entries: MetadataRoute.Sitemap = [
    { url: 'https://igmaster.org', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://igmaster.org/subjects', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://igmaster.org/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
  for (const subject of subjects) {
    entries.push({
      url: `https://igmaster.org/subjects/${subject.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    // 加 topics / sections 子页面
  }
  return entries
}
```

Next.js App Router 支持 `app/sitemap.ts`——自动生成 `/sitemap.xml`。

### Phase 2: 页面级 SEO（逐个科目做）

**2.1 `subjects/[slug]/page.tsx` — 科目页**
- 加 `generateMetadata`，根据 subject 动态生成 title/description
- 例：Maths 0580 → "CAIE IGCSE Mathematics 0580 Past Papers & Revision Notes | IGMaster"

**2.2 `topics/[topicSlug]/page.tsx` — 知识点页**
- 动态 title："IGCSE Maths 0580: Algebra — Topic Questions & Notes | IGMaster"

**2.3 `subtopics` — 子知识点页**
- 动态 title："IGCSE Physics 0625: Waves — Revision Notes & Past Paper Questions | IGMaster"

**2.4 结构化数据**
- 每个科目页加 `Course` schema
- 每个知识点页加 `FAQ` schema（常见问题）

### Phase 3: 内容引流备料

**3.1 小红书笔记文案（3篇）**

准备好 text + 配图说明，等你下令发。

**3.2 知乎回答草稿**

准备 3-5 个高排名问题的回答。

---

## 五、注意事项

- ⚠️ **Phase 1 改 layout.tsx 后推 main（Vercel 测试）没问题，因为 Vercel staging 不公开**
- ⚠️ **Phase 2 需要先把内容页改为公开（不要求登录）**——否则 Google 爬不到
- ⚠️ 内容页公开化是大改动，涉及 middleware.ts 的 publicPaths 调整
- ✅ sitemap.ts 和 robots.txt 可以安全先写好，不影响任何功能

---

## 六、关键决策点

| 决策 | 选项 A | 选项 B | 建议 |
|:----|:-------|:-------|:-----|
| 内容页公开 | 允许未登录浏览内容（下载仍要登录） | 保持现状 | **A** — 否则 SEO 白做 |
| 首页 SSR | 改 Server Component | 保持 Client | **A** — 首页是 SEO 入口 |
| 语言 | 全英文保留 | 加中文翻译 | 先英文，中文二期 |
