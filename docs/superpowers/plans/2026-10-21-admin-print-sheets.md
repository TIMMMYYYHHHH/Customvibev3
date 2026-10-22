# Admin print sheets and confirmed magnet size implementation plan

Current owner edge-coverage correction, 21 October: default and Reset use a 68 mm printed image extent, adding 2.25 mm wrap beyond each edge of the unchanged 63.5 mm face. This supersedes the original 63.5 mm image default in this historical plan; the 63.5 to 70 mm advanced range remains.

**Goal:** Prepare current private order artwork as correctly counted, branded six-position A4 sheets without Canva, and correct the product face to 63.5 mm.
**Authority:** Tim approved the proposed Admin preview/calibration/PDF flow on 21 October. Keep @customvibe on folded backs, use existing branding, and do not require printer details or sample photos before implementation. His Samsung Chrome/Firefox/Gmail/Outlook check passed generally; repeat device checks before launch, without claiming unreported individual accessibility checks.
**Architecture:** A pure placement/counting model feeds a small browser PDF renderer and the Admin preview. Existing authenticated downloads supply exact saved JPEGs. Shared physical-size constants feed storefront guidance and print instructions. No new backend, schema, cloud renderer or paid service.
**Execution:** Parallel workers own size correction and pure print engine; Root owns UI, integration, dependencies, Hub and release preparation. Independent review follows integration.

## Constraints and decisions

- Finished face: 63.5 x 63.5 mm / 2.5 inches. Keep 1200 px exports. Do not change stored old order snapshots or customer crop.
- A4 210 x 297 mm. Six measured outer octagons, 87.20 x 86.19 mm, two columns and three rows, lefts 7.93/114.87, tops 5.52/105.41/205.29 mm. Use consistent centred faces, not unequal old placeholder clips.
- Default image square 63.5 mm, preserving full composition. An explicit advanced image-size control allows up to 70 mm for wrap margin, clearly explaining that image edges then extend past the finished face. No hidden bleed/recrop or claimed physical calibration.
- Retain @customvibe on all four fold flaps, correctly rotated; replace the old @mypicmag label. Use existing puzzle logo and berry/plum brand accents in fold areas only, without coating the entire back with ink. No branding on customer face.
- Calibration in memory only: sheet X/Y, row/column spacing, selected-slot X/Y, image size, outlines toggle, reset. Validate bounds and reject overlapping/off-page layouts. No browser storage or public catalogue printer settings.
- Prepare/download are read-only. Latest proof revision when present, otherwise current snapshot. Exclude assembled proofs and unfinished references. Exact copies, filename/index/request identity, response content type/size/hash, expiry and before/after order revision checks. No silent partial output.
- Revoke object URLs on change/close/unmount. Bound unique files/bytes and expanded quantities to existing order limits. No email, stage, payment, retention or authentication changes.
- Root will update stored live catalogue only by scoped authenticated optimistic saves after code validation; never upload fallback JSON over it.

## Review focus

Changed order while preparing or downloading; missing/expired or tampered JPEG; reference images counted as tiles; quantities larger than preview capacity; out-of-bounds numeric controls and branding orientation. Each must have a meaningful engine or browser check.

## Task 1: confirmed size, quality guidance and current instructions

- [x] Worker owns src/print-dimensions.mjs, existing size-bearing src files, data/site-content.json, admin/order-archive.mjs, relevant tests, AGENTS.md and a concise current size note. Do not edit OrderDetail, package files or print modules.
- [x] Export MAGNET_FACE_MM=63.5, MAGNET_FACE_CM=6.35, MAGNET_FACE_INCHES=2.5, MAGNET_SIZE_MM_TEXT='63.5 × 63.5 mm', MAGNET_SIZE_CM_TEXT='6.35 × 6.35 cm'. Derive puzzle dimensions and PPI from the shared constant.
- [x] Pin 749/750 and 374/375 source-pixel quality boundaries before implementing, including zoom/puzzles; preserve export resolution and historical evidence.
- [x] Run focused tests, review live catalogue update scope separately, report files/counts. Do not commit while others edit the shared checkout.

## Task 2: pure job model and PDF

- [x] Worker owns admin/print-layout.mjs, admin/print-pdf.mjs and tests/admin-print-*.test.mjs. Root installs pinned pdf-lib. No UI/package/archive/source-size edits.
- [x] Interfaces: createPrintJob(order, options={}) returns reference, revision, version, expiresAt, files and pages. Each page has placements with file, xMm, yMm, imageMm, slot index and outer polygon/branding positions. getPrintCalibration(options) validates defaults/bounds. exportPrintPdf(job, artwork, {logoBytes}) returns Uint8Array. artwork is Map keyed by file.name containing Uint8Array JPEGs. Export required helpers/types in module comments, tell Root exact final interface.
- [x] Tests first: seven copies/two pages, eighteen puzzle tiles/three pages, twenty-five/five pages, current revision and explicit copies, no proof/reference, incomplete/invalid manifests, calibration bounds, overflow and output PDF A4/image reuse/branding/face geometry.
- [x] PDF embeds unchanged JPEGs and logo with vector outlines and rotated live @customvibe text. Do not embed customer contact data. Selected page preview can use generated PDF; no separate divergent geometry.

## Task 3: Admin integration and verification

- [x] Root owns admin/PrintSheet.jsx, admin/print-sheet.css, admin/print-artwork.mjs, OrderDetail integration, package/lock, focused transport/browser fixture tests and owner notes.
- [x] Add Prepare print sheet next to Download all, disabled while busy, stage save/conflict or artwork expiry. Inline panel, existing flat controls, job counts/page navigation/calibration/download/close.
- [x] Fresh read order, prepare validated private bytes sequentially with bounded totals and SHA256 where provided, re-read revision before exposing PDF. Recheck latest/expiry before final download. Errors explain retry/sign-in without submitting changes.
- [x] Use generated PDF for preview and download. PNG/SVG thumbnail fallback can only use same model and exact bytes. Avoid external PDF viewers/services.
- [x] Run focused and full application tests, site/Admin builds, independent code review, two viewport browser checks and rendered synthetic PDF inspection. Document physical testing as still outstanding, not a blocker on implementation.
- [ ] Brief Hub milestones: print implementation, separate size correction, owner phone check with prelaunch repeat. Existing history retained. Check current GitHub state and exact tests before any release; preserve paired storefront/Admin release and current release protections.

## Ledger

- Ready: reviewed existing downloads and template, confirmed current main 0d3009c; using clean dedicated source checkout on codex/admin-print-sheets-63mm, leaving the fixed production release-helper checkout untouched.
- Ruling: printer identity and sample photos are optional calibration aids, not implementation prerequisites, as explicitly directed by Tim.
- Ruling: default preserves the full saved image on a 63.5 mm face; any larger image extent is an explicit owner adjustment. Retain measured fold-outline geometry independently.

- Ruling: runtime dimensions live in src/print-dimensions.mjs, beside existing business configuration. This fits the current source classifier without adding tooling exceptions. Closed activation profiles still need a reviewed feature transition before publication.

- Verified: final Node22 application775/775, Python7/7, matching builds/notices, npm production advisory audit zero, independent review clear; browser download/calibration/stale-order checks and two rendered synthetic PDF pages. Phone owner pass is for the previous live version; new Admin print feature remains unreleased.
