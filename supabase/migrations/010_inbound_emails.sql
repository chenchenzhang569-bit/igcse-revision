-- inbound_emails: store emails received via Resend inbound webhook
CREATE TABLE IF NOT EXISTS inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_text TEXT,
  body_html TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  replied BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "admin_read_all" ON inbound_emails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Service role can insert
CREATE POLICY "service_insert" ON inbound_emails
  FOR INSERT WITH CHECK (true);
