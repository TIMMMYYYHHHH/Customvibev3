-- Separate present contact from the immutable checkout snapshot and stage/send identity.
ALTER TABLE orders ADD COLUMN current_contact TEXT CHECK(current_contact IS NULL OR json_valid(current_contact));
ALTER TABLE orders ADD COLUMN contact_revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX privacy_order_fingerprint ON orders(fingerprint);
CREATE TABLE order_privacy_generations(order_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0);
INSERT INTO order_privacy_generations(order_id) SELECT id FROM orders;
CREATE TRIGGER privacy_generation_create AFTER INSERT ON orders BEGIN INSERT INTO order_privacy_generations(order_id) VALUES(NEW.id); END;
CREATE TRIGGER privacy_generation_delete AFTER DELETE ON orders BEGIN DELETE FROM order_privacy_generations WHERE order_id=OLD.id; END;
-- Manifests contain exact opaque keys and original clocks, never customer details.
CREATE TABLE order_privacy_operations (
 operation_id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE,
 version INTEGER NOT NULL, digest TEXT NOT NULL, confirmation_hash TEXT NOT NULL, reference TEXT,
 state TEXT NOT NULL CHECK(state IN ('erasing','complete')),
 manifest TEXT, counts TEXT, expires INTEGER NOT NULL, artwork_expires INTEGER NOT NULL
);
CREATE TABLE order_privacy_tombstones (
 kind TEXT NOT NULL CHECK(kind IN ('order','artwork','submission')),
 id TEXT NOT NULL, operation_id TEXT NOT NULL, expires INTEGER NOT NULL,
 PRIMARY KEY(kind,id)
);
CREATE INDEX order_privacy_tombstones_expiry ON order_privacy_tombstones(expires);
CREATE INDEX order_privacy_operations_expiry ON order_privacy_operations(state,expires);
CREATE TRIGGER privacy_order_graph AFTER UPDATE OF snapshot,status,version,created,expires,artwork_expires,fulfilled_at,owner_sent,receipt_sent,current_contact,contact_revision ON orders BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id=NEW.id;
END;
CREATE TRIGGER privacy_graph_order_history_insert AFTER INSERT ON order_history BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_history_update AFTER UPDATE ON order_history BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_history_delete AFTER DELETE ON order_history BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_order_updates_insert AFTER INSERT ON order_updates BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_updates_update AFTER UPDATE ON order_updates BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_updates_delete AFTER DELETE ON order_updates BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_order_update_attempts_insert AFTER INSERT ON order_update_attempts BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_update_attempts_update AFTER UPDATE ON order_update_attempts BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_update_attempts_delete AFTER DELETE ON order_update_attempts BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_proof_state_insert AFTER INSERT ON proof_state BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_state_update AFTER UPDATE ON proof_state BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_state_delete AFTER DELETE ON proof_state BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_proof_revisions_insert AFTER INSERT ON proof_revisions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_revisions_update AFTER UPDATE ON proof_revisions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_revisions_delete AFTER DELETE ON proof_revisions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_proof_sessions_insert AFTER INSERT ON proof_sessions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_sessions_update AFTER UPDATE ON proof_sessions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_sessions_delete AFTER DELETE ON proof_sessions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_proof_events_insert AFTER INSERT ON proof_events BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_events_update AFTER UPDATE ON proof_events BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_proof_events_delete AFTER DELETE ON proof_events BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_order_costs_insert AFTER INSERT ON order_costs BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_costs_update AFTER UPDATE ON order_costs BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_costs_delete AFTER DELETE ON order_costs BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_finance_changes_insert AFTER INSERT ON finance_changes BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_finance_changes_update AFTER UPDATE ON finance_changes BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_finance_changes_delete AFTER DELETE ON finance_changes BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_order_stock_use_insert AFTER INSERT ON order_stock_use BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_stock_use_update AFTER UPDATE ON order_stock_use BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id) OR (id=NEW.order_id));
END;
CREATE TRIGGER privacy_graph_order_stock_use_delete AFTER DELETE ON order_stock_use BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id));
END;
CREATE TRIGGER privacy_graph_submissions_insert AFTER INSERT ON submissions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id OR (NEW.kind='order' AND fingerprint=NEW.fingerprint)));
END;
CREATE TRIGGER privacy_graph_submissions_update AFTER UPDATE ON submissions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id OR (OLD.kind='order' AND fingerprint=OLD.fingerprint)) OR (id=NEW.order_id OR (NEW.kind='order' AND fingerprint=NEW.fingerprint)));
END;
CREATE TRIGGER privacy_graph_submissions_delete AFTER DELETE ON submissions BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id OR (OLD.kind='order' AND fingerprint=OLD.fingerprint)));
END;
CREATE TRIGGER privacy_graph_artwork_requests_insert AFTER INSERT ON artwork_requests BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.id OR id=NEW.parent_order));
END;
CREATE TRIGGER privacy_graph_artwork_requests_update AFTER UPDATE ON artwork_requests BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.id OR id=OLD.parent_order) OR (id=NEW.id OR id=NEW.parent_order));
END;
CREATE TRIGGER privacy_graph_artwork_requests_delete AFTER DELETE ON artwork_requests BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.id OR id=OLD.parent_order));
END;
CREATE TRIGGER privacy_graph_artwork_files_insert AFTER INSERT ON artwork_files BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id IN(SELECT id FROM artwork_requests WHERE id=NEW.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=NEW.request_id)));
END;
CREATE TRIGGER privacy_graph_artwork_files_update AFTER UPDATE ON artwork_files BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id IN(SELECT id FROM artwork_requests WHERE id=OLD.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=OLD.request_id)) OR (id IN(SELECT id FROM artwork_requests WHERE id=NEW.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=NEW.request_id)));
END;
CREATE TRIGGER privacy_graph_artwork_files_delete AFTER DELETE ON artwork_files BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id IN(SELECT id FROM artwork_requests WHERE id=OLD.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=OLD.request_id)));
END;
CREATE TRIGGER privacy_graph_mail_delivery_state_insert AFTER INSERT ON mail_delivery_state BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=NEW.order_id OR id=NEW.reference OR id IN(SELECT order_id FROM submissions WHERE id=NEW.reference)));
END;
CREATE TRIGGER privacy_graph_mail_delivery_state_update AFTER UPDATE ON mail_delivery_state BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id OR id=OLD.reference OR id IN(SELECT order_id FROM submissions WHERE id=OLD.reference)) OR (id=NEW.order_id OR id=NEW.reference OR id IN(SELECT order_id FROM submissions WHERE id=NEW.reference)));
END;
CREATE TRIGGER privacy_graph_mail_delivery_state_delete AFTER DELETE ON mail_delivery_state BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id=OLD.order_id OR id=OLD.reference OR id IN(SELECT order_id FROM submissions WHERE id=OLD.reference)));
END;
CREATE TRIGGER privacy_graph_mail_delivery_events_insert AFTER INSERT ON mail_delivery_events BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id IN(SELECT order_id FROM mail_delivery_state WHERE id=NEW.state_id)));
END;
CREATE TRIGGER privacy_graph_mail_delivery_events_update AFTER UPDATE ON mail_delivery_events BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id IN(SELECT order_id FROM mail_delivery_state WHERE id=OLD.state_id)) OR (id IN(SELECT order_id FROM mail_delivery_state WHERE id=NEW.state_id)));
END;
CREATE TRIGGER privacy_graph_mail_delivery_events_delete AFTER DELETE ON mail_delivery_events BEGIN
 UPDATE order_privacy_generations SET revision=revision+1 WHERE order_id IN(SELECT id FROM orders WHERE (id IN(SELECT order_id FROM mail_delivery_state WHERE id=OLD.state_id)));
END;
CREATE TRIGGER privacy_fence_order_history_insert BEFORE INSERT ON order_history WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_history_update BEFORE UPDATE ON order_history WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_updates_insert BEFORE INSERT ON order_updates WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_updates_update BEFORE UPDATE ON order_updates WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_update_attempts_insert BEFORE INSERT ON order_update_attempts WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
-- Exact original-deadline receipt and capability NULL scrubs remain available to older retention workers.
CREATE TRIGGER privacy_fence_order_update_attempts_update BEFORE UPDATE ON order_update_attempts WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) AND NOT (NEW.provider_message_id IS NULL AND NEW.accepted_at IS NULL AND NEW.attempt IS OLD.attempt AND NEW.order_id IS OLD.order_id AND NEW.version IS OLD.version AND NEW.status IS OLD.status AND NEW.state IS OLD.state AND NEW.created IS OLD.created AND NEW.updated IS OLD.updated AND NEW.rejected IS OLD.rejected AND NEW.preview_hash IS OLD.preview_hash AND NEW.preview_until IS OLD.preview_until AND EXISTS(SELECT 1 FROM orders o WHERE o.id=OLD.order_id AND coalesce(o.artwork_expires,o.expires)<=unixepoch())) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_state_insert BEFORE INSERT ON proof_state WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_state_update BEFORE UPDATE ON proof_state WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) AND NOT (NEW.token_hash IS NULL AND NEW.order_id IS OLD.order_id AND NEW.revision IS OLD.revision AND NEW.digest IS OLD.digest AND NEW.status IS OLD.status AND NEW.approved_at IS OLD.approved_at AND EXISTS(SELECT 1 FROM orders o WHERE o.id=OLD.order_id AND coalesce(o.artwork_expires,o.expires)<=unixepoch())) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_revisions_insert BEFORE INSERT ON proof_revisions WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_revisions_update BEFORE UPDATE ON proof_revisions WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_sessions_insert BEFORE INSERT ON proof_sessions WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_sessions_update BEFORE UPDATE ON proof_sessions WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_events_insert BEFORE INSERT ON proof_events WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_proof_events_update BEFORE UPDATE ON proof_events WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_costs_insert BEFORE INSERT ON order_costs WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_costs_update BEFORE UPDATE ON order_costs WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_finance_changes_insert BEFORE INSERT ON finance_changes WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_finance_changes_update BEFORE UPDATE ON finance_changes WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_stock_use_insert BEFORE INSERT ON order_stock_use WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_order_stock_use_update BEFORE UPDATE ON order_stock_use WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id) OR (id=NEW.order_id)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_submissions_insert BEFORE INSERT ON submissions WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id OR (NEW.kind='order' AND fingerprint=NEW.fingerprint))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_submissions_update BEFORE UPDATE ON submissions WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id OR (OLD.kind='order' AND fingerprint=OLD.fingerprint)) OR (id=NEW.order_id OR (NEW.kind='order' AND fingerprint=NEW.fingerprint))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_artwork_requests_insert BEFORE INSERT ON artwork_requests WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.id OR id=NEW.parent_order)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_artwork_requests_update BEFORE UPDATE ON artwork_requests WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.id OR id=OLD.parent_order) OR (id=NEW.id OR id=NEW.parent_order)) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_artwork_files_insert BEFORE INSERT ON artwork_files WHEN EXISTS(SELECT 1 FROM orders WHERE ((id IN(SELECT id FROM artwork_requests WHERE id=NEW.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=NEW.request_id))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_artwork_files_update BEFORE UPDATE ON artwork_files WHEN EXISTS(SELECT 1 FROM orders WHERE ((id IN(SELECT id FROM artwork_requests WHERE id=OLD.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=OLD.request_id)) OR (id IN(SELECT id FROM artwork_requests WHERE id=NEW.request_id UNION SELECT parent_order FROM artwork_requests WHERE id=NEW.request_id))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_mail_delivery_state_insert BEFORE INSERT ON mail_delivery_state WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=NEW.order_id OR id=NEW.reference OR id IN(SELECT order_id FROM submissions WHERE id=NEW.reference))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_mail_delivery_state_update BEFORE UPDATE ON mail_delivery_state WHEN EXISTS(SELECT 1 FROM orders WHERE ((id=OLD.order_id OR id=OLD.reference OR id IN(SELECT order_id FROM submissions WHERE id=OLD.reference)) OR (id=NEW.order_id OR id=NEW.reference OR id IN(SELECT order_id FROM submissions WHERE id=NEW.reference))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_mail_delivery_events_insert BEFORE INSERT ON mail_delivery_events WHEN EXISTS(SELECT 1 FROM orders WHERE ((id IN(SELECT order_id FROM mail_delivery_state WHERE id=NEW.state_id))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_mail_delivery_events_update BEFORE UPDATE ON mail_delivery_events WHEN EXISTS(SELECT 1 FROM orders WHERE ((id IN(SELECT order_id FROM mail_delivery_state WHERE id=OLD.state_id)) OR (id IN(SELECT order_id FROM mail_delivery_state WHERE id=NEW.state_id))) AND EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_fence_orders_update BEFORE UPDATE OF snapshot,status,version,created,expires,artwork_expires,fulfilled_at,owner_sent,receipt_sent,current_contact,contact_revision ON orders WHEN EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=OLD.id AND p.state='erasing') BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_replay_order BEFORE INSERT ON orders WHEN EXISTS(SELECT 1 FROM order_privacy_tombstones t JOIN order_privacy_operations p USING(operation_id) WHERE t.kind='order' AND t.id=NEW.id AND (t.expires>unixepoch() OR p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_replay_artwork BEFORE INSERT ON artwork_requests WHEN EXISTS(SELECT 1 FROM order_privacy_tombstones t JOIN order_privacy_operations p USING(operation_id) WHERE ((t.kind='artwork' AND t.id=NEW.id) OR (t.kind='order' AND (t.id=NEW.id OR t.id=NEW.parent_order))) AND (t.expires>unixepoch() OR p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;
CREATE TRIGGER privacy_replay_submission BEFORE INSERT ON submissions WHEN EXISTS(SELECT 1 FROM order_privacy_tombstones t JOIN order_privacy_operations p USING(operation_id) WHERE t.kind='submission' AND t.id=NEW.id AND (t.expires>unixepoch() OR p.state='erasing')) BEGIN SELECT RAISE(ABORT,'order_privacy_guard'); END;

CREATE TRIGGER privacy_report_claim AFTER INSERT ON order_privacy_operations BEGIN UPDATE finance_report_state SET revision=revision+1 WHERE id=1; END;
