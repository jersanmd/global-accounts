-- 00009_get_listing_for_participant.sql
-- RPC: fetches listing + seller if caller is involved in its transaction

CREATE OR REPLACE FUNCTION get_listing_for_participant(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', l.id,
    'seller_id', l.seller_id,
    'game', l.game,
    'platform', l.platform,
    'rank', l.rank,
    'price_usd', l.price_usd,
    'inventory_summary', l.inventory_summary,
    'risk_rating', l.risk_rating,
    'status', l.status,
    'listing_type', l.listing_type,
    'disabled', COALESCE(l.disabled, false),
    'title', l.title,
    'stock', l.stock,
    'screenshots_urls', l.screenshots_urls,
    'created_at', l.created_at,
    'seller', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'discord_username', p.discord_username,
      'discord_id', p.discord_id,
      'role', p.role,
      'kyc_status', p.kyc_status,
      'avg_rating', p.avg_rating,
      'avatar_url', p.avatar_url
    )
  )
  INTO result
  FROM listings l
  JOIN profiles p ON p.id = l.seller_id
  WHERE l.id = p_listing_id
  AND (
    l.seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.listing_id = l.id
      AND (t.buyer_id = auth.uid() OR t.middleman_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

  RETURN result;
END;
$$;
