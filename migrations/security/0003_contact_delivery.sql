-- At-most-once W3Forms dispatch. No message or customer data is stored.
ALTER TABLE submissions ADD COLUMN contact_started INTEGER NOT NULL DEFAULT 0;
