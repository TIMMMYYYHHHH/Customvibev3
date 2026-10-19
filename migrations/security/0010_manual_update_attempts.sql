-- Preserve the per-version summary for older workers; keep every reservation separately.
-- Historical failures are intentionally not classified as definitive rejections.
CREATE TABLE order_update_attempts (
 attempt TEXT PRIMARY KEY,
 order_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL,
 state TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL,
 rejected INTEGER NOT NULL DEFAULT 0,
 preview_hash TEXT, preview_until INTEGER
);
CREATE INDEX order_update_attempts_order ON order_update_attempts(order_id,version);
INSERT INTO order_update_attempts(attempt,order_id,version,status,state,created,updated)
 SELECT reservation,order_id,version,status,state,created,updated FROM order_updates;
CREATE TRIGGER order_update_attempt_insert AFTER INSERT ON order_updates BEGIN
 INSERT INTO order_update_attempts(attempt,order_id,version,status,state,created,updated)
 VALUES(NEW.reservation,NEW.order_id,NEW.version,NEW.status,NEW.state,NEW.created,NEW.updated);
END;
CREATE TRIGGER order_update_attempt_change AFTER UPDATE ON order_updates BEGIN
 INSERT INTO order_update_attempts(attempt,order_id,version,status,state,created,updated)
 VALUES(NEW.reservation,NEW.order_id,NEW.version,NEW.status,NEW.state,NEW.created,NEW.updated)
 ON CONFLICT(attempt) DO UPDATE SET state=excluded.state,updated=excluded.updated;
END;
-- Older cleanup workers delete the summary, so keep their expiry path compatible too.
CREATE TRIGGER order_update_attempt_delete AFTER DELETE ON order_updates BEGIN
 DELETE FROM order_update_attempts WHERE order_id=OLD.order_id AND version=OLD.version;
END;
