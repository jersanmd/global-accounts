-- 00007_add_buyer_listing_update.sql
-- Allows the buyer to mark a listing as sold when they pay

-- Drop existing policy if re-running
DROP POLICY IF EXISTS "Buyer can update listing on payment" ON listings;

-- Allow the transaction buyer to update the listing (mark as sold) when they pay
CREATE POLICY "Buyer can update listing on payment"
  ON listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.listing_id = listings.id
      AND t.buyer_id = auth.uid()
      AND t.status IN ('awaiting_payment', 'paid')
    )
  );

-- Also allow middleman to update (for their actions)
DROP POLICY IF EXISTS "Middleman can update listing in transaction" ON listings;

CREATE POLICY "Middleman can update listing in transaction"
  ON listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.listing_id = listings.id
      AND t.middleman_id = auth.uid()
    )
  );
