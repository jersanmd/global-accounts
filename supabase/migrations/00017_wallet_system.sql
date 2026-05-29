-- 00017_wallet_system.sql
-- Secure wallet with per-transaction withdrawal tracking

-- Wallets table: one row per user
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance_available DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger: immutable audit trail
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  transaction_id UUID REFERENCES transactions(id),
  type TEXT NOT NULL CHECK (type IN ('escrow_release', 'withdrawal', 'fee', 'refund')),
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT,
  withdrawn BOOLEAN DEFAULT false,
  withdrawal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_withdrawable 
  ON wallet_ledger(user_id, type, withdrawn) 
  WHERE type IN ('escrow_release') AND withdrawn = false;

-- Trigger: auto-create wallet
CREATE OR REPLACE FUNCTION create_wallet_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet ON profiles;
CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_profile();

-- Seed existing profiles
INSERT INTO wallets (user_id)
SELECT id FROM profiles WHERE id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin sees all wallets" ON wallets FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "User sees own ledger" ON wallet_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin sees all ledger" ON wallet_ledger FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RPC: Release escrow to seller wallet
CREATE OR REPLACE FUNCTION wallet_release_escrow(p_user_id UUID, p_amount DECIMAL, p_tx_id UUID, p_desc TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_balance DECIMAL;
BEGIN
  UPDATE wallets SET balance_available = balance_available + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance_available INTO v_balance;

  INSERT INTO wallet_ledger (user_id, transaction_id, type, amount, balance_after, description)
  VALUES (p_user_id, p_tx_id, 'escrow_release', p_amount, v_balance, p_desc);
END;
$$;

-- RPC: Mark ledger entries as withdrawn
CREATE OR REPLACE FUNCTION wallet_mark_withdrawn(
  p_user_id UUID, p_ledger_ids UUID[], p_method TEXT DEFAULT 'bank'
) RETURNS DECIMAL LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total DECIMAL := 0;
  v_batch_id UUID := gen_random_uuid();
  v_entry RECORD;
  v_balance DECIMAL;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR v_entry IN 
    SELECT id, amount FROM wallet_ledger 
    WHERE id = ANY(p_ledger_ids) 
      AND user_id = p_user_id 
      AND type = 'escrow_release' 
      AND withdrawn = false
    FOR UPDATE
  LOOP
    UPDATE wallet_ledger SET withdrawn = true, withdrawal_id = v_batch_id
    WHERE id = v_entry.id;
    v_total := v_total + v_entry.amount;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No valid entries to withdraw';
  END IF;

  UPDATE wallets SET balance_available = balance_available - v_total, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance_available INTO v_balance;

  INSERT INTO wallet_ledger (user_id, type, amount, balance_after, description, withdrawal_id)
  VALUES (p_user_id, 'withdrawal', -v_total, v_balance, 'Withdrawal via ' || p_method, v_batch_id);

  RETURN v_total;
END;
$$;

-- RPC: Get withdrawable transactions for a seller
CREATE OR REPLACE FUNCTION get_withdrawable_entries(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'ledger_id', wl.id,
    'transaction_id', wl.transaction_id,
    'amount', wl.amount,
    'date', wl.created_at,
    'game', l.game,
    'title', l.title,
    'platform', l.platform
  ) ORDER BY wl.created_at ASC)
  INTO result
  FROM wallet_ledger wl
  LEFT JOIN transactions t ON t.id = wl.transaction_id
  LEFT JOIN listings l ON l.id = t.listing_id
  WHERE wl.user_id = p_user_id 
    AND wl.type = 'escrow_release' 
    AND wl.withdrawn = false;

  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- RPC: Get withdrawal history grouped by batch
CREATE OR REPLACE FUNCTION get_withdrawal_history(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'batch_id', sub.withdrawal_id,
      'date', sub.created_at,
      'amount', sub.amount,
      'method', sub.method,
      'sales', sub.sales
    ) ORDER BY sub.created_at DESC
  )
  INTO result
  FROM (
    SELECT 
      wl.withdrawal_id,
      wl.created_at,
      -wl.amount AS amount,
      REPLACE(wl.description, 'Withdrawal via ', '') AS method,
      (
        SELECT jsonb_agg(jsonb_build_object(
          'game', COALESCE(l2.title, l2.game, 'Sale'),
          'amount', e.amount,
          'date', e.created_at
        ) ORDER BY e.created_at ASC)
        FROM wallet_ledger e
        LEFT JOIN transactions t2 ON t2.id = e.transaction_id
        LEFT JOIN listings l2 ON l2.id = t2.listing_id
        WHERE e.withdrawal_id = wl.withdrawal_id AND e.type = 'escrow_release' AND e.withdrawn = true
      ) AS sales
    FROM wallet_ledger wl
    WHERE wl.user_id = p_user_id AND wl.type = 'withdrawal'
  ) sub
  WHERE sub.sales IS NOT NULL;

  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;
