-- Migration: Extend user_bookmarks to support mock_exam questions
-- Run in Supabase SQL Editor

-- 1. Make question_id nullable (allow mock_exam-only bookmarks)
ALTER TABLE user_bookmarks ALTER COLUMN question_id DROP NOT NULL;

-- 2. Add mock_exam_question_id
ALTER TABLE user_bookmarks ADD COLUMN IF NOT EXISTS mock_exam_question_id UUID 
  REFERENCES mock_exam_questions(id) ON DELETE CASCADE;

-- 3. Drop old unique constraint (depends on NOT NULL question_id)
ALTER TABLE user_bookmarks DROP CONSTRAINT IF EXISTS user_bookmarks_user_id_question_id_key;

-- 4. Create partial unique indexes (one constraint per source type)
DROP INDEX IF EXISTS bm_unique_question;
CREATE UNIQUE INDEX bm_unique_question ON user_bookmarks(user_id, question_id) 
  WHERE question_id IS NOT NULL;

DROP INDEX IF EXISTS bm_unique_mock_exam;
CREATE UNIQUE INDEX bm_unique_mock_exam ON user_bookmarks(user_id, mock_exam_question_id) 
  WHERE mock_exam_question_id IS NOT NULL;
