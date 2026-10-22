# Customer preview correction

Current rule: customers check the artwork preview during designing and checkout. There is no separate proof email, approval invitation or post-order artwork approval requirement. See [Customer preview policy](customer-preview-policy.md) for the owner decision and retention rules.

## Implemented behavior

New private order snapshots no longer set `approvalRequired`. Existing absent, false or true flags and historical review states do not block saving a stage or downloading artwork. No historical order is marked approved as part of this correction. Admin artwork preparation remains available for missing or replacement files, preserves the saved stage, and selects the latest valid complete revision for private display and downloads. Puzzle layout previews retain their separate preview-only tile semantics.

Preview update and Send update still control ordinary customer status messages. Preparing artwork, saving or dragging a stage, and previewing an update do not send email or mint a customer review capability. Definitive provider rejections retain the existing explicit retry-preview and retry-token path. Duplicate, uncertain and fulfilled-attempt protections remain in force.

The old public `/proof` page contains a contact route and requires no response. Its API and retired internal customer review actions return a retired response before reading private storage or mutating records. Internal artwork preparation, authenticated private downloads, original/replacement hashes and immutable publish identities remain in place.

The website password gate, separate server-side admin authentication, CSRF, validation, quotas and payments-disabled settings remain active. Orders remain accurately unpaid. Artwork and associated requests retain the original 14-day deadline. Order details retain their existing six-calendar-month policy. This change adds no paid-stage or download restriction, payment capability, courier action, public-launch approval or service upgrade.

## Local regression coverage

- [Customer review correction tests](../tests/customer-review-correction.test.mjs): historical flags/states, stage concurrency, immutable original hashes, original and replacement archive choice, unchanged artwork expiry, no automatic send, manual update rejection/retry and retired private actions.
- [Customer preview copy tests](../tests/customer-preview-copy.test.mjs): designer/checkout guidance, privacy and unpaid facts, inert old review screen, prerendered pages and FAQ structured data.
- [Order proof tests](../tests/order-proofs.test.mjs), [proof upload tests](../tests/proof-upload.test.mjs) and [artwork API tests](../tests/artwork-api.test.mjs): complete replacement identities, ownership, file integrity and private access.
- [Manual update tests](../tests/manual-update-attempts.test.mjs), [admin proof compatibility tests](../tests/admin-proofs.test.mjs) and [retention recovery tests](../tests/retention-recovery.test.mjs): existing send safeguards and independent retention.
- [Disconnected exact artwork check](../scripts/verify-exact-artwork.mjs): real browser exports, two internal revisions, 17 stored/current/downloaded file hashes, 36 magnets, row-major puzzle tiles, per-design quantities and unpaid print instructions. The fixture blocks external requests and uses synthetic storage and mail responses.

Combined verification uses the exact lockfile dependencies and Node v22.23.3. Run `npm run build`, `npm run build:admin`, `node scripts/check-dependency-notices.mjs --outputs --bundles`, `CV_CHECK_BUILT_NOTICES=1 npm test` and `python3 -B -m unittest discover tests/python`. Loopback access is required for local Cloudflare runtime/browser fixtures. Browser checks verify the admin stage, download and manual preview controls at desktop and phone widths without a real send.

## Scope and release limits

Local implementation and fixtures do not prove deployed parity, real inbox delivery, physical print readability or QR scanning. Saved live catalogue and seasonal wording must be read separately and corrected only if necessary, preserving current revisions. Historical specs and verification notes remain explicitly superseded where they required separate customer approval.

This correction has no production side effects. The earlier PR43 security deployment remains a separate blocked operation awaiting its exact owner approval. Do not use this correction to bypass that deployment decision. Paired storefront/admin/private-service release checks and current source parity still apply to any later authorized publication.
