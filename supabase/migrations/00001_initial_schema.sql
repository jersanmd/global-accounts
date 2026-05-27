-- Global Account MVP — Initial Database Schema
-- Run this in Supabase SQL Editor or via `supabase db push`

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ─── Profiles (extends auth.users) ───
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'middleman', 'admin')) DEFAULT 'buyer',
  kyc_status TEXT NOT NULL CHECK (kyc_status IN ('not_verified', 'pending', 'approved', 'rejected')) DEFAULT 'not_verified',
  discord_id TEXT,
  discord_username TEXT,
  stripe_account_id TEXT,
  avg_rating DECIMAL(2,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'buyer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Listings ───
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  game TEXT NOT NULL,
  platform TEXT NOT NULL,
  rank TEXT NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
  inventory_summary TEXT NOT NULL DEFAULT '',
  risk_rating TEXT NOT NULL CHECK (risk_rating IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('active', 'sold', 'cancelled')) DEFAULT 'active',
  screenshots_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_game ON listings(game);
CREATE INDEX idx_listings_price ON listings(price_usd);

-- RLS: anyone can view active listings; only seller can modify their own
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Seller can insert listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Seller can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Seller can delete own active listings"
  ON listings FOR DELETE
  USING (auth.uid() = seller_id AND status = 'active');

-- ─── Transactions ───
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  middleman_id UUID REFERENCES profiles(id),
  stripe_payment_intent_id TEXT,
  amount_usd DECIMAL(10,2) NOT NULL CHECK (amount_usd > 0),
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  discord_channel_id TEXT,
  demo_approved BOOLEAN NOT NULL DEFAULT false,
  transfer_witnessed BOOLEAN NOT NULL DEFAULT false,
  funds_released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_middleman ON transactions(middleman_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Seller can view transactions on their listings"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = transactions.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Middleman can view assigned transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = middleman_id);

CREATE POLICY "Admin can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ─── Credentials (encrypted) ───
CREATE TABLE IF NOT EXISTS credentials (
  transaction_id UUID PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No direct RLS — only Edge Functions (service_role) access this table

-- ─── Payments ───
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  stripe_transfer_id TEXT,
  amount_usd DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'transfer', 'refund')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Reviews ───
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  target_id UUID NOT NULL REFERENCES profiles(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, reviewer_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Participants can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = reviews.transaction_id
      AND transactions.status = 'completed'
      AND (transactions.buyer_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM listings
             WHERE listings.id = transactions.listing_id
             AND listings.seller_id = auth.uid()
           ))
    )
  );

-- ─── Middleman Queue (round-robin) ───
CREATE TABLE IF NOT EXISTS middleman_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  middleman_id UUID NOT NULL REFERENCES profiles(id),
  last_assigned_at TIMESTAMPTZ DEFAULT '1970-01-01'
);

-- ─── Updated_at trigger ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RPC: Round-robin middleman assignment ───
CREATE OR REPLACE FUNCTION assign_middleman(tx_id UUID)
RETURNS UUID AS $$
DECLARE
  mm_id UUID;
BEGIN
  -- Pick least-recently-assigned middleman
  SELECT mq.middleman_id INTO mm_id
  FROM middleman_queue mq
  JOIN profiles p ON p.id = mq.middleman_id
  WHERE p.role = 'middleman' AND p.kyc_status = 'approved'
  ORDER BY mq.last_assigned_at ASC NULLS FIRST
  LIMIT 1;

  IF mm_id IS NULL THEN
    RAISE EXCEPTION 'No available middlemen in queue';
  END IF;

  -- Update transaction
  UPDATE transactions
  SET middleman_id = mm_id, status = 'mm_assigned'
  WHERE id = tx_id;

  -- Update queue
  UPDATE middleman_queue
  SET last_assigned_at = now()
  WHERE middleman_id = mm_id;

  RETURN mm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Get available middlemen count ───
CREATE OR REPLACE FUNCTION get_available_middlemen()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM middleman_queue mq
    JOIN profiles p ON p.id = mq.middleman_id
    WHERE p.role = 'middleman' AND p.kyc_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Storage bucket for screenshots ───
-- Note: Create this via Supabase dashboard or use the storage API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listing-screenshots', 'listing-screenshots', true);

-- ─── Profiles RLS ───
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
