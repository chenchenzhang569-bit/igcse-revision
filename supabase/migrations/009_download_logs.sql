-- Create download_logs table for monitoring user downloads
CREATE TABLE IF NOT EXISTS public.download_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subject_id uuid REFERENCES public.subjects(id),
  file_type text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Index for per-user query (admin panel, rate limiting)
CREATE INDEX IF NOT EXISTS idx_download_logs_user_time ON public.download_logs(user_id, created_at DESC);
-- Index for time-based queries (recent downloads, anomaly detection)
CREATE INDEX IF NOT EXISTS idx_download_logs_time ON public.download_logs(created_at DESC);
