# Admin stock verification

23 October 2026. Build authorised by the owner-approved simple stock design. The combined branch also removes unused manual artwork revision controls. No stock migration or production release has occurred at this stage.

## Acceptance and evidence

The approved specification is `docs/superpowers/specs/2026-10-23-admin-stock-design.md`; implementation plan is `docs/superpowers/plans/2026-10-23-admin-stock.md`. The owner-facing operation guide is `docs/admin-stock-runbook.md`.

Local evidence is retained under `.superpowers/sdd/2026-10-23-admin-stock/`. Backend and UI task reviews, scoped fix reviews and the combined stock/artwork review passed. Review corrected D1 parameter growth at 100 materials and refreshed quantity suggestions after the first saved order costs. Focused reports do not establish live acceptance.

At application candidate `dc9a63b4cfb36a6a65ba1d506dc4f155680da41c`, public, SSR/prerender and Admin builds plus shipped dependency-notice checks passed on Node 22.23.3. The integrated Node run passed 961 of 962 checks. Its sole failure was the existing permission-isolated fallback CLI fixture resolving dependencies through an ignored shared symlink outside its allowed directory. Replacing that symlink with an identical local APFS dependency clone, without an install, version or source change, passed all 14 fallback checks. Seven Python helper checks passed. The initial failure is retained in the evidence, not relabelled as a clean full run. Exact-head hosted validation remains required before merge.

Focused stock evidence: 23 backend checks and 22 UI/client checks passed. The D1-sensitive cases exercise 100-material use, reverse and reconfirmation with at most 17 bound values per query, stale versions, shortage and transaction rollback. A real loopback lost-response case confirms one deduction after a committed response is lost. Synthetic browser checks at 1280 px and 390 px cover purchases, mismatched quantities, reversal and reconciliation with visible keyboard focus and no horizontal overflow. These are local results, not live provider or owner stock-transaction acceptance.

Required cases include initial stocktake, receipts and prospective prices, whole sheets, cost/stock unit mismatch, per-order overrides, all-or-nothing shortages, concurrent versions, lost success response, exact once-only reversal, later-stocktake reversal blocking, temporary order-link expiry, stable bounded CSV and keyboard/phone layout. Fixtures use synthetic data without production writes or email.

## Release gate, pending

- Independent backend and UI reviews, then combined branch review.
- Fresh complete application tests, public/SSR and Admin builds, and existing release/dependency checks on the actual candidate.
- Fresh GitHub source/CI health and source identity, additive migration hash/schema proof, current D1 and service headroom, matching compiled artifact and rollback bindings.
- Concrete authority for the new candidate's protected merge, migration 0014 and matched publication. Previous finance-release approval does not authorise a new migration or candidate.
- Read back each completed operation before proceeding. Never replay an uncertain provider write.

## Live acceptance, pending

Verify the matching release identities and retained access gates, payments disabled, manual email controls, existing catalogue and saved order amounts. Confirm the Stock tab and readonly artwork section render and that preview, download and print controls remain accessible. Read-only release checks must not save real costs, stock or orders or send email. Any live stock transaction needs a named test scope agreed with Tim first.

The earlier owner print result and phone/email checks remain valid historical evidence. Repeat relevant final checks on the completed launch candidate. Neither a local fixture nor this document establishes a launch date or a 10/10 score.
