-- Accepted provider receipts only. Purpose/reference remain the existing columns/keys.
-- Nullable fields preserve legacy marks without inventing receipt or delivery evidence.
ALTER TABLE submissions ADD COLUMN owner_provider_id TEXT CHECK(owner_provider_id IS NULL OR (length(owner_provider_id) BETWEEN 1 AND 128 AND owner_provider_id NOT GLOB '*[^A-Za-z0-9_-]*'));
ALTER TABLE submissions ADD COLUMN owner_accepted_at INTEGER CHECK(owner_accepted_at IS NULL OR (typeof(owner_accepted_at)='integer' AND owner_accepted_at BETWEEN 1 AND 9007199254740991));
ALTER TABLE submissions ADD COLUMN receipt_provider_id TEXT CHECK(receipt_provider_id IS NULL OR (length(receipt_provider_id) BETWEEN 1 AND 128 AND receipt_provider_id NOT GLOB '*[^A-Za-z0-9_-]*'));
ALTER TABLE submissions ADD COLUMN receipt_accepted_at INTEGER CHECK(receipt_accepted_at IS NULL OR (typeof(receipt_accepted_at)='integer' AND receipt_accepted_at BETWEEN 1 AND 9007199254740991));
ALTER TABLE order_update_attempts ADD COLUMN provider_message_id TEXT CHECK(provider_message_id IS NULL OR (length(provider_message_id) BETWEEN 1 AND 128 AND provider_message_id NOT GLOB '*[^A-Za-z0-9_-]*'));
ALTER TABLE order_update_attempts ADD COLUMN accepted_at INTEGER CHECK(accepted_at IS NULL OR (typeof(accepted_at)='integer' AND accepted_at BETWEEN 1 AND 9007199254740991));
