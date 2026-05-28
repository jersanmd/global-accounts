-- 00005_add_transaction_history.sql
-- Tracks every status change on transactions for audit trail

CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_history_transaction ON transaction_history(transaction_id);
CREATE INDEX idx_tx_history_created ON transaction_history(created_at DESC);

-- RLS: participants + admin can view history
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins can view history"
  ON transaction_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      LEFT JOIN listings l ON l.id = t.listing_id
      WHERE t.id = transaction_history.transaction_id
      AND (
        auth.uid() = t.buyer_id
        OR auth.uid() = t.middleman_id
        OR auth.uid() = l.seller_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- Trigger: log status changes to history
CREATE OR REPLACE FUNCTION log_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO transaction_history (transaction_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'Transaction created');
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO transaction_history (transaction_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transaction_history ON transactions;
CREATE TRIGGER trg_transaction_history
  AFTER INSERT OR UPDATE OF status ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_change();
