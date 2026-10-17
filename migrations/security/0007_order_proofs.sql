ALTER TABLE artwork_requests ADD COLUMN parent_order TEXT;
CREATE INDEX artwork_parent_order ON artwork_requests(parent_order);
CREATE TABLE proof_revisions(order_id TEXT NOT NULL,revision INTEGER NOT NULL,digest TEXT NOT NULL,manifest TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(order_id,revision));
CREATE TABLE proof_state(order_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0,digest TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'awaiting_design',token_hash TEXT,approved_at INTEGER);
CREATE UNIQUE INDEX proof_token ON proof_state(token_hash) WHERE token_hash IS NOT NULL;
CREATE TABLE proof_sessions(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,revision INTEGER NOT NULL,token_hash TEXT NOT NULL,expires INTEGER NOT NULL,viewed_digest TEXT);
CREATE TABLE proof_events(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id TEXT NOT NULL,revision INTEGER NOT NULL,kind TEXT NOT NULL,created INTEGER NOT NULL,message TEXT NOT NULL DEFAULT '');
CREATE INDEX proof_session_order ON proof_sessions(order_id);
CREATE INDEX proof_event_order ON proof_events(order_id);
