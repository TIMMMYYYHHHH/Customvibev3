CREATE TABLE artwork_requests (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, manifest TEXT NOT NULL,
 bytes INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL,
 finalized INTEGER NOT NULL DEFAULT 0, reservation TEXT NOT NULL
);
CREATE INDEX artwork_expiry ON artwork_requests(expires);
CREATE TABLE artwork_files (
 request_id TEXT NOT NULL, slot INTEGER NOT NULL, ready INTEGER NOT NULL DEFAULT 0,
 tries INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(request_id,slot)
);
CREATE TABLE artwork_usage (id TEXT PRIMARY KEY, amount INTEGER NOT NULL);
