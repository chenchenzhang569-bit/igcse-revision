-- Payment review table for manual payment (QR code) flow
CREATE TABLE IF NOT EXISTS payment_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  amount_cny INTEGER NOT NULL DEFAULT 50,
  note TEXT,
  short_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for polling new pending reviews
CREATE INDEX IF NOT EXISTS idx_payment_reviews_pending
  ON payment_reviews(status, created_at)
  WHERE status = 'pending';
