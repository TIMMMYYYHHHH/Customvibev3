-- Auxiliary evidence only. Original receipts remain authoritative. No backfill.
ALTER TABLE submissions ADD COLUMN order_id TEXT;
CREATE UNIQUE INDEX submissions_order_link ON submissions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX submissions_owner_provider ON submissions(owner_provider_id) WHERE owner_provider_id IS NOT NULL;
CREATE INDEX submissions_receipt_provider ON submissions(receipt_provider_id) WHERE receipt_provider_id IS NOT NULL;
CREATE INDEX order_attempt_provider ON order_update_attempts(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE VIEW mail_delivery_sources AS
 SELECT 'owner-notification' purpose,id reference,reservation attempt,owner_provider_id provider_id,owner_accepted_at accepted_at,expires expires_at,order_id FROM submissions WHERE kind='order' AND owner_sent=1 AND owner_provider_id IS NOT NULL AND owner_accepted_at IS NOT NULL
 UNION ALL SELECT 'customer-receipt',id,reservation,receipt_provider_id,receipt_accepted_at,expires,order_id FROM submissions WHERE kind='order' AND receipt_sent=1 AND receipt_provider_id IS NOT NULL AND receipt_accepted_at IS NOT NULL
 UNION ALL SELECT 'manual-update',a.order_id,a.attempt,a.provider_message_id,a.accepted_at,coalesce(o.artwork_expires,o.expires),a.order_id FROM order_update_attempts a JOIN orders o ON o.id=a.order_id WHERE a.state='accepted' AND a.provider_message_id IS NOT NULL AND a.accepted_at IS NOT NULL AND o.expires>unixepoch();
CREATE TABLE mail_delivery_state (
 id TEXT PRIMARY KEY, purpose TEXT NOT NULL CHECK(purpose IN ('owner-notification','customer-receipt','manual-update')),
 reference TEXT NOT NULL,attempt TEXT NOT NULL,provider_id TEXT NOT NULL,accepted_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 order_id TEXT,recipient_count INTEGER NOT NULL CHECK(recipient_count=1),recipient_digest TEXT NOT NULL CHECK(length(recipient_digest)=64 AND recipient_digest NOT GLOB '*[^a-f0-9]*'),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),snapshot TEXT CHECK(snapshot IS NULL OR (json_valid(snapshot) AND length(snapshot)<=32768)),write_token TEXT,
 UNIQUE(purpose,reference,attempt)
);
CREATE INDEX mail_delivery_state_expiry ON mail_delivery_state(expires_at);
CREATE INDEX mail_delivery_state_order ON mail_delivery_state(order_id);
CREATE TABLE mail_delivery_events (
 event_id TEXT PRIMARY KEY,state_id TEXT NOT NULL REFERENCES mail_delivery_state(id) ON DELETE CASCADE,
 type TEXT NOT NULL,occurred_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
);
CREATE INDEX mail_delivery_events_expiry ON mail_delivery_events(expires_at);
CREATE INDEX mail_delivery_events_state ON mail_delivery_events(state_id);
-- A stateless assertion surface lets a final failed SQL guard abort the whole D1 batch.
CREATE VIEW mail_delivery_assert AS SELECT 1 AS ok WHERE 0;
CREATE TRIGGER mail_delivery_assert_guard INSTEAD OF INSERT ON mail_delivery_assert BEGIN
 SELECT CASE WHEN NEW.ok IS NOT 1 THEN RAISE(ABORT,'mail delivery guard') END;
END;
CREATE TRIGGER mail_delivery_delete AFTER DELETE ON mail_delivery_state BEGIN DELETE FROM mail_delivery_events WHERE state_id=OLD.id; END;
CREATE TRIGGER mail_delivery_submission_delete AFTER DELETE ON submissions BEGIN DELETE FROM mail_delivery_state WHERE reference=OLD.id AND purpose IN ('owner-notification','customer-receipt'); END;
CREATE TRIGGER mail_delivery_submission_scrub AFTER UPDATE OF owner_provider_id,receipt_provider_id,owner_accepted_at,receipt_accepted_at ON submissions BEGIN
 DELETE FROM mail_delivery_state WHERE reference=OLD.id AND ((purpose='owner-notification' AND (provider_id IS NOT NEW.owner_provider_id OR accepted_at IS NOT NEW.owner_accepted_at)) OR (purpose='customer-receipt' AND (provider_id IS NOT NEW.receipt_provider_id OR accepted_at IS NOT NEW.receipt_accepted_at)));
END;
CREATE TRIGGER mail_delivery_attempt_delete AFTER DELETE ON order_update_attempts BEGIN DELETE FROM mail_delivery_state WHERE purpose='manual-update' AND attempt=OLD.attempt; END;
CREATE TRIGGER mail_delivery_attempt_scrub AFTER UPDATE OF provider_message_id,accepted_at,state ON order_update_attempts BEGIN DELETE FROM mail_delivery_state WHERE purpose='manual-update' AND attempt=OLD.attempt AND (provider_id IS NOT NEW.provider_message_id OR accepted_at IS NOT NEW.accepted_at OR NEW.state<>'accepted'); END;
CREATE TRIGGER mail_delivery_order_delete AFTER DELETE ON orders BEGIN DELETE FROM mail_delivery_state WHERE order_id=OLD.id; END;
CREATE TRIGGER mail_delivery_link_immutable BEFORE UPDATE OF order_id ON submissions WHEN OLD.order_id IS NOT NULL AND NEW.order_id IS NOT OLD.order_id BEGIN SELECT RAISE(ABORT,'immutable order association'); END;
CREATE TRIGGER mail_delivery_initial_expiry BEFORE INSERT ON mail_delivery_state WHEN NEW.expires_at<=unixepoch() BEGIN SELECT RAISE(ABORT,'original mail expiry'); END;
