# Admin order dashboard implementation plan

> For agentic workers: use superpowers:executing-plans to implement this plan inline, task by task. Do not delegate implementation unless Tim chooses delegation.

**Goal:** Give Tim a usable private order board with quantities, artwork downloads and manual customer updates while repairing the admin layout.

**Architecture:** Extend the existing admin React application and authenticated worker. Keep validated order records and workflow/send history in the security D1 database, and serve artwork through the existing private R2 service. Capture new requests before dispatching their emails; preserve request identity across retries.

**Tech stack:** React 19, Vite, Cloudflare Workers, D1, private Standard R2 and the existing Resend account. No paid dependencies or platform upgrades.

**Spec:** [Admin orders design](admin-orders-design.md), with seven-day retention for test order details approved 16 October 2026.

## Global constraints

- Migrated checkout and business Cloudflare account only. Preserve uncommitted deployment notes.
- Password gate on, preview/local sending off, payments unavailable. Do not change login throttling or bypass the current lockout.
- Seven-day expiry for test records and artwork. Do not extend expiry when opening or changing an order.
- Preserve the existing 80/day and 2,400/month shared email reservations, artwork budgets and migration rollback resources.
- No originals, customer secrets or personal fixtures in the repository or logs.
- No em dashes or diagonal arrows. Keep the approved CustomVibe fonts and palette.
- No automatic status emails, incoming inbox integration, payment acceptance or courier booking.

## Review focus

- A lost response after creating a record must not create another card or duplicate email.
- Two open admin tabs must not overwrite each other's status or send the same update twice.
- Artwork expiring during a ZIP download must produce a clear error, never a deceptively incomplete archive.
- Old artwork-only references must remain accessible without invented quantities or customer information.
- Names, locker details and customer input must remain plain text in admin, email and print instructions.

## Task 1 Private records and capture

Files: create `migrations/security/0005_orders.sql`, `security/orders.mjs`, `server/order-record.mjs` and `tests/order-records.test.mjs`; modify `security/index.mjs`, `server/submissions.mjs` and shared database test helpers.

Interfaces: `orderRecord(submission)` returns a bounded snapshot of contact, locker, item quantities/prices, magnet total and indexed artwork mapping. `orderService(request, env)` handles internal create, list, detail, status and delivery-state operations. `cleanOrders(env)` deletes expired records and related history.

- [ ] Write failing database tests: retrying the same ID returns one record; changed content returns conflict; 2 photos plus one 3x3 set preserve quantity 2/1 and total 11 with 11 unique files; catalogue-only requests work; expiry is 604800 seconds and never resets.
- [ ] Run the new tests and confirm the failures represent missing behavior.
- [ ] Add orders and history tables with expiry indexes, immutable validated snapshot, version and delivery fields. Use atomic status changes and short stable display references with collision handling. Keep full UUIDs for internal identity and old links.
- [ ] Implement cursor pagination capped at 50 records, expiry filtering and version conflict responses. Do not return private contact fields in logs or errors.
- [ ] Capture only validated, complete requests after existing send-budget reservation and before email delivery. Retry safely if record creation or delivery-state updates fail. Never duplicate an accepted request or treat provider acceptance as inbox delivery.
- [ ] Update checkout storage copy to cover private order details and seven-day test retention. Preserve unpaid acknowledgement language.
- [ ] Verify retry, timeout, changed-payload, incomplete-upload and catalogue-only tests alongside existing submission and artwork tests.

## Task 2 Authenticated APIs and downloads

Files: create `admin/orders-api.mjs`, `admin/order-archive.mjs`, `tests/admin-orders.test.mjs` and `tests/order-archive.test.mjs`; modify `admin/worker.mjs` and the relevant artwork response path.

Interfaces: `GET /api/orders` lists cards; `GET /api/orders/:id` returns details; `POST /api/orders/:id/status` accepts `{status, version}`. Artwork continues through the existing authenticated route. `downloadOrderArchive(order, fetchFile)` creates a browser-side uncompressed ZIP containing unique files and UTF-8 print instructions, with at most 60 files/32 MB artwork.

- [ ] Write failing tests for signed-out access, invalid sessions, expired orders, wrong-origin/CSRF mutations, invalid transitions, version conflicts and malformed IDs.
- [ ] Implement the APIs behind the existing admin gate with bounded JSON bodies, no-store headers and explicit method validation. Public site routes cannot reach them.
- [ ] Preserve old reference URLs and safe internal return navigation after login. Do not accept external redirect destinations.
- [ ] Implement archive assembly in the browser to avoid adding server ZIP CPU load. Use deterministic safe filenames, CRC32, checked sizes and an instruction file describing copies, set counts and proof-only files. Cancel the whole archive on any missing/expired/failed download. Revoke temporary object URLs.
- [ ] Verify ZIP structure with an independent ZIP reader. Test Unicode names, malicious input escaping, 26-file puzzles, mixed quantities and failed downloads. No partial download is labelled complete.

## Task 3 Manual emails

Files: create `server/order-update-email.mjs`, `admin/order-mail.mjs`, `tests/order-updates.test.mjs`; extend `security/orders.mjs` and `admin/orders-api.mjs`.

Interfaces: preview an update for a stored order/status; send only the stored recipient and server-generated message using a stable update ID tied to order/status version. Store claim, provider acceptance or failure/uncertainty without recording secrets.

- [ ] Write failing tests for concurrent clicks, expired orders, changed status after preview, recipient overrides, exhausted shared budgets, disabled sending and provider timeouts.
- [ ] Implement server templates for the four stages with truthful unpaid/testing wording. Return preview text to the UI and validate the same status version at send time.
- [ ] Atomically claim each update and reserve one message against the same daily/monthly counters used by submissions. Status changes alone never send.
- [ ] Send through the existing business Resend account with a stable idempotency key. Keep uncertain outcomes held for manual checking, rather than blindly dispatching a fresh attempt. Do not allow retries beyond provider idempotency guarantees without review.
- [ ] Require explicit production admin sending configuration and owner-controlled test recipients. Add required secret configuration through the existing hidden-input setup workflow, never through source or chat. Keep local/preview off.
- [ ] Verify that user-facing history says provider accepted, failed or uncertain, and does not promise delivery to the inbox.

## Task 4 Responsive admin interface

Files: create `admin/AdminShell.jsx`, `admin/admin-shell.css`, `admin/Orders.jsx`, `admin/orders.css`, `admin/OrderDetail.jsx` and a synthetic local admin fixture; modify `admin/main.jsx`, `admin/Artwork.jsx`, `src/content/admin.css` and `tests/live-render.test.mjs` where appropriate.

Interfaces: Orders is the landing view; Store content retains its existing catalogue/pricing/images controls. Order detail consumes the APIs above and offers status selection, preview/send, image preview and archive download.

- [ ] Render the existing standalone admin locally and record the missing wrapper/style issue before changing it.
- [ ] Add a deliberate scoped shell with navigation, fonts, spacing, button styles and focus treatment. Preserve content-editor saving/import/export behavior and warn before leaving unsaved edits.
- [ ] Add four desktop columns and a mobile stage selector/list. Each card has customer, date, short reference, magnet count, unpaid badge and email state.
- [ ] Add detail view with contact/locker information, clear Print N copies labels, puzzle sets/pieces, proof-only labels, expiry and download controls. Retain reference lookup for legacy requests and show when order details are unavailable.
- [ ] Add manual email preview and send history. Disable repeated clicks and recover clearly from expired sessions or conflicts without losing unsent edits.
- [ ] Test locally with synthetic one-photo, 3x3, 5x5, three-photo, mixed quantity, expired and uncertain-email examples. Inspect at 1440 px and 390 px plus keyboard navigation. No live messages from fixtures.

## Task 5 Verify and publish behind the gate

Files: deployment configuration and existing setup scripts as needed; update this plan and the existing Hub tasks after meaningful verified milestones.

- [ ] Run all Node tests, public build and admin build. Check diffs for credentials, customer data and unintended changes to access controls.
- [ ] Review record expiry, concurrent updates, uncertain sending, quota sharing, auth boundaries and download completeness. Fix findings and rerun affected checks.
- [ ] Verify deployed account/project, current protections and rollback-resource retention before any remote change. Never use default credentials pointing at the personal account.
- [ ] Apply additive D1 migration, publish security/admin/public changes in dependency order and verify gates, private routes, disabled previews and payments. Do not remove old resources or tables.
- [ ] Tim signs in after the temporary lockout clears. Submit one owner-controlled mixed test, open its card without pasting a reference, check quantities/previews/downloads, move status and explicitly test a manual update email.
- [ ] Record exactly what passed in the existing Hub tasks. Keep physical print checks, seven-day live expiry and production retention policy open until verified or decided.

## Review before execution

Implement inline in this chat, then review the complete change. Scope and test retention are approved; this build plan is ready for Tim's review before code changes. The layout can be inspected locally while live login is locked, without changing authentication.
