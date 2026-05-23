-- Add INSERT + UPDATE policies for purchases table
-- Required for Alipay payment flow

CREATE POLICY "user_insert_own_purchases" ON purchases 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_purchases" ON purchases 
  FOR UPDATE USING (auth.uid() = user_id);

-- Also allow service_role full access (bypass RLS)
-- No policy needed — service_role bypasses RLS by default
