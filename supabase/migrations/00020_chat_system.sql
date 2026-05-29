-- 00020_chat_system.sql
-- In-app chat: DMs + transaction group chats

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_parts_user ON conversation_participants(user_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid())
  );

CREATE POLICY "Participants can view participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversation_participants.conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );

-- RPC: create or get direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN conversations c ON c.id = cp1.conversation_id
  WHERE cp1.user_id = user_a AND cp2.user_id = user_b AND c.type = 'direct';

  IF conv_id IS NULL THEN
    INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user_a), (conv_id, user_b);
  END IF;

  RETURN conv_id;
END;
$$;

-- RPC: create transaction group chat (middleman only)
CREATE OR REPLACE FUNCTION create_transaction_group(tx_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
  mid UUID;
  bid UUID;
  sid UUID;
BEGIN
  SELECT t.middleman_id, t.buyer_id, l.seller_id
  INTO mid, bid, sid
  FROM transactions t
  JOIN listings l ON l.id = t.listing_id
  WHERE t.id = tx_id;

  IF mid IS NULL OR bid IS NULL OR sid IS NULL THEN
    RAISE EXCEPTION 'Transaction participants not complete';
  END IF;

  IF auth.uid() != mid THEN
    RAISE EXCEPTION 'Only middleman can create group chat';
  END IF;

  SELECT id INTO conv_id FROM conversations WHERE transaction_id = tx_id AND type = 'group';
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO conversations (type, title, transaction_id)
  VALUES ('group', (SELECT game FROM listings WHERE id = (SELECT listing_id FROM transactions WHERE id = tx_id)) || ' Transaction', tx_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, mid), (conv_id, bid), (conv_id, sid);

  RETURN conv_id;
END;
$$;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
