# Admin costs and finances verification

Implementation is local. This note records synthetic local checks only. No live settings, order costs, provider requests or customer emails were used. Deployment and live costing writes remain separate approval steps.

## Automated checks

Node 22.23.3. Focused command:

`node --test tests/finance-ui.test.mjs tests/finance-costs.test.mjs tests/finance-report.test.mjs tests/finance-api.test.mjs`

Tests exercise the state used by the real editor, render the real components, and test authenticated routing. Coverage includes missing versus explicit zero prices, exact decimal conversion, fractional/whole-sheet validation, retained saved snapshots, edited confirmation status, stage-version confirmation, lost response and stale/session recovery, all-page CSV traversal, saved-line exports, revision/expiry/navigation cancellation, and safe finance return links. Current final counts are recorded in the task report after verification.

## Safe local browser fixture

Start the existing local Vite preview, then open `/tests/fixtures/admin-finance.html`. The fixture has 52 synthetic orders in the current Johannesburg month. Runtime requests are handled entirely in memory; external requests, non-finance routes, email sends and beacon sends are blocked. A restrictive fixture content policy also blocks external connections and form posts. No storage is persisted.

- Default: 52-row month, two material defaults, fractional usage, sheet yield, saved override, free customer delivery with a separate courier expense, and unknown historic delivery.
- `?scenario=empty-settings`: empty settings, add/edit/deactivate entries.
- `?scenario=empty-month`: no retained orders.
- `?scenario=loading`: delayed reads for loading states.
- `?view=order`: saved costs, editable override and explicit confirmation.
- `?view=order&order=11111111-1111-4111-8111-000000000002`: unsaved historic order, current-setting estimate and unknown delivery.
- Add `&scenario=lost-response`, `&scenario=conflict` or `&scenario=session-expired` to order view to exercise explicit read/compare recovery. Settings accepts the same scenarios.
- `?scenario=report-change`: report revision changes while exporting.

The synthetic stage button changes only fixture stage/version and lets the reviewer verify that a cost draft survives. The fixture describes expired artwork while retaining order costs. The synthetic sign-in button or recovery link restores only the fixture session.

## Browser acceptance record

The controller owns actual 1440 px and 375 px browser acceptance and safe screenshots. These checks were not performed by the UI implementer. Do not interpret the automated tests as desktop, phone or live acceptance.

Pending controller checks: navigation and month pages; all-page and cost-detail downloads; settings add/edit/deactivate; order overrides/zero/missing/fractional and whole-sheet validation; visible keyboard focus and first error focus; empty/loading states; 409 read/compare; lost response without replay; restored sign-in with preserved draft; draft preserved on synthetic stage change; no horizontal page overflow at 375 px.
