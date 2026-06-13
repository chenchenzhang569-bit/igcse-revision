-- Create subject_stats table for fast subject card display
-- Populated by a periodic cron script (counts DB + R2)
CREATE TABLE IF NOT EXISTS subject_stats (
  subject_id UUID PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
  past_papers INTEGER NOT NULL DEFAULT 0,
  notes INTEGER NOT NULL DEFAULT 0,
  questions INTEGER NOT NULL DEFAULT 0,
  mock_exams INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow public read (anon key)
ALTER TABLE subject_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_subject_stats" ON subject_stats
  FOR SELECT USING (true);
