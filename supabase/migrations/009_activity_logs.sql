-- Create activity_logs table for monitoring user behavior (viewing + downloading)
-- Helps detect scraping/anomalous usage
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subject_id uuid REFERENCES public.subjects(id),
  activity_type text NOT NULL DEFAULT '',
  -- 'download:note', 'download:past_paper', 'view:structured', 'view:mcq', 'bookmark'
  detail text NOT NULL DEFAULT '',
  -- e.g. topic name, subtopic name, file name
  page_url text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Per-user chronological queries (admin panel, rate limiting)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON public.activity_logs(user_id, created_at DESC);
-- Time-based queries (recent activity, anomaly detection)
CREATE INDEX IF NOT EXISTS idx_activity_logs_time ON public.activity_logs(created_at DESC);
-- Activity type queries (counting views vs downloads)
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(activity_type);
