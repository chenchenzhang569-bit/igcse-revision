-- 002_add_topic_id.sql
-- 给 past_papers 加 topic_id 列，支持按主题分类

-- 1. 添加列
ALTER TABLE past_papers 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_past_papers_topic_id ON past_papers(topic_id);

-- 3. 将已有主题PDF关联到对应topic（通过URL路径中的slug匹配）
UPDATE past_papers pp
SET topic_id = t.id
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE pp.file_url LIKE '%/topics/' || t.slug || '/%'
  AND pp.topic_id IS NULL;
