-- 00013_add_stock_to_listings.sql
-- Adds stock tracking for in-game items

ALTER TABLE listings ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;

COMMENT ON COLUMN listings.stock IS 'Stock quantity for in-game items. NULL for accounts.';
