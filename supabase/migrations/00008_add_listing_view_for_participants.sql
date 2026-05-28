-- 00008_add_listing_view_for_participants.sql
-- Allows transaction participants to view sold/disabled listings

DROP POLICY IF EXISTS "Participants can view transaction listing" ON listings;

CREATE POLICY "Participants can view transaction listing"
  ON listings FOR SELECT
  USING (
    -- Original: anyone can view active non-disabled listings
    (status = 'active' AND (disabled IS NULL OR disabled = false))
    OR
    -- Transaction participants and admins can always view
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.listing_id = listings.id
      AND (
        auth.uid() = t.buyer_id
        OR auth.uid() = t.middleman_id
        OR auth.uid() = listings.seller_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );
