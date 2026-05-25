-- ============================================================
-- Fix: Enable RLS on all tables missing it
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/aondldqwwvttwpervrfq/sql/new
-- ============================================================

-- 1. subtopics (missing from 003_subtopics.sql)
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_subtopics" ON subtopics FOR SELECT USING (true);

-- 2. active_sessions (missing from 002_active_sessions.sql)
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_sessions" ON active_sessions FOR ALL USING (auth.uid() = user_id);

-- 3. mock_exam_sets
ALTER TABLE mock_exam_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_mock_exam_sets" ON mock_exam_sets FOR SELECT USING (true);

-- 4. mock_exam_papers
ALTER TABLE mock_exam_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_mock_exam_papers" ON mock_exam_papers FOR SELECT USING (true);

-- 5. mock_exam_questions
ALTER TABLE mock_exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_mock_exam_questions" ON mock_exam_questions FOR SELECT USING (true);

-- 6. error_reports
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_write_error_reports" ON error_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_error_reports" ON error_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 7. user_bookmarks
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- 8. user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_roles" ON user_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "user_read_own_role" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- 9. notes-pdfs
ALTER TABLE "notes-pdfs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_notes_pdfs" ON "notes-pdfs" FOR SELECT USING (true);
