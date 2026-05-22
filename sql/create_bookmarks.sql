-- Run this in Supabase SQL Editor:
-- https://aondldqwwvttwpervrfq.supabase.co → SQL Editor

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_bookmarks" ON user_bookmarks 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_bookmarks" ON user_bookmarks 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_bookmarks" ON user_bookmarks 
  FOR DELETE USING (auth.uid() = user_id);
