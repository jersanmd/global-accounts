-- 00018_crypto_payments.sql
-- Add cryptocurrency payment support (USDC via direct wallet transfer)

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'crypto'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS crypto_tx_hash TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS crypto_currency TEXT DEFAULT 'USDC';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS crypto_network TEXT DEFAULT 'ethereum';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crypto_wallet_address TEXT;
ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_tx_crypto_hash ON transactions(crypto_tx_hash) WHERE crypto_tx_hash IS NOT NULL;
