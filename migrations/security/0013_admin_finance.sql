-- Private operational costs share their order lifetime. No existing order is rewritten.
CREATE TABLE finance_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 version INTEGER NOT NULL CHECK(version>0),
 payload TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE order_costs (
 order_id TEXT PRIMARY KEY,
 version INTEGER NOT NULL CHECK(version>0),
 order_version INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('estimated','confirmed')),
 payload TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE finance_changes (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('settings','save','confirm')),
 before_payload TEXT,
 after_payload TEXT NOT NULL,
 actor TEXT NOT NULL CHECK(actor='authenticated-admin'),
 created INTEGER NOT NULL
);
CREATE INDEX finance_changes_order ON finance_changes(order_id);
CREATE TABLE finance_report_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 revision INTEGER NOT NULL CHECK(revision>=0)
);
INSERT INTO finance_report_state(id,revision) VALUES(1,0);
CREATE INDEX orders_created_seq ON orders(created,seq);
CREATE TRIGGER finance_revision_order_insert AFTER INSERT ON orders BEGIN UPDATE finance_report_state SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER finance_revision_order_update AFTER UPDATE ON orders BEGIN UPDATE finance_report_state SET revision=revision+1 WHERE id=1; END;
-- Keep cleanup safe if the application is rolled back to an older order cleaner.
CREATE TRIGGER finance_revision_order_delete AFTER DELETE ON orders BEGIN
 DELETE FROM order_costs WHERE order_id=old.id;
 DELETE FROM finance_changes WHERE order_id=old.id;
 UPDATE finance_report_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER finance_revision_cost_insert AFTER INSERT ON order_costs BEGIN UPDATE finance_report_state SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER finance_revision_cost_update AFTER UPDATE ON order_costs BEGIN UPDATE finance_report_state SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER finance_revision_cost_delete AFTER DELETE ON order_costs BEGIN UPDATE finance_report_state SET revision=revision+1 WHERE id=1; END;
