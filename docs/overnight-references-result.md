# Request references: local implementation and verification

16 October 2026. Local changes only, no deployment, real email or live record changes.

## Outcome

Fresh order payloads opt into `referenceVersion: 1`. The shared `requestReference(request)` export in `src/request-reference.mjs` creates a deterministic label such as `CV-XXXX-XXXX-XXXX-XXXX`. The 16 symbols use Crockford Base32, excluding ambiguous I, L, O and U. This shortens the old 39-character label to 22 characters in readable groups.

The same label appears in the confirmation response, initial owner/customer emails, new admin record list/detail and manual customer update email. New immutable order snapshots carry the label. Existing stored records keep their original sequential admin labels, and older email references remain unchanged. No schema migration or record rewrite is required.

The full UUID remains the storage ID, artwork grant ID, signed recovery identity, order/artwork URL parameter and email provider idempotency key. The reference is a display label, never an authorization token. Legacy pending payloads without the marker retain their original `CV-<UUID>` email and confirmation reference. They are not silently upgraded. The marker is included in new fingerprints, so changing reference version on an existing retry conflicts instead of sending a different payload under an old provider key.

Contact tracing remains internal. Contact uncertainty, conflict and expired-message instructions ask for the submitted email address and approximate submission time. W3Forms payload tracing and deferred Reply-To behavior remain unchanged.

## Collision behavior

The code takes 80 random bits from a UUIDv4, excluding its fixed version/variant nibbles. This yields about 1.2 septillion possible labels. At 100,000 generated requests, the birthday collision probability is about 4.1 quadrillionths. UUIDs must continue to come from `crypto.randomUUID()`.

When order records are enabled, a single conditional insert checks the snapshot reference atomically. A duplicate label for another UUID fails with 409 before any mail is sent. The user keeps the draft and is told to contact CustomVibe for review. Existing records and their original references remain untouched. This check covers stored records; when order records are disabled or records have expired and been erased, labels retain probabilistic uniqueness. UUID storage and provider keys remain unambiguous in every mode.

## Verification

Wrote and observed three failing regressions for missing short labels, reference-version validation and forced collisions before implementing. A further failing API test caught the generic collision response, which now gives a reviewable 409.

`tests/request-reference.test.mjs` covers:

- Matching labels across initial emails, immutable records, list/detail and update email.
- Full UUID retained in protected artwork links and provider idempotency keys.
- Legacy payload fingerprint/reference compatibility and unchanged sequential admin labels.
- Invalid reference versions and reference-version changes on retries.
- Atomic rejection of concurrent, forced collisions and no outgoing mail on collision.
- Customer receipt failure followed by retry, with exactly one owner dispatch and identical retried customer payload.
- New/legacy submissions with order records both enabled and disabled.

Full local suite at this checkpoint: 132 passed, 0 failed. All provider calls in these tests are synthetic; this does not verify inbox delivery. Parent integration owns the fresh-order marker, pending reference display, browser verification and final public/admin builds.

Site gate, local/preview sending restrictions, payment unavailability, free-tier limits and seven-day retention are unchanged.
