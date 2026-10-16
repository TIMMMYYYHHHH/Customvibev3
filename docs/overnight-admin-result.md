# Admin workroom outcomes

Local changes for approved tasks 1 and 2, 16 October 2026. No publish, configuration changes, Cloudflare mutations or email sends.

## Workflow

- Cards drag between all four displayed stages. Each card also has a Move request control with a custom stage picker and explicit Save stage button for touch and keyboard use.
- Saves use the existing authenticated, versioned status endpoint. An immediate in-memory lock prevents rapid competing moves. The card stays in its last confirmed stage while saving and on failure.
- Visible saving, success and failure feedback is announced accessibly. Completed or failed actions focus the feedback so keyboard focus is not lost when a card moves between columns.
- Check and retry first reads the server. An already completed move is reconciled without a second mutation. An unchanged version can safely retry its original intent. A newer conflicting version requires Reload latest stage before another move.
- Board and detail read the authoritative state after saving. Detail history comes from the server; stage updates do not invoke email endpoints. A subsequent change by another editor is shown as the latest state rather than attributed to this move.
- Artwork lookup was removed from main navigation and the ordinary board/detail error flow. Existing protected `/artwork?request=...` links, routing and downloads remain unchanged. Opening a new request still provides its associated artwork directly.

## Design

- Retained Fredoka headings and DM Sans body text. Added cream card surfaces, berry actions, pale lilac/mint stage backgrounds, a restrained stitched heading accent, clear stage counts and larger movement controls.
- Board stacks on phone and uses two columns on tablet. Request details retain clear quantities, previews and a separate progress panel. Store content keeps its catalogue, pricing, image, save and backup behavior.
- Category and Availability now use the existing accessible custom combobox. The caret has explicit space, long labels wrap, list options have touch-size targets and scrolling, and keyboard navigation uses arrows, Home/End, typeahead, Enter/Space, Escape and Tab.

## Files

- `admin/Orders.jsx`, `admin/OrderDetail.jsx`, `admin/AdminShell.jsx`
- `admin/stage-move.mjs`, `admin/StageFeedback.jsx`, `admin/api.mjs`
- `admin/orders.css`, `admin/admin-shell.css`
- `src/content/Admin.jsx`, `src/content/admin.css`
- `tests/admin-stage-move.test.mjs`, `tests/fixtures/admin-orders.jsx`

## Verification

- Six workflow regressions cover rapid competing moves, original-version retries, lost responses, stale conflict reload, newer matching-stage protection, and a subsequent change observed after saving.
- Tests were written before the new workflow implementation. The later-change regression was observed failing before its fix.
- Full current Node suite passed: 135 tests at this checkpoint, including authentication, CSRF, version conflicts, status history and no automatic mail.
- Admin Vite build and asset preparation passed after final edits. Diff whitespace check passed.
- Browser fixture: `/tests/fixtures/admin-orders.html`; Store content: `?view=content`.
- First-save fixture scenarios: `?scenario=failure`, `?scenario=conflict`, `?scenario=lost-response`. Fixture mutations are memory-only and manual email is disabled. Status versions and history are enforced and a 700ms delay exposes the saving state.

## Remaining verification

The coordinating review owns desktop, tablet and phone browser interactions, matching before/after screenshots, the combined PDF, and Founders Hub updates. Those results should be appended to the combined report. These local checks are not evidence of a live deployment, real delivery, physical print quality, or live seven-day expiry. Production access protections, email controls, retention and free-tier settings were not changed.

## Browser follow-up: card drag surface

The coordinating browser check reproduced a drag failure when starting on a card title/body link, while dragging the narrow card padding correctly saved In progress. The nested link had `draggable=false`, suppressing drag initiation over most of the card. It now shares the card's `draggable={!locked}` setting; native link drag events reach the existing order-ID drag handler. Ordinary link clicks and the button/combobox exclusions remain intact. Seven relevant workflow/UI tests passed after this fix. Repeat body/title drag and ordinary click in the browser to close this regression.

## Owner review correction: 16 October 2026

Removed the thick curved colour strips from the tops of all four board columns at the owner's request. Columns retain their soft stage backgrounds and a uniform thin border. Browser inspection confirms equal 1px top/side borders with matching colours in every stage. Admin build and diff checks passed. This is a local styling-only correction; no workflow or deployment settings changed.
