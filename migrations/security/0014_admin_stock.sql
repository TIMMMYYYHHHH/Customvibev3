-- Private physical balances and non-customer immutable operation history.
CREATE TABLE stock_items (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 unit TEXT NOT NULL CHECK(length(unit) BETWEEN 1 AND 24),
 whole_units INTEGER NOT NULL CHECK(whole_units IN (0,1)),
 balance_milli INTEGER NOT NULL DEFAULT 0 CHECK(balance_milli BETWEEN 0 AND 9007199254740991),
 initialized INTEGER NOT NULL DEFAULT 0 CHECK(initialized IN (0,1)),
 low_milli INTEGER NOT NULL CHECK(low_milli BETWEEN 0 AND 9007199254740991),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),
 stocktake_generation INTEGER NOT NULL DEFAULT 0 CHECK(stocktake_generation BETWEEN 0 AND 9007199254740991),
 CHECK(whole_units=0 OR (balance_milli%1000=0 AND low_milli%1000=0))
);
CREATE TABLE stock_movements (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 operation_id TEXT NOT NULL UNIQUE,
 request_digest TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('item','receipt','stocktake','use','reverse')),
 created INTEGER NOT NULL,
 reason TEXT NOT NULL CHECK(length(reason)<=200),
 lines TEXT NOT NULL CHECK(json_valid(lines) AND json_array_length(lines)<=100),
 price TEXT CHECK(price IS NULL OR json_valid(price)),
 reverses TEXT UNIQUE REFERENCES stock_movements(operation_id),
 result TEXT CHECK(result IS NULL OR json_valid(result))
);
CREATE INDEX stock_movements_created ON stock_movements(created,seq);
CREATE INDEX stock_movements_kind_seq ON stock_movements(kind,seq);
-- A pending header exists only inside an atomic batch. Finalized operations cannot change.
CREATE TRIGGER stock_movements_no_update BEFORE UPDATE ON stock_movements WHEN old.result IS NOT NULL BEGIN SELECT RAISE(ABORT,'Stock history is immutable'); END;
CREATE TRIGGER stock_movements_no_delete BEFORE DELETE ON stock_movements BEGIN SELECT RAISE(ABORT,'Stock history is immutable'); END;
CREATE TABLE order_stock_use (
 order_id TEXT PRIMARY KEY,
 operation_id TEXT NOT NULL UNIQUE REFERENCES stock_movements(operation_id),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),
 status TEXT NOT NULL CHECK(status IN ('active','reversed')),
 lines TEXT NOT NULL CHECK(json_valid(lines) AND json_array_length(lines)<=100),
 reverse_operation_id TEXT UNIQUE REFERENCES stock_movements(operation_id),
 updated_at INTEGER NOT NULL
);
-- Order cleanup drops the private association only. It never replenishes stock or prunes history.
CREATE TRIGGER stock_order_delete AFTER DELETE ON orders BEGIN DELETE FROM order_stock_use WHERE order_id=old.id; END;
