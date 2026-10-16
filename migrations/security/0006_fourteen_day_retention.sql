-- Owner-approved retention change, 16 October 2026.
-- Only still-active seven-day records are extended. Expired records stay expired.
UPDATE artwork_requests
SET expires = created + 1209600
WHERE expires > unixepoch() AND expires = created + 604800;

UPDATE orders
SET expires = MIN(created + 1209600,
  COALESCE((SELECT expires FROM artwork_requests WHERE artwork_requests.id = orders.id), created + 1209600))
WHERE expires > unixepoch() AND expires <= created + 604800;
