# Collections and customer approval verification

17 October 2026. Feature implementation and one independent review/fix pass complete. All 218 automated checks and public/SSR/admin builds pass.

- Complete version 1 print definitions: A–Z (26), 1–10 with dots (10), first words (4), colours (4), reminders (4), thank-yous (4).
- Business, QR, Wi-Fi and information templates render locally to 1200-square baseline JPEGs. Browser fixture validates all 56 pack/sample outputs and decodes the two exported sample QR codes exactly. Original/reference files and unsent designs stay in memory.
- Shared quantity-price tests cover packs, repeated packs, templates, photos and puzzle pieces. Legacy fixed-price custom products remain compatible.
- Private order validation retains structured details, stable item mappings, manifest version and hashes. Assisted references cannot seed final proofs.
- Approval is an explicit exact-revision/digest action after review. Server production transitions require approval. Replacement and approval race tests run against real SQLite transaction fixtures. Historical snapshots remain compatible.
- Customer sessions require an unexpired hashed capability, signed HttpOnly session and same-origin CSRF. They return only current proof artwork/quantities. Test coverage includes forged links, missing consent, stale digests, forbidden file slots, revocation, expiry and private-field exclusion.
- Manual review invitations reuse Preview update / Send update. Exact preview version and token checked before existing idempotent email reservation. All local email tests use a stub provider; no real email sent.
- Revision upload reservations inherit original order expiry. Existing file/byte limits aggregate across originals and revisions. Cleanup removes proof records and sessions; storage cleanup preserves its existing quota-release guarantees.
- Original preview repair is already live: commit 2035b09, deployment run 38997408349, independently reviewed. Live puzzle bounds 150×150 inside a 366×183 art area, with readable card copy.

## Outstanding acceptance

Schema 0007 and private security/admin Workers deployed; website deployment 38999141808 succeeded at 07c362e. Catalogue service deployment and current production catalogue activation are in progress. Local 320/390px layouts, gate-to-review fragment preservation and explicit customer approval UI verified. Production read-only verification remains. The physical 7.5cm print readability and QR scan check is an owner acceptance step and keeps the Hub parent open. Provider availability issues remain separately tracked.

## Deployment access

The Pages CI credential cannot update the existing catalogue Worker (run 38999170683 stopped safely before that deployment). Use the existing business-only temporary artwork-access helper for private Worker deployments; it now accepts the named catalogue configuration. Credentials remain in memory. The website and separate admin gates remain enabled, payments disabled, and no real emails or test orders were sent.
