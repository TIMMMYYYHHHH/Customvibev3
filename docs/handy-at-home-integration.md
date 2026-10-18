# Handy at home: studio integration and release

18 October 2026. The owner approved the nine original designs with fixed headings and handwritten editable entries, then authorised proceeding with the existing-studio integration. The owner subsequently approved the reviewed local integration for publication, explicitly retaining newer admin updates.

Review: http://127.0.0.1:5195/studio/handy
Collections: http://127.0.0.1:5195/collections
Local print/admin verification: http://127.0.0.1:5195/tests/fixtures/handy-flow.html

## Behaviour

- Handy at home opens from the shared home/collections card and its product page. Nine distinct upright previews use Add your details.
- Photos & puzzles and Handy at home are sections of the same studio. Draft entries remain in browser memory. Fixed headings and labels cannot be edited.
- All nine designs accept their variable entries in Patrick Hand at the approved font size. Shared browser/server validation checks template edition, exact field count, character support, field length and unkerned font width. Oversized text is rejected, never shrunk. Optional blanks remain blank.
- Basket lines retain template ID, edition and exact entries. Different personalisations stay separate. Editing preserves quantities and cannot restore a removed line. Leaving an edit clears that edit session.
- Checkout regenerates the 1200 × 1200 JPEG from saved entries, ignoring cached preview bytes. No preview rim/shadow is exported. The server validates metadata, sizes and hashes; it does not independently render or pixel-verify customer uploads.
- Admin shows submitted entries beside working artwork. Final proof manifests retain the template metadata for print instructions. When an administrator replaces a proof image, the current approved proof is authoritative; download instructions identify text as submitted details.
- Existing private storage, approval requirements, unpaid status, manual emails and artwork expiry remain in force. No real orders, customer records, emails or payment changes were made during this work.

## Assets

`public/assets/handy/v1/` contains unchanged copies of the five original masters and four approved edited masters. `src/designs/handy-catalogue.mjs` versions their 1254 px field coordinates. `scripts/prepare-handy-assets.py` copies the masters and derives glyph advances from the bundled licensed Patrick Hand font. The 400 px catalogue previews were exported from the same browser renderer with default values; together they are about 612 KB, avoiding a 21 MB master download on collection pages. Full masters load only when selected for editing/printing. Do not change edition 1 artwork/layout after release; add an edition for later incompatible changes.

## Verification

- Browser: collection entry, all nine loaded 3×3 previews, Family week custom wording, overflow rejection, add, two copies, edit without duplication, checkout summary, and 390 px mobile Pet care entry 08:30 added to basket.
- Real browser print fixture: all nine templates regenerate from deliberately invalid stale previews, match fresh render bytes, produce square 1200 px JPEGs and preserve exact values through order validation/snapshots. Eighteen copies use nine independent files.
- Downloaded and inspected local ZIP: nine JPEGs plus instructions with 75 × 75 mm size, template names, submitted wording, copy counts and unapproved-proof warning.
- Independent review found stale edit sessions could overwrite newer quantities or resurrect removed lines. Fixed and covered by a regression test. Mobile inspection found the shared absolute photo-overlay layout needed a relative square in this editor; corrected and visually checked.

## Published release, 18 October 2026

- Release revision: 8088d2c2a067d161a2bdbdc487968677c2593a02. Merged origin/main 7f03a1b, preserving Fulfilled history, grouped Table, six-month order details, 14-day artwork expiry, retained-order search, proof confirmations and sign-in recovery.
- All 292 tests passed. Customer build, SSR/prerender and paired admin build passed. Vite retains its advisory bundle-size warning.
- Nine-design browser fixture passed again against the merged admin: exact wording, 1200 px square JPEGs, 18 copies/nine files, matching print bytes and current-proof submitted details.
- Protected Pages workflow succeeded: https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39108213661. Canonical deployment is https://048a09c1.customvibe-business.pages.dev and its commit matches this release.
- Security Worker: fe85c932-2011-492d-beeb-ef1d67a9b7a5. Catalogue Worker: 8068e98c-9e2c-4097-9faf-759e45d3fd52. Admin Worker: d8767631-02d9-490d-a3dc-60a1ff355f24.
- Every Worker binding matched before/after. Deployment used the existing scoped helper with temporary absolute release paths; original helper-checkout configs were restored byte for byte. No migration or data reset was needed.
- Live studio: https://customvibe.co.za/studio/handy. Verified all nine previews load, Family week editing, exact basket wording, reopening saved values, and Pet care 08:30 preview. The collection card links to the new studio with Add your details.
- Production remains password-gated; separate admin sign-in and disabled payments remain. Preview sending remains disabled. No real orders, emails, stage changes or customer-record mutations were used for release verification.
- Evidence: output/handy-at-home/release, including live-studio.png and sanitised deployment/settings results.

## Remaining acceptance

Physical 7.5 cm print readability remains the owner's check. The broader magnet-finish improvement remains deferred. The admin browser is signed out, so authenticated post-publication order-view verification and the final Handy catalogue-copy refinement await the requested sign-in. The current live catalogue has been preserved in full, including its existing Handy title, hidden QR/Wi-Fi cards and all newer content. Do not replace it with local fallback data. Founders Hub keeps this task In progress for the outstanding print acceptance and explicitly distinguishes publication from the pending signed-in check.
