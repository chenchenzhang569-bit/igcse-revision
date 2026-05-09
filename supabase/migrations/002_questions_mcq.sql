-- 扩展 questions 表支持 MCQ 选择题 + 问答题
-- 在 Supabase SQL Editor 中执行

-- 添加新字段
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 更新 question_type 约束支持新类型
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check 
  CHECK (question_type IN ('mcq', 'essay', 'structured'));

-- 添加 subject_id 方便按科目查询（可选，可通过 topic 关联）
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;
