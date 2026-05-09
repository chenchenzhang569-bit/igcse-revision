-- ============================================================
-- IGCSE Revision Platform: Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. 考试局
-- ============================================================
CREATE TABLE exam_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 科目
-- ============================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_board_id UUID REFERENCES exam_boards(id) ON DELETE CASCADE,
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

-- ============================================================
-- 3. 主题/模块
-- ============================================================
CREATE TABLE topics (
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

-- ============================================================
-- 4. 精简笔记
-- ============================================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_free_preview BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. 试题
-- ============================================================
CREATE TABLE questions (
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

-- ============================================================
-- 6. 真题
-- ============================================================
CREATE TABLE past_papers (
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

-- ============================================================
-- 7. 模拟试卷
-- ============================================================
CREATE TABLE mock_exams (
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

-- ============================================================
-- 8. 用户画像
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 新用户自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. 购买记录
-- ============================================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  amount_cny INTEGER NOT NULL,
  alipay_trade_no TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_purchases_user_subject ON purchases(user_id, subject_id, status);
CREATE INDEX idx_purchases_trade_no ON purchases(alipay_trade_no);

-- ============================================================
-- RLS 策略
-- ============================================================
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- 公开可读
CREATE POLICY "public_read_exam_boards" ON exam_boards FOR SELECT USING (true);
CREATE POLICY "public_read_subjects"    ON subjects     FOR SELECT USING (is_published = true OR auth.uid() IS NOT NULL);
CREATE POLICY "public_read_topics"      ON topics       FOR SELECT USING (true);
CREATE POLICY "public_read_notes"       ON notes        FOR SELECT USING (true);
CREATE POLICY "public_read_questions"   ON questions    FOR SELECT USING (true);
CREATE POLICY "public_read_past_papers" ON past_papers  FOR SELECT USING (true);
CREATE POLICY "public_read_mock_exams"  ON mock_exams   FOR SELECT USING (true);

-- 用户私有
CREATE POLICY "user_read_own_profile" ON profiles  FOR SELECT    USING (auth.uid() = id);
CREATE POLICY "user_update_own_profile" ON profiles FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "user_read_own_purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- Storage bucket (真题 & 模拟卷文件)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('papers', 'papers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_papers" ON storage.objects
  FOR SELECT USING (bucket_id = 'papers');

CREATE POLICY "auth_upload_papers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'papers' AND auth.role() = 'authenticated');
