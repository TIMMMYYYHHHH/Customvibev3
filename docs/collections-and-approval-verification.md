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

## Deployment and live verification

Schema 0007 applied to the existing business D1 database. Security Worker version 644cf737-ffd4-4127-a294-2d08ea41741b, admin version a31cb5d3-d6e5-4aa1-ab6e-70fbcb6e5814 and catalogue version dadf826d-2ec8-4999-8079-08c6f6e50c04 deployed through the business-only helper. Pages runs 38999141808, 38999484028 and 38999749406 succeeded. The latest run on main carries the final card sizing correction.

The signed-in admin merged and saved the latest catalogue, preserving existing owner content. All six packs and four practical collections are Available; the shop now shows 12 collections. Verified live: self-design preview and basket, assisted brief and Awaiting design state, six practical magnets at R250, all 26 alphabet faces at R1,040, and a mixed 32-magnet basket at R1,280. The temporary verification basket was cleared by leaving the memory-only session. No real orders or email were submitted.

Live review without a private capability exposes no artwork and asks for the latest private email link. Local browser checks cover sign-in fragment preservation and explicit consent before approval; full service integration tests cover authorization and revision changes. Site/admin gates and disabled payments remain in place. Slow protected asset loading encountered during verification remains distinct from the previously tracked provider availability/CPU issue. Print fonts now load from bundled licensed bytes so independent font requests cannot break artwork generation. Card artwork fills its square frame and is sized relative to the art panel, verified in the local browser before release.

The independent review identified six Important findings, all fixed and regression-tested: custom fixed-pack face metadata and filenames, immutable upload retry identity, unchanged-file reuse for large revisions, literal Wi-Fi spacing, normalized URL limits and capability preservation through sign-in. Unchanged files keep their existing private references; revisions do not bypass quotas or reset expiry.

## Outstanding owner acceptance

Physical 7.5cm print readability and QR scanning remain an owner acceptance step and keep the Hub parent open. Existing provider availability follow-ups remain separately tracked. Automated/local approval checks do not claim a real customer email was received or a production print was made.

## Deployment access

The Pages CI credential cannot update the existing catalogue Worker (run 38999170683 stopped safely before that deployment). Use the existing business-only temporary artwork-access helper for private Worker deployments; it now accepts the named catalogue configuration. Credentials remain in memory. The website and separate admin gates remain enabled, payments disabled, and no real emails or test orders were sent.

## Visual revision after owner feedback, 17 October

The owner rejected the initial sparse designs and card layout. The revision gives business, QR, Wi-Fi and information magnets distinct illustrated compositions and replaces plain gift/reminder wording with bouquets, rainbows, hearts and sunshine. These illustrations are part of the actual 1200px JPEG exports, not decorative preview overlays. Sample details are explicitly identified in the editor. Existing uploaded/approved artwork remains immutable; no order, price, approval or retention contract changed.

Collection cards use larger artwork, complementary backgrounds and one padded copy/action area. Detached bottom-edge product links and unnecessary card borders are removed. Phone layouts inspected at 320px and 390px. Original letter/number learning content remains easy to recognise.

Verification: 218 automated tests pass; public and SSR builds pass; the browser export fixture validates 66 baseline JPEGs, decodes 10 QR examples across all colour choices, and verifies both optional business/information logos appear in the rendered output. Independent review identified an information-logo omission; fixed and covered by the export fixture. Physical print/scan acceptance remains open. This section records local verification; the deployment result is recorded in Founders Hub once verified.
