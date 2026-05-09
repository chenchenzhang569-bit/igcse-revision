-- 003_subtopics.sql
-- 添加小主题(subtopic)层级：主主题 → 小主题 → 内容

-- 1. 创建 subtopics 表
CREATE TABLE IF NOT EXISTS subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  pmt_code TEXT,              -- e.g. "1.1", "3.2"
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_pmt_code ON subtopics(pmt_code);

-- 2. 给 past_papers, notes, questions 加 subtopic_id
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES subtopics(id);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES subtopics(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES subtopics(id);

CREATE INDEX IF NOT EXISTS idx_past_papers_subtopic_id ON past_papers(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_notes_subtopic_id ON notes(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_questions_subtopic_id ON questions(subtopic_id);
