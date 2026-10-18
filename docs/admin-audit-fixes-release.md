# Admin audit fixes release

Owner approved all four local fixes for publication on 18 October 2026.

Code revision: `52711f5a527b730765d978186d020895826230ad`. Rebased onto `97eb60e` to preserve the newer approved business/gallery and full-set game publication. The one collection-module conflict retains both the game definition and owner-entered Contents preservation.

## Published components

- Public workflow: https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39100743497
- Admin Worker version: `c068731a-0f4b-4986-937c-c7fd48a53b4c`.
- Private catalogue Worker version: `0e19ae7a-e050-49b7-95c9-05d1295f1daf`.

Existing admin and catalogue bindings and compatibility dates match exactly before/after publication. The existing scoped business access helper deployed the reviewed checkout through temporary absolute entry/asset paths, then restored the original local deployment configs byte for byte. No migrations, seed imports, settings resets, order changes, emails, proof replacements or credential changes were performed. A signed-in catalogue save retained every existing field and increased only its revision, verified by before/after exports.

## Verification

Fresh merged-release checks: 269 Node tests and seven Python helper tests passed; public, SSR/prerender and admin builds passed. Existing auth, CSRF, approval, expiry, manual-email and quantity safeguards remain covered. The approved local browser checks are in docs/admin-audit-fixes-local.md.

Admin and catalogue post-deployment target/protection checks passed. The public workflow completed successfully. The post-deployment check confirmed production commit 52711f5 and the existing gated, fail-closed configuration. The owner restored the normal admin session. Signed-in live checks below passed; no session bypass was used.

Evidence: output/admin-audit-release/ in the project workspace contains test/build logs, redacted deployment output, and before/after binding metadata. Secret values are never included.

## Signed-in live verification

- Protected public workflow completed and production revision matched 52711f5.
- Catalogue: retained Alphabet Contents `26 uppercase letters, A–Z`, saved the unchanged values, then reloaded. Before/after exported products, prices, images and version match exactly. Only the catalogue revision increased.
- Occasion editor: unsaved temporary Christmas headline survived All occasions and reopening. Restored the exact owner headline (including whitespace) without Save draft or Apply. The complete occasion-card text matched before/after. Existing schedules remained off; seven visible occasions and three removed occasions remained intact. Owner saved wording appeared in the real website preview.
- Keyboard controls: ArrowRight moved Wording to Schedule with focus retained. Home selected Appearance; End selected Schedule; Tab entered the Schedule panel. Exactly one tab had tabIndex 0, and the original wording remained intact.
- Orders: seven existing orders loaded with the same stages and card content before/after inspection. No order writes or emails occurred.
- Artwork: private individual image downloaded as a valid 525,371-byte JPEG. Existing 60-image order bulk download completed as a 31,534,199-byte ZIP with 61 entries (60 JPEGs and its extra file); all CRC checks passed. The download exceeded the browser automation call's 30-second limit but completed successfully without a retry.
- Approval-required order: submitted artwork was correctly labelled original and not for printing, and Download current proof stayed disabled before a proof existed.

The replacement-proof bug's cross-request file selection, quantities, approval states and expiry are verified by local synthetic regression and browser fixtures. No production proof was replaced merely for testing. Live checks validate existing downloads and the deployed safeguards, not a fabricated replacement on a customer order.

## Tracking

All four existing Founders Hub subtasks were updated with live evidence and marked Done. A fresh page reload and reopening the parent confirmed all four persisted and the parent has 9/13 completed subtasks. The parent launch-check task remains In progress because other launch requirements remain. Screenshot evidence is in output/admin-audit-release/founders-hub-complete.png in the project workspace.
