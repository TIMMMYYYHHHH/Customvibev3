CREATE TABLE orders (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 fingerprint TEXT NOT NULL,
 snapshot TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new',
 version INTEGER NOT NULL DEFAULT 0,
 created INTEGER NOT NULL,
 expires INTEGER NOT NULL,
 owner_sent INTEGER NOT NULL DEFAULT 0,
 receipt_sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX orders_expiry ON orders(expires);
CREATE TABLE order_history (
 order_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL,
 PRIMARY KEY(order_id,version)
);
CREATE TABLE order_updates (
 order_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending', created INTEGER NOT NULL, updated INTEGER NOT NULL,
 reservation TEXT NOT NULL,
 PRIMARY KEY(order_id,version)
);
