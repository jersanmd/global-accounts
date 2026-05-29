-- 00015_add_quantity_to_transactions.sql
-- Tracks how many items were purchased in the transaction

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

COMMENT ON COLUMN transactions.quantity IS 'Number of items purchased (for in-game items with stock)';
