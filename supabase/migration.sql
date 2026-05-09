-- ====================================================
-- IGCSE Revision - Supabase 数据库迁移脚本
-- 在 Supabase SQL Editor 中执行此文件
-- ====================================================

-- 1. 考试局
CREATE TABLE IF NOT EXISTS exam_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 科目
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_board_id UUID REFERENCES exam_boards(id),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  code TEXT,
  slug TEXT NOT NULL,
  icon TEXT,
  price_cny INTEGER NOT NULL DEFAULT 29900,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_board_id, slug)
);

-- 3. 主题
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, slug)
);

-- 4. 笔记
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_free_preview BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 试题
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  question_type TEXT DEFAULT 'structured',
  marks INTEGER,
  is_free_preview BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 真题
CREATE TABLE IF NOT EXISTS past_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  season TEXT NOT NULL,
  paper_number INTEGER NOT NULL,
  paper_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_free BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 模拟试卷
CREATE TABLE IF NOT EXISTS mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  answer_url TEXT,
  duration_minutes INTEGER,
  total_marks INTEGER,
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 用户画像（扩容 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. 购买记录
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject_id UUID REFERENCES subjects(id),
  amount_cny INTEGER NOT NULL,
  alipay_trade_no TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_subject 
  ON purchases(user_id, subject_id, status);

-- ====================================================
-- RLS (Row Level Security) 策略
-- ====================================================

-- 启用 RLS
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- exam_boards: 公开可读
CREATE POLICY "exam_boards_public_read" ON exam_boards
  FOR SELECT USING (true);

-- subjects: 公开可读（已发布）
CREATE POLICY "subjects_public_read" ON subjects
  FOR SELECT USING (is_published = true);

-- topics: 公开可读
CREATE POLICY "topics_public_read" ON topics
  FOR SELECT USING (true);

-- notes: 公开可读
CREATE POLICY "notes_public_read" ON notes
  FOR SELECT USING (true);

-- questions: 公开可读
CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (true);

-- past_papers: 公开可读
CREATE POLICY "past_papers_public_read" ON past_papers
  FOR SELECT USING (true);

-- mock_exams: 公开可读
CREATE POLICY "mock_exams_public_read" ON mock_exams
  FOR SELECT USING (true);

-- profiles: 用户只读自己的
CREATE POLICY "profiles_user_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- purchases: 用户只读自己的
CREATE POLICY "purchases_user_read" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

-- purchases: 系统可通过 service_role 写入
CREATE POLICY "purchases_service_write" ON purchases
  FOR INSERT WITH CHECK (true);

CREATE POLICY "purchases_service_update" ON purchases
  FOR UPDATE USING (true);

-- ====================================================
-- 初始种子数据
-- ====================================================

-- 考试局
INSERT INTO exam_boards (name, full_name, slug) VALUES
  ('CAIE', 'Cambridge Assessment International Education', 'caie'),
  ('Edexcel', 'Pearson Edexcel International', 'edexcel');

-- CAIE 科目
INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order)
SELECT id, 'Mathematics', '数学', '0580', 'caie-mathematics-0580', '📐', 29900, true, 1
FROM exam_boards WHERE slug = 'caie';

INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order)
SELECT id, 'Physics', '物理', '0625', 'caie-physics-0625', '⚡', 29900, true, 2
FROM exam_boards WHERE slug = 'caie';

INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order)
SELECT id, 'Chemistry', '化学', '0620', 'caie-chemistry-0620', '🧪', 29900, true, 3
FROM exam_boards WHERE slug = 'caie';

-- Edexcel 科目
INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order)
SELECT id, 'Mathematics A', '数学 A', '4MA1', 'edexcel-mathematics-4ma1', '📐', 29900, true, 4
FROM exam_boards WHERE slug = 'edexcel';

INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order)
SELECT id, 'Physics', '物理', '4PH1', 'edexcel-physics-4ph1', '⚡', 29900, true, 5
FROM exam_boards WHERE slug = 'edexcel';

INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order)
SELECT id, 'Chemistry', '化学', '4CH1', 'edexcel-chemistry-4ch1', '🧪', 29900, true, 6
FROM exam_boards WHERE slug = 'edexcel';

-- 自动创建 profiles（新用户注册时）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, is_admin)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
