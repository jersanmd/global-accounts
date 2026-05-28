-- 00010_get_transactions_with_listings.sql
-- RPC: returns transactions with listing data, bypasses RLS via SECURITY DEFINER

CREATE OR REPLACE FUNCTION get_transactions_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'listing_id', t.listing_id,
      'buyer_id', t.buyer_id,
      'middleman_id', t.middleman_id,
      'amount_usd', t.amount_usd,
      'status', t.status,
      'discord_channel_id', t.discord_channel_id,
      'demo_approved', t.demo_approved,
      'transfer_witnessed', t.transfer_witnessed,
      'funds_released', t.funds_released,
      'stripe_payment_intent_id', t.stripe_payment_intent_id,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'listing', CASE WHEN l.id IS NOT NULL THEN jsonb_build_object(
        'id', l.id, 'game', l.game, 'platform', l.platform,
        'rank', l.rank, 'price_usd', l.price_usd, 'status', l.status,
        'seller', jsonb_build_object(
          'id', ps.id, 'email', ps.email, 'discord_username', ps.discord_username,
          'discord_id', ps.discord_id, 'role', ps.role
        )
      ) ELSE NULL END,
      'buyer', jsonb_build_object(
        'id', pb.id, 'email', pb.email, 'discord_username', pb.discord_username,
        'discord_id', pb.discord_id, 'role', pb.role
      ),
      'middleman', CASE WHEN pm.id IS NOT NULL THEN jsonb_build_object(
        'id', pm.id, 'email', pm.email, 'discord_username', pm.discord_username,
        'discord_id', pm.discord_id, 'role', pm.role
      ) ELSE NULL END
    )
    ORDER BY t.created_at DESC
  )
  INTO result
  FROM transactions t
  LEFT JOIN listings l ON l.id = t.listing_id
  LEFT JOIN profiles pb ON pb.id = t.buyer_id
  LEFT JOIN profiles pm ON pm.id = t.middleman_id
  LEFT JOIN profiles ps ON ps.id = l.seller_id
  WHERE t.buyer_id = p_user_id OR t.middleman_id = p_user_id OR l.seller_id = p_user_id;

  RETURN result;
END;
$$;
