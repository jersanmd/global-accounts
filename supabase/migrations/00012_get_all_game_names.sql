-- 00012_get_all_game_names.sql
-- RPC: returns all unique game names ever used (bypasses listings RLS)
-- Used by CreateListing form to suggest games even after all listings are sold

CREATE OR REPLACE FUNCTION get_all_game_names()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT game ORDER BY game)
  INTO result
  FROM listings;
  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$;
