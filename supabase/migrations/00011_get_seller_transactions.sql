-- 00011_get_seller_transactions.sql
-- RPCs: bypass RLS via SECURITY DEFINER for seller dashboard & transaction view

-- Get all transactions for a seller
CREATE OR REPLACE FUNCTION get_seller_transactions(p_seller_id UUID)
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
      'listing', jsonb_build_object(
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
        'screenshots_urls', l.screenshots_urls,
        'created_at', l.created_at,
        'seller', jsonb_build_object(
          'id', ps.id,
          'email', ps.email,
          'discord_username', ps.discord_username,
          'discord_id', ps.discord_id,
          'role', ps.role,
          'kyc_status', ps.kyc_status,
          'avg_rating', ps.avg_rating,
          'avatar_url', ps.avatar_url
        )
      ),
      'buyer', jsonb_build_object(
        'id', pb.id,
        'email', pb.email,
        'discord_username', pb.discord_username,
        'discord_id', pb.discord_id,
        'role', pb.role
      ),
      'middleman', CASE WHEN pm.id IS NOT NULL THEN jsonb_build_object(
        'id', pm.id,
        'email', pm.email,
        'discord_username', pm.discord_username,
        'discord_id', pm.discord_id,
        'role', pm.role
      ) ELSE NULL END
    )
    ORDER BY t.created_at DESC
  )
  INTO result
  FROM transactions t
  JOIN listings l ON l.id = t.listing_id AND l.seller_id = p_seller_id
  LEFT JOIN profiles pb ON pb.id = t.buyer_id
  LEFT JOIN profiles pm ON pm.id = t.middleman_id
  LEFT JOIN profiles ps ON ps.id = l.seller_id;

  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- Get a single transaction by ID (bypasses all RLS)
CREATE OR REPLACE FUNCTION get_transaction_by_id(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
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
    'listing', jsonb_build_object(
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
      'screenshots_urls', l.screenshots_urls,
      'created_at', l.created_at,
      'seller', jsonb_build_object(
        'id', ps.id, 'email', ps.email,
        'discord_username', ps.discord_username,
        'discord_id', ps.discord_id, 'role', ps.role,
        'kyc_status', ps.kyc_status, 'avg_rating', ps.avg_rating,
        'avatar_url', ps.avatar_url
      )
    ),
    'buyer', jsonb_build_object(
      'id', pb.id, 'email', pb.email,
      'discord_username', pb.discord_username,
      'discord_id', pb.discord_id, 'role', pb.role
    ),
    'middleman', CASE WHEN pm.id IS NOT NULL THEN jsonb_build_object(
      'id', pm.id, 'email', pm.email,
      'discord_username', pm.discord_username,
      'discord_id', pm.discord_id, 'role', pm.role
    ) ELSE NULL END
  )
  INTO result
  FROM transactions t
  LEFT JOIN listings l ON l.id = t.listing_id
  LEFT JOIN profiles pb ON pb.id = t.buyer_id
  LEFT JOIN profiles pm ON pm.id = t.middleman_id
  LEFT JOIN profiles ps ON ps.id = l.seller_id
  WHERE t.id = p_transaction_id;

  RETURN result;
END;
$$;
