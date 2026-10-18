# Handy at home: local studio integration

18 October 2026. The owner approved the nine original designs with fixed headings and handwritten editable entries, then authorised proceeding with the existing-studio integration. This implementation is local, not deployed.

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

## Remaining release and owner acceptance

Local review is ready. Physical 7.5 cm print readability is still the owner's check. Publication needs the current live checkout reconciled with this feature branch, including newer admin/order-history work recorded in Founders Hub. Rebuild and publish matching customer/admin previews from that reconciled revision, and apply only the Handy catalogue fields to the latest authenticated live content. Never replace the live catalogue with this local file. Keep the site password gate and payments disabled. The deferred broader magnet-finish improvement remains separate.

Final automated result: 272 tests passed, zero failures. Customer build, server rendering/prerender (26 pages) and paired admin build passed. Vite reports its advisory customer chunk-size warning above 500 KB; there is no build failure. The current checkout is intentionally not published over newer live admin changes.
