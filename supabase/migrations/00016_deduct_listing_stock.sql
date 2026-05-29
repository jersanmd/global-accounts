-- 00016_deduct_listing_stock.sql
-- RPC: deducts stock from a listing and auto-disables when stock hits 0

CREATE OR REPLACE FUNCTION deduct_listing_stock(p_listing_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  SELECT stock INTO v_stock FROM listings WHERE id = p_listing_id;
  
  IF v_stock IS NOT NULL AND v_stock > 0 THEN
    UPDATE listings
    SET stock = GREATEST(0, v_stock - p_quantity),
        disabled = CASE WHEN v_stock - p_quantity <= 0 THEN true ELSE disabled END
    WHERE id = p_listing_id;
  END IF;
END;
$$;
