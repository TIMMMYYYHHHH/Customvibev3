# Fulfilled orders implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the approved grouped Table view, delivered/collected Fulfilled stage, independent artwork expiry and manual thank-you email.
**Architecture:** Extend the existing D1 order service, preserving optimistic version checks and authenticated manual email controls. Separate artwork expiry from order expiry. Use the existing shared admin shell and email layout.
**Tech Stack:** React, Vite, Cloudflare Workers/D1/R2, node:test.
**Spec:** Owner decisions recorded below and in Founders Hub order-dashboard subtasks.

## Global constraints
- Fulfilled means delivered or collected. Stage changes never send mail or change unpaid status.
- Six calendar months from submission for unfinished orders; six calendar months from completion for fulfilled orders. Reopening retains the established expiry until fulfilled again.
- Artwork, proof images and review access expire 14 days from original submission; no extension on completion, replacement or reopening.
- Retain contact/delivery, product quantities, prices, stage/send history and approval audit for the order lifetime. Remove artwork-specific manifests, proof capabilities and design personalization after artwork expiry.
- Option 2: grouped table, collapsible stage headers, latest three fulfilled by completion time, older disclosure with count, search across older records, remembered Board/Table choice.
- Google review link remains unset until verified. Thank-you only until then. Existing Preview/Send controls; no automatic or duplicate fulfilled sends after reopening.
- Preserve completed admin search, proof confirmations, sign-in recovery, truthful unpaid state, gate, separate admin auth, free tier. No real emails from fixtures.

## Review focus
- More than 50 active or fulfilled records: globally correct counts/order and bounded pagination.
- Month-end/leap-year completion: six calendar months clamped to destination month.
- Concurrent fulfill/reopen/send: version protection, immutable artwork expiry and fulfilled duplicate guard.
- Expired proof access before scheduled cleanup: no image, token or edit access; retained approval permits later delivery.
- Delayed search responses and collapsed groups: older matching orders remain visible, stale responses ignored.

### Task 1: Retention and Fulfilled service
Files: security/orders.mjs, security/proofs.mjs, security/artwork.mjs, migrations/security/0008_order_history_retention.sql, server/order-retention.mjs, tests/fulfilled-orders.test.mjs.
Interfaces: order views expose artworkExpires, fulfilledAt, subtotalCents; orders list accepts fulfilled cursor independently from active pagination.
- [x] Add failing integration tests for completion expiry, month end, correction, no email, expired artwork, proof access and independent cleanup.
- [x] Add migration, retention helpers and transactional status logic. Preserve active historical records and never revive expired ones.
- [x] Run focused and full test suites, record results.

### Task 2: Board and grouped Table
Files: admin/Orders.jsx, admin/orders.css, admin/order-groups.mjs, admin/OrderDetail.jsx, tests/order-groups.test.mjs, tests/fixtures/admin-orders.jsx.
Interfaces: shared grouped view model produces visible rows and older count; same detail and manual update controls for both views.
- [x] Add failing tests for latest-three, equal dates, search disclosure and remembered view fallback.
- [x] Implement accessible table, board disclosure, pagination and expired-artwork details. Preserve mover and search recovery.
- [x] Verify desktop/phone, keyboard, search, reload and older history in synthetic local browser fixture.

### Task 3: Fulfilled thank-you email
Files: server/order-update-email.mjs, admin/order-mail.mjs, admin/orders-api.mjs, security/orders.mjs, tests/order-updates.test.mjs.
Interfaces: orderUpdateEmail(order,{googleReviewUrl}) uses validated optional link; identical Preview/Send configuration.
- [x] Add failing tests for thank-you fallback, valid/invalid link, escaping and duplicate protection across reopen.
- [x] Implement brand-matched HTML/text, manual preview/send and one fulfilled email attempt per order.
- [x] Verify preview visually and tests without sending real mail.

### Task 4: Alignment and release verification
Files: AGENTS.md, current customer retention copy, docs/operating-mode.md, release notes; existing Founders Hub records.
- [ ] Align policy wording, migration/deployment instructions and service follow-ups.
- [ ] Run full suite and paired public/admin builds; fresh review; resolve material issues.
- [ ] Publish within approved scope only after verified readiness, preserving latest concurrent changes; verify guards and read-only live views.
- [ ] Update existing Hub subtasks and verify saved statuses. Keep Google link blocked and real recipient/mobile email acceptance separate.
