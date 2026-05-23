-- 答题记录表 — 复制粘贴到 Supabase SQL Editor 执行
-- https://aondldqwwvttwpervrfq.supabase.co → SQL Editor

CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  user_answer TEXT NOT NULL DEFAULT '',
  correct_answer TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  subject_slug TEXT,
  topic_slug TEXT,
  subtopic_code TEXT,
  question_text TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ua_user_time ON user_answers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ua_user_subject ON user_answers(user_id, subject_slug);

ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own answers" ON user_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own answers" ON user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
