# Correct finished size together with the production print flow

21 October 2026. Tim has measured the finished magnet: **2.5 × 2.5 inches = 63.5 × 63.5 mm = 6.35 × 6.35 cm**. The supplied template's octagons are fold guides. Tim currently prints from a Mac/laptop through Canva and wants a direct workflow that removes Canva. This note maps current references only; no code, stored catalogue, email, template, evidence or settings have been changed.

Source inspected: `research/customvibe-locker-release`, `0d3009c4b19bb588bbb8260dacbfe2e34eb16f61`. The pending integrity release is separate. Root owns PDF inspection and confirmation of flat artwork, fold/bleed and finished-face geometry. **Finished size is not automatically the full flat image extent.** Do not replace measured template coordinates with 63.5 mm or shrink an image within fold guides without checking that mapping.

## Count and correction map

Bounded scan of `src`, `admin`, `server` and `data` found **15 files, 33 matching lines, 38 matched expressions** representing physical size, puzzle-board size, source-pixel guidance or its calculation. This is **14 runtime source files / 20 matching lines / 25 expressions**, plus **13 catalogue fields across 11 products** in one JSON file. A dimension pair is counted as one expression, not twice. CSS numbers, base64, hashes and unrelated decimals are excluded. These are source counts, not a fresh live catalogue observation.

| Current location | What must agree with Tim's measured size |
| --- | --- |
| `src/HelpContent.jsx:6,9,17` | FAQ individual size, entire 3 × 3 / 5 × 5 puzzle size, and print-resolution guidance. The old 886-pixel target is derived from the wrong size. |
| `src/ProductPage.jsx:11` | Three physical-size claims: collection introduction, nine-example caption and other template-product caption. |
| `src/SiteChrome.jsx:21`; `src/storefront/Storefront.jsx:87` | Shared footer and homepage bundle/hero size claims. |
| `src/Editor.jsx:60`; `src/OrderGuidance.jsx:12` | Photo/puzzle tile caption and PPI guidance beside customer crop controls, also reused in basket/checkout guidance. |
| `src/storefront/ProductDetails.jsx:11`; `src/designs/CollectionPicker.jsx:41` | Collection dialog and About this collection size claims. |
| `src/designs/BusinessStudio.jsx:41,45`; `src/designs/HandyStudio.jsx:39,43` | Studio introduction and selected-artwork caption in each editor. |
| `src/designs/business.mjs:42` | QR density error says “7.5 cm magnet”. Correct the size wording; do not assume the existing maximum of 49 modules is physically accepted on the smaller finished product. Actual printed scanning remains necessary. |
| `src/designs/products.mjs:17-18` | Default personalisable-product contents and Noughts & crosses set contents. Defaults can become visible for missing/upgraded products. |
| `src/commerce.mjs:35,41` | Crop-quality comment **and arithmetic** currently divide source pixels by `7.5/2.54` inches. Correct the shared finished-size assumption, retaining source-crop/zoom/grid calculation and advisory thresholds. |
| `admin/order-archive.mjs:4` | ZIP print instructions state “Finished size: 75 × 75 mm” for Business/Handy items. New downloads must state the measured finished size and distinguish flat/fold/bleed layout where needed. Existing downloaded ZIPs are historical local files, not rewritten records. |
| `data/site-content.json:26,43,74,91,108,125` | Six collection `details` fields: alphabet, counting, words, colours, reminders, thanks. |
| `data/site-content.json:152,162,178,194,200,210,220` | Business `details/contents`; QR and Wi-Fi `contents` (currently hidden defaults still need accuracy); Handy/information `details/contents`; Noughts & crosses `contents`. |

The stored production catalogue has priority over fallback JSON. `server/content.mjs:6-8` reads saved content, and `src/designs/products.mjs:19` preserves existing string contents. Therefore a source-only edit will **not** correct all live product copy. Fresh-read current content, update only the affected size fields through authenticated optimistic-revision saving, preserve current product settings and re-read after save. Do not import fallback JSON over production or replace old order snapshots; historical order data must stay truthful to what was submitted.

## Resolution and puzzle implications

- A **single finished face/tile** is 63.5 mm square. A 3 × 3 assembled picture is **190.5 mm / 19.05 cm / 7.5 inches** square before gaps. A 5 × 5 picture is **317.5 mm / 31.75 cm / 12.5 inches**. The old FAQ values 22.5 cm and 37.5 cm describe 75 mm pieces and must change. A new occurrence of “7.5 inches” for the entire small puzzle is correct, not a remaining 7.5 cm tile error.
- Existing final exports are **1200 × 1200 pixels per photo, puzzle tile and rendered collection/personalised face**: `src/order-artwork.mjs:15-24`, `src/artwork.js:19-33`. Server validation requires 1200 square pixels for non-proof artwork (`server/jpeg.mjs:17`). Keep that established byte/dimension contract unless a separately reviewed print-layout need proves otherwise; 63.5 mm does not require downsampling to 750 pixels.
- When the full square image maps directly to a 2.5-inch face, 1200 pixels give **480 ppi**, and a 300 ppi source target is **750 pixels per tile edge**. The 150 ppi boundary becomes **375 source pixels**. These arithmetic values assume the full crop is the finished face. If the supplied template consumes part of that image as fold/bleed, derive quality guidance from the confirmed image-to-face mapping instead of overstating effective detail. Upscaling still creates no source detail.
- Puzzle reference files are layouts, not individual print tiles. Their rendered resolution can differ; `server/jpeg.mjs:17` permits a square proof up to 2600 pixels. Do not size the entire puzzle reference to one finished magnet or print it in place of expanded row/column tiles. Quantity remains sets × tile count, with existing explicit per-file copies.
- Business/Handy fonts, QR quiet zones and artwork field coordinates are currently rendered on their established coordinate grids. Do not bulk-replace `75` in coordinates or regenerate masters. Smaller finished type/QR requires real template/material readability and scan acceptance; if that fails, scope the particular artwork correction separately.

## Emails, policies, tests and documents

**Active email renderers:** no physical 7.5 cm / 75 mm size claim was found in the current `server` templates. `server/submission-model.mjs:54` correctly says print photos/individual tiles are 1200 × 1200 pixels and puzzle layouts are not tiles. Preserve that pixel statement and manual email controls. Customer/owner summary counts in `server/email-order-summary.mjs` remain quantities, not physical dimensions. No resend is needed just to correct future copy. The archive instructions, not the emails, contain the active Admin 75 mm claim. No matching physical-size statement was found in current policy copy (`src/policies.mjs`).

**Known tests requiring aligned expectations:** `tests/crop-quality.test.mjs:5-29` has numeric PPI and old 885/886 and 442/443 threshold expectations; check the full file, not only its literal size strings. `tests/business-personalisation.test.mjs:17` and `tests/handy-personalisation.test.mjs:18` explicitly expect `75 × 75 mm` in print instructions. Preserve checks of source pixels, rotation/zoom, advisory levels, exact wording/quantities and no post-order approval; replace outdated physical assumptions with independently calculated new boundaries. No tests were run or changed by this exploration.

**Current working rules:** repository `AGENTS.md:41,53,57,70` contains four older size decisions for collection samples, game pieces, Handy readability and Business designs. Add a clear dated owner correction overriding their physical-size assumptions, without erasing the prior artwork, quantity, privacy or workflow decisions. Root maintains external project rules/Hub consistently.

**Documentation with matched old physical-size references (13 files):**

- `docs/crop-quality-and-order-limits.md:37-39`: current technical explanation needs corrected size/PPI and a dated note around historical implementation evidence.
- `docs/five-style-collections.md:13,67`; `docs/collections-and-approval-verification.md:39`.
- `docs/business-cards-release.md:26`; `docs/business-game-release.md:7,9`; `docs/business-studio-integration.md:28`.
- `docs/handy-at-home-integration.md:29,46`; `docs/handy-at-home-review.md:9,17`; `docs/handy-at-home-wording-prototype.md:29`.
- `docs/EMAIL_SETUP.md:117`: historical physical-print TODO, not the active email renderer or current email policy.
- `docs/superpowers/plans/2026-10-17-collections-and-design-approval.md:19`; `docs/superpowers/plans/2026-10-18-handy-personalisation.md:3`; `docs/superpowers/specs/2026-10-17-collections-and-design-approval.md:13,58`.

Treat completed release/prototype/spec notes, saved screenshots, ZIP instructions and old acceptance results as historical evidence. Add a dated supersession/reference where needed; do not rewrite old recorded measurements into a new claimed pass. In particular, the recently prepared `audit/fix-plan/github-wait-execution-20261021/owner-tests/print-samples-75mm.pdf` really contains 75 mm samples. It is superseded as a calibration/product-size target by Tim's measurement. Keep it labelled historical/optional evidence and update the owner pack's current instructions, rather than silently relabelling it 63.5 mm. Root owns those follow-up edits; this task changed only this scope note.

## Do not replace unrelated numbers

CSS paddings, opacity/animation fractions, viewport values, font sizes, z-index and `75` within assets or checksums are unrelated. The existing `@page` A4 12 mm margin is ordinary website printing, not finished magnet geometry. `1254` artwork coordinate grids, `1200` uploaded image dimensions, 3/5 puzzle grid sizes, 49 QR modules, counts/prices, service quotas and original expiry are separate contracts. The original octagon/fold-guide PDF dimensions must remain as measured by Root. A blanket numeric replacement would damage these meanings.

## Small coherent correction batch

Use one shared finished-size constant for runtime copy, derived puzzle dimensions and crop-quality arithmetic; retain exact centimetre/millimetre/inch conversions and separate the measured flat-template geometry. Align public/Admin/source fallback, stored catalogue and current documentation in the same reviewed release. Then verify boundary tests, previews/quantities, source dimensions, new ZIP instructions and live saved catalogue. Separately validate direct laptop/Mac printing against Tim's actual fold template at Actual size with Canva removed. Native print-sheet preparation versus exact PDF generation remains a proposal requiring the template findings; no new dependency or design approval is implied by this mapping.
