-- Public locker metadata and bounded map-service counters only. No customer search text.
CREATE TABLE IF NOT EXISTS map_usage (id TEXT PRIMARY KEY, amount INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS map_usage_expiry ON map_usage(expires);
CREATE TABLE IF NOT EXISTS locker_refresh (id INTEGER PRIMARY KEY CHECK(id=1), next_attempt INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT 0);
