-- 00006_add_discord_invites.sql
-- Maps unique Discord invite links to transactions for MM channel creation

CREATE TABLE IF NOT EXISTS discord_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE UNIQUE,
  invite_code TEXT NOT NULL UNIQUE,
  invite_url TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT,
  created_by UUID REFERENCES profiles(id),
  use_count INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discord_invites_transaction ON discord_invites(transaction_id);
CREATE INDEX idx_discord_invites_code ON discord_invites(invite_code);

-- RLS
ALTER TABLE discord_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction participants and admins can view invites"
  ON discord_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      LEFT JOIN listings l ON l.id = t.listing_id
      WHERE t.id = discord_invites.transaction_id
      AND (
        auth.uid() = t.buyer_id
        OR auth.uid() = t.middleman_id
        OR auth.uid() = l.seller_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- Store Discord bot config as a secret-like table (RLS-protected)
CREATE TABLE IF NOT EXISTS discord_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bot_token_encrypted TEXT,
  guild_id TEXT NOT NULL DEFAULT '',
  mm_role_id TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only admins can read/write config
ALTER TABLE discord_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage Discord config"
  ON discord_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert default config row if not exists
INSERT INTO discord_config (id, guild_id, mm_role_id)
VALUES (1, '', '')
ON CONFLICT (id) DO NOTHING;

-- Add discord_invite_id to transactions for quick lookup
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discord_invite_id UUID REFERENCES discord_invites(id);
