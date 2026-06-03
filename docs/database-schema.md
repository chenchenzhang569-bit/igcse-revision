# 数据库 Schema 文档

**数据库:** Supabase PostgreSQL  
**项目:** `aondldqwwvttwpervrfq`  
**类型定义:** `src/types/database.ts`

---

## 表概览

| 表名 | 行数 | 用途 |
|:-----|:----:|:-----|
| `exam_boards` | 2 | 考试局（CAIE、Edexcel 等） |
| `subjects` | 11 | 科目（0580 数学、0606 附加数学、经济、CS 等） |
| `topics` | 143 | 主题/章节 |
| `subtopics` | 390 | 子主题（对应于具体知识点） |
| `questions` | 5,379 | 题目（结构化题 + MCQ） |
| `notes` | 450 | 笔记内容 |
| `past_papers` | 4,137 | 历年真题 PDF 记录 |
| `purchases` | 21 | 用户购买记录 |
| `profiles` | 17 | 用户附加信息 |
| `error_reports` | 10 | 前端报错报告 |
| `login_events` | 13 | 登录事件日志 |
| `user_roles` | 1 | 用户角色（admin） |
| `app_config` | 3 | 应用配置（Resend Key 等） |
| `mock_exam_sets` | 49 | 模拟考套题集合 |
| `mock_exam_papers` | 97 | 模拟考试卷 |
| `mock_exam_questions` | 1,699 | 模拟考题目 |

> 行数为 2026-06-02 备份数据。Auth 用户 17 人（存在 Supabase Auth schema，不在 public schema）。

---

## 各表字段

### exam_boards
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `name` | text | 简称（CAIE, Edexcel） |
| `full_name` | text | 全称 |
| `slug` | text | URL 友好标识 |
| `created_at` | timestamptz | 创建时间 |

### subjects
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `exam_board_id` | uuid | FK → exam_boards |
| `name` | text | 简称（mathematics, economics） |
| `display_name` | text | 显示名 |
| `code` | text | 科目代码（0580, 0606, 0455） |
| `slug` | text | URL 友好标识 |
| `icon` | text | 图标 URL |
| `price_cny` | numeric | 人民币价格 |
| `is_published` | boolean | 是否发布 |
| `sort_order` | integer | 排序 |
| `created_at` | timestamptz | 创建时间 |

### topics
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `subject_id` | uuid | FK → subjects |
| `name` | text | 简称 |
| `display_name` | text | 显示名 |
| `slug` | text | URL 友好标识 |
| `description` | text | 描述 |
| `sort_order` | integer | 排序 |
| `created_at` | timestamptz | 创建时间 |

### subtopics
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `topic_id` | uuid | FK → topics |
| `name` | text | 子主题名 |
| `display_name` | text | 显示名 |
| `slug` | text | URL 友好标识 |
| `sort_order` | integer | 排序 |
| `created_at` | timestamptz | 创建时间 |

### questions
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `topic_id` | uuid | FK → topics |
| `question_text` | text | 题目内容 |
| `answer_text` | text | 原始答案 |
| `clean_answer_text` | text | 清洗后答案（用于评分） |
| `explanation` | text | 解析 |
| `difficulty` | text | 难度（easy/medium/hard） |
| `question_type` | text | 题型（mcq/structured） |
| `marks` | integer | 分值 |
| `is_free_preview` | boolean | 是否免费预览 |
| `sort_order` | integer | 排序 |
| `created_at` | timestamptz | 创建时间 |

### notes
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `topic_id` | uuid | FK → topics |
| `title` | text | 标题 |
| `content` | text | 笔记内容（Markdown） |
| `is_free_preview` | boolean | 是否免费 |
| `sort_order` | integer | 排序 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

### past_papers
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `subject_id` | uuid | FK → subjects |
| `title` | text | 标题 |
| `year` | integer | 年份 |
| `season` | text | 考季 |
| `paper_number` | integer | 卷号 |
| `paper_type` | text | 类型（QP/MS） |
| `file_url` | text | PDF 文件 URL |
| `is_free` | boolean | 是否免费 |
| `created_at` | timestamptz | 创建时间 |

### purchases
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `user_id` | uuid | FK → auth.users |
| `subject_id` | uuid | FK → subjects |
| `amount_cny` | numeric | 支付金额 |
| `status` | text | 状态（paid/trial/expired） |
| `expires_at` | timestamptz | 过期时间 |
| `created_at` | timestamptz | 创建时间 |

### profiles
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键（PK = auth.users.id） |
| `email` | text | 邮箱 |
| `display_name` | text | 显示名 |
| `invited_by` | uuid | 邀请人 |
| `source` | text | 来源渠道 |
| `is_admin` | boolean | 是否管理员 |
| `created_at` | timestamptz | 创建时间 |

### app_config
| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `id` | uuid | 主键 |
| `key` | text | 配置键名 |
| `value` | text | 配置值 |

当前配置：
- `RESEND_API_KEY` — Resend 邮件 API key
- `EMAIL_HOOK_SECRET` — Supabase 邮箱 hook 密钥
- `LAST_HOOK_PAYLOAD` — 最后一次 hook 请求记录

---

## RLS 策略

所有表已开启 Row Level Security (RLS)。

| 表 | 策略 |
|:---|:-----|
| 公开表（subjects, topics, questions 等） | `USING (true)` — 所有人可读 |
| `purchases` | `USING (auth.uid() = user_id)` — 只能看自己的 |
| `profiles` | `USING (auth.uid() = id)` — 只能看自己的 |

> Storage 桶 `past-papers`、`mock-exams`、`notes-pdfs` 设为 public，文件可匿名访问。

## 关键外键关系

```
exam_boards
  └── subjects (exam_board_id)
        └── topics (subject_id)
              ├── subtopics (topic_id)
              ├── questions (topic_id)
              └── notes (topic_id)

subjects
  └── past_papers (subject_id)

auth.users
  └── purchases (user_id)
  └── profiles (id)

topics
  └── purchases (subject_id) — 按 subject 粒度购买
```
