-- ============================================================
-- Security: Session tracking + Abuse detection + Bans
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Active sessions (max 3 per user)
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  fingerprint text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- 2. Security audit log
CREATE TABLE IF NOT EXISTS user_security_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  event_type text NOT NULL,  -- 'login', 'session_limit', 'ip_switch', 'warning', 'banned', 'unbanned'
  ip_address text,
  fingerprint text,
  detail text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_user ON user_security_log(user_id);

-- 3. Ban list
CREATE TABLE IF NOT EXISTS user_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  banned_at timestamptz DEFAULT now(),
  banned_until timestamptz NOT NULL,
  reason text DEFAULT 'Account sharing detected'
);
