-- Create analytics_views table for atomic pageview tracking
CREATE TABLE IF NOT EXISTS public.analytics_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  tab TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(path, date, tab)
);

-- RPC function for atomic increment (方案2: 避免读→改→写竞态条件)
CREATE OR REPLACE FUNCTION public.increment_page_view(
  p_path TEXT,
  p_date DATE DEFAULT CURRENT_DATE,
  p_tab TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.analytics_views (path, tab, date, count)
  VALUES (p_path, p_tab, p_date, 1)
  ON CONFLICT (path, date, tab)
  DO UPDATE SET count = public.analytics_views.count + 1,
                updated_at = now()
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;
