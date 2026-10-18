-- Owner decision 18 October 2026. Never revive already-expired records.
ALTER TABLE orders ADD COLUMN artwork_expires INTEGER;
ALTER TABLE orders ADD COLUMN fulfilled_at INTEGER;
UPDATE orders SET artwork_expires=expires;
-- Calendar months with month-end clamping, matching sixMonthsAfter().
UPDATE orders SET expires=unixepoch(datetime(created,'unixepoch','start of month','+7 months','-1 day',
 (MIN(CAST(strftime('%d',created,'unixepoch') AS INTEGER),CAST(strftime('%d',created,'unixepoch','start of month','+7 months','-1 day') AS INTEGER))-CAST(strftime('%d',created,'unixepoch','start of month','+7 months','-1 day') AS INTEGER)) || ' days',
 '+' || (created % 86400) || ' seconds')) WHERE expires>unixepoch();
CREATE INDEX orders_fulfilled ON orders(status,fulfilled_at DESC,seq DESC);
CREATE UNIQUE INDEX one_fulfilled_update ON order_updates(order_id) WHERE status='fulfilled';
