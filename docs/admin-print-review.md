# Admin print implementation review, 21 October 2026

Reviewed the current uncommitted feature on `codex/admin-print-sheets-63mm`, based on `0d3009c`, against repository AGENTS.md and the approved implementation plan. Read-only source review; only this review record was written. No production, browser, provider, index or commit changes.

## Findings requiring correction

1. **P1: valid game and completed historical artwork cannot print.** `admin/print-layout.mjs:41` and `:72` reject filenames emitted by existing trusted application helpers: `design-01-noughts-crosses-1.jpg` from `server/submission-model.mjs` `artworkManifest`, and `design-01-face-1.jpg` from `src/proof-manifest.mjs` `proofRows` for assisted orders without an original file. Both were reproduced by calling those actual helpers and then `createPrintJob`: both fail with the invalid artwork manifest message despite complete counts. Extend the bounded filename support to these existing formats, retaining positional identity checks, and add fixtures from the real helpers. This is compatibility with working workflows, not a new approval flow.

2. **P2: the calibration preview hides guides present in its PDF.** `admin/PrintSheet.jsx:18-19` places the octagon before the image; `admin/print-pdf.mjs:33-34` places the image before the octagon. At the supported 70 mm image extent, the square corners cross the octagon diagonals, so SVG hides guide segments which PDF visibly prints over the image. Draw SVG guides after the image and use the same plum stroke as PDF. Shared geometry already matches; this is a rendering-order/color correction.

3. **P2: expiry starts a continuous render loop.** `admin/PrintSheet.jsx:50` depends on `clock` and schedules a new timeout using `Math.max(1, remaining+1)`. Once artwork expires, every tick schedules another tick in 1 ms indefinitely. Do not schedule another timeout when `remaining <= 0`. The deadline tick already refreshes `clock`, causing the preview and download control to expire. Verify one deadline transition and no continuing timer.

## Verified scope and limits

- Fresh focused run: 18 tests passed, 0 failed across `admin-print-layout`, `admin-print-pdf` and `print-artwork-transport`. These tests do not cover the three findings above.
- Current revision and snapshot formats were compared with `security/proofs.mjs`, `server/order-record.mjs`, `server/submission-model.mjs` and the existing shared proof-row helpers. Explicit current-revision copies, selected quantities and puzzle proof exclusion are handled. The filename compatibility gap above is the discovered blocking mismatch.
- Preparation and PDF download use authenticated reads, bounded private bytes, optional historical hashes and current SHA checks. Before/after revision/version/digest checks reject stale jobs. No source mutation, email send, payment action, stage change or retention extension was introduced by the print modules.
- Shared size correction preserves customer compositions, existing artwork coordinate grids, 1200 px export contracts and saved snapshots. Default face is 63.5 mm; enlarged image extent is explicit. Calibration rejects overlap and off-page outer bounds.
- PDF loads dynamically on download. Existing JPEG masters are reused verbatim, four required `@customvibe` labels remain live text per magnet, and rotation conversion shares the SVG model.
- Root owns full-suite/build/browser and rendered-PDF verification. Historical logs were not treated as current failures. Physical print readability and QR scan acceptance remain owner checks, without reinstating printer-model or photo prerequisites.

## Recheck

The three findings are resolved in the current source. Narrow recheck completed:

- `print-layout.mjs` now derives exact positions and proof flags from the same `proofRows(snapshot)` helper used by the trusted proof service. The bounded allowlist accepts real game names and generated historical `face-N` names. The fallback is limited to positions with no original source filename; it does not admit arbitrary renamed puzzle tiles or assembled proofs as printable tiles.
- SVG now renders customer image, plum guides, then branding in the same order as PDF. Coordinates, stroke width and colour match the PDF model, including the advanced image extent.
- The expiry effect returns when the deadline has passed, so it cannot reschedule the 1 ms loop. This was checked directly in the effect logic; a browser timer simulation was not run by this reviewer.
- The additional `onOrderRead` callback runs only after authenticated source reads and the final revision check. It refreshes the parent's order and invalidates the existing mail preview while retaining the unsaved stage selection. It does not invoke a write, move a stage, send a message or trigger another preparation effect, whose dependency remains the order ID. This removes the stale parent-version mismatch after Prepare again.
- Fresh recheck run: **20 tests passed, 0 failed**, including the two new compatibility cases built from actual `artworkManifest` and `proofRows` helpers, plus existing PDF and private transport checks.

**Verdict: review clear for the implementation scope.** No unresolved findings from this review. Root retains ownership of complete-suite/build/browser and rendered-PDF verification. No additional tools, security gates or customer approval requirements are proposed.

## Final narrow delta recheck

Reviewed the subsequent move of dimensions to `src/print-dimensions.mjs`, all runtime import references, the corresponding current AGENTS/plan/size/print-workflow documentation, archive filename compatibility and transport limit reuse.

- Runtime references consistently target the new source location. The existing release classifier already recognises `src/`; no classifier or activation guard was changed. Documentation accurately distinguishes this source classification from the separately required supported publication transition.
- The ZIP filename addition admits the same existing game and completed `face-N` formats as the print engine. Existing safe-name checks remain. The new archive regression verifies both real formats survive ZIP creation.
- Private print transport now reads the existing central 60-file, 4 MB-per-file and 32 MB-request limits. It preserves cancellation, exact byte counts and SHA verification; this removes a redundant looser per-file constant without widening a limit.
- The fallback-content test still denies network, writes and child execution. Its added exact-file read permission is within the existing allowed `src/` tree. The unchanged isolation assertions passed.
- Fresh reviewer run: **45 tests passed, 0 failed** across print layout/PDF/transport, ZIP archive, crop quality and fallback-content suites using the bundled Node v24.19.0. Root owns the final Node 22 full suite and matching build/notices run; those results are not asserted here.

**Final delta verdict: review clear.** No new blocking issue in this delta. Documentation retains truthful local/publication/physical acceptance boundaries and the original operating protections.
