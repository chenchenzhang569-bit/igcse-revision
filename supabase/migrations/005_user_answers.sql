-- ============================================================
-- 用户答题记录
-- ============================================================
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id) -- 每题只保留最新一次
);

CREATE INDEX idx_user_answers_user ON user_answers(user_id, created_at DESC);
CREATE INDEX idx_user_answers_question ON user_answers(question_id);

ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的记录
CREATE POLICY "user_own_answers" ON user_answers
  FOR ALL USING (auth.uid() = user_id);
