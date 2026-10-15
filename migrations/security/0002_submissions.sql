-- Opaque retry state only. Never store photos, email bodies or customer details.
CREATE TABLE IF NOT EXISTS submissions (
 id TEXT PRIMARY KEY,
 fingerprint TEXT NOT NULL,
 reservation TEXT NOT NULL,
 kind TEXT NOT NULL,
 owner_sent INTEGER NOT NULL DEFAULT 0,
 receipt_sent INTEGER NOT NULL DEFAULT 0,
 tries INTEGER NOT NULL DEFAULT 1,
 expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_expiry ON submissions(expires);
