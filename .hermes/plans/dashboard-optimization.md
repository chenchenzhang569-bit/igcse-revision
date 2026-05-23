# Dashboard Optimization Plan

> **Goal:** Transform the bare dashboard into a data-rich hub with progress tracking, recent activity, weak areas, and quick links.

**Architecture:** 
1. New `user_answers` Supabase table to track every answer submitted
2. Save answers from TopicTabs MCQ submit (client → API)
3. Dashboard server component aggregates data via REST API
4. Tailwind cards with progress bars, stats, and quick links

**Data needed:** user_answers table with user_id, question_id, subject info, correct boolean, timestamps

---

### Task 1: Create user_answers table in Supabase

**SQL to run in Supabase SQL Editor:**

```sql
CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  subject_slug TEXT,
  topic_slug TEXT,
  subtopic_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_answers_user ON user_answers(user_id, created_at DESC);
CREATE INDEX idx_user_answers_user_subject ON user_answers(user_id, subject_slug);
```

**Verification:** Run `SELECT count(*) FROM user_answers;` → 0

---

### Task 2: Save answers from TopicTabs MCQ submit

**File:** `src/app/(marketing)/subjects/[slug]/topics/[topicSlug]/TopicTabs.tsx`

In `handleSubmitLevel()`, after setting submitted state, batch-send answers to API:

```typescript
// At the top of TopicTabs, receive new props:
// subjectSlug?: string; topicSlug?: string; pmtCode?: string;

// In handleSubmitLevel:
async function handleSubmitLevel(level: string) {
  setSubmittedLevels((prev) => new Set(prev).add(level));
  
  // Batch save answers
  const answers = (groupedMcqs[level] || []).map(q => ({
    question_id: q.id,
    user_answer: userAnswers[q.id] || "",
    correct_answer: q.answer_text || q.correct_answer || "",
    is_correct: userAnswers[q.id] === (q.answer_text || q.correct_answer),
  }));
  
  fetch("/api/user-answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      answers,
      subject_slug: subjectSlug || "",
      topic_slug: topicSlug || "", 
      subtopic_code: pmtCode || "",
    }),
    credentials: "include",
  }).catch(() => {});
}
```

---

### Task 3: Create /api/user-answers route

**File:** `src/app/api/user-answers/route.ts`

POST handler: receive answers array, insert with user_id from auth cookie.

---

### Task 4: Dashboard - 学习进度 (Study Progress)

**File:** `src/app/(dashboard)/dashboard/page.tsx`

Fetch from `/api/user-answers/stats` to get per-subject:
- Total questions answered
- Correct rate
- Last activity date

Display as progress bars grouped by subject.

---

### Task 5: Dashboard - 最近答题 (Recent Activity)

Show last 5 answers with:
- Question text (truncated)
- Correct/Wrong badge
- Subject badge
- Time ago

---

### Task 6: Dashboard - 快捷入口 (Quick Links)

Show subject cards for quick access, using existing subjects data.

---

**Priority order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

**Implementation note:** Each task is designed for a single subagent with context from previous tasks.
