-- Add last_seen_at to profiles for online presence
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- RLS: allow users to update their own last_seen_at
CREATE POLICY "Users can update own last_seen_at"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
