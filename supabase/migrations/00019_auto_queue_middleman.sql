-- 00019_auto_queue_middleman.sql
-- Automatically add/remove middlemen from queue when role changes

CREATE OR REPLACE FUNCTION sync_middleman_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'middleman' AND NEW.kyc_status = 'approved' THEN
    -- Add to queue if not already there
    INSERT INTO middleman_queue (middleman_id) VALUES (NEW.id)
    ON CONFLICT (middleman_id) DO NOTHING;
  ELSE
    -- Remove from queue if role changed away from middleman or KYC revoked
    DELETE FROM middleman_queue WHERE middleman_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_middleman_queue ON profiles;
CREATE TRIGGER trg_sync_middleman_queue
  AFTER UPDATE OF role, kyc_status ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_middleman_queue();
