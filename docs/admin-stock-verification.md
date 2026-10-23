# Admin stock verification

23 October 2026. Build authorised by the owner-approved simple stock design. The combined branch also removes unused manual artwork revision controls. No stock migration or production release has occurred at this stage.

## Acceptance and evidence

The approved specification is `docs/superpowers/specs/2026-10-23-admin-stock-design.md`; implementation plan is `docs/superpowers/plans/2026-10-23-admin-stock.md`. The owner-facing operation guide is `docs/admin-stock-runbook.md`.

Local evidence is being collected under `.superpowers/sdd/2026-10-23-admin-stock/`. Backend, Admin controls and independent review are separate gates. Focused reports do not establish a passed final integrated suite or live acceptance.

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
