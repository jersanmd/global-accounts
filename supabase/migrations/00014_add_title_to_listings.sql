-- 00014_add_title_to_listings.sql
-- Adds custom title field so sellers can write descriptive titles

ALTER TABLE listings ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN listings.title IS 'Custom listing title. Falls back to game name if null.';
