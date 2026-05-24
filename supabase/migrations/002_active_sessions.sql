-- Plan B: Multi-session device tracking
-- Allow up to 3 concurrent sessions per user

CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  device_token text NOT NULL DEFAULT gen_random_uuid()::text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_active ON active_sessions(last_active);

-- Cleanup: remove sessions inactive for 24 hours
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM active_sessions
  WHERE last_active < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;
