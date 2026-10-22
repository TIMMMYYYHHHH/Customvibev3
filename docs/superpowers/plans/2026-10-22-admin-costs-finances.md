# Admin Costs and Finances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Tim editable pack-based costs, per-order cost snapshots and overrides, monthly projected margins and an Excel-compatible CSV inside Admin.

**Architecture:** Keep costing and report formatting pure, store private versioned records in the existing Security D1 database, and access them through authenticated Admin routes. Reuse the existing Admin shell and session recovery. Four work packages below deliver the first stage; stock and archive/reopen follow separately.

**Tech Stack:** Existing JavaScript ES modules, React 19, Vite, Cloudflare Workers/D1, Node test runner and existing SQLite fixtures. No new package or paid service.

**Spec:** [Approved design](../specs/2026-10-22-admin-costs-finances-design.md).

## Global Constraints

- Editable pack prices and quantities; calculate unit costs; allow per-order changes; omit wastage.
- No stock count, batch allocation, purchase register, supplier directory or restock alert in this stage.
- Money is stored and validated in integer cents. Round complete cost lines to the nearest cent, half up; total those rounded lines.
- Preserve the original 14-day artwork expiry and six-calendar-month order history. Cost records expire with their order; settings do not extend it.
- Current orders remain Unpaid. No Mark paid control, received-income inference, automatic customer update, price change or payment enablement.
- Monthly reports cover retained orders only. Show their available date range and unknown/missing figures explicitly.
- Reuse AdminChrome, workroom styles, session recovery and authenticated internal calls. No em dashes, diagonal arrow icons, decorative side-stripe notices or redesigned artwork buttons.
- Local tests use synthetic records with external network and email sends blocked. Do not seed production prices or backfill historical costs.
- No subscriptions, periodic polling, image storage or provider integration. Verify account headroom and existing release validation before deployment.

## Review Focus

1. Fractional pack costs must round per complete line, not after prematurely rounding each unit. Task 1 pins this.
2. Missing costs and unknown historical shipping must remain unknown, never produce a misleading zero or profit. Tasks 1 and 3 pin this.
3. Two tabs, expired sessions and a lost save response must preserve edits without overwrites or automatic write replay. Tasks 2 and 3 pin this.
4. Expired orders and private costs must remain inaccessible to public/customer routes, including after cleanup and rollback. Tasks 2 and 4 pin this.
5. A month boundary in Johannesburg and spreadsheet-formula text must not corrupt report membership or CSV values. Tasks 1 and 2 pin this.

## File map and shared contracts

New pure files: `shared/finance-costs.mjs` for validation/calculation; `shared/finance-report.mjs` for month boundaries, summaries and CSV. New private files: `security/finance.mjs`, `admin/finance-api.mjs`, and migration `migrations/security/0013_admin_finance.sql`. New UI: `admin/Finances.jsx`, `admin/CostSettings.jsx`, `admin/OrderCosts.jsx`, `admin/finance.css`. Reuse `admin/api.mjs` and `admin/session-recovery.mjs` unchanged unless a focused error message adjustment is needed.

Cost entry shape: `{id,name,category,unit,packCents,packQuantity,basis,usageMilli,magnetsPerSheet,active}`. Categories are `materials|printing|packaging|courier`; basis is `per_magnet|per_sheet|per_order`; `usageMilli` represents thousandths of a unit. Pack quantity and sheet yield are positive safe whole numbers. `packCents:null` means missing; explicit zero is valid. Names are plain text, at most 80 characters; unit labels at most 24. Sheet entries consume whole sheets. New entry IDs are UUIDs; there is no client-created arbitrary SQL or field name.

Saved settings: `{version,entries,updatedAt}`. An order cost record contains `{orderId,version,orderVersion,status,lines,complete,totalCents,updatedAt}`, where status is `estimated|confirmed`. Each line copies all pricing/usage fields needed to calculate it and records derived `amountCents`; deactivation or later setting edits cannot change it. No customer identity, artwork or accepted order snapshot is copied into these records.

Admin write bodies are bounded to 64 KiB and 100 cost entries/lines, separate from the existing order/magnet capacity policy. Validate these limits both at the Admin boundary and internal service. Never introduce a new magnet-quantity cap. Arrays use deterministic order, explicit exclusions and distinct IDs. Server recalculates every amount and completeness flag.

## Task 1: Cost arithmetic and report/export rules

**Files:** Create `shared/finance-costs.mjs`, `shared/finance-report.mjs`, `tests/finance-costs.test.mjs`, `tests/finance-report.test.mjs`.

**Interfaces:** `validateCostEntry(entry)` returns a normalized entry or throws a validation error. `calculateCostLine(entry,usageMilli)` returns integer cents or null for missing price. `estimateOrderCosts(settings,magnetQty)` returns an unsaved draft with lines, completeness and nullable total. `monthRange(month)` returns `[startSeconds,endSeconds)` for an exact `YYYY-MM` in Africa/Johannesburg. `summarizeFinanceRows(rows)` returns known value/cost totals, counts of missing/estimated records and margin over eligible rows only. `financeCsv(rows,{detail:false})` returns UTF-8 CSV text; detail mode produces the saved cost-line breakdown.

- [ ] Write failing named tests for pack division, whole-sheet use, overrides, explicit zero, missing inputs, invalid/negative/non-finite values and overflow. Exact assertions include `calculateCostLine({...entry,packCents:1000,packQuantity:3},2000) === 667`, one unit of that entry equals 333, and eight magnets at six per sheet consume two sheets. Use rational integer/BigInt intermediates, not rounded unit prices or floating-point currency arithmetic.
- [ ] Add report tests: `monthRange('2026-11')` starts at `2026-10-31T22:00:00Z`; an order at the end bound belongs to December. A row with missing delivery or unsaved/missing costs has a blank margin; a free-delivery row can have a positive courier expense. CSV escapes quotes/newlines, uses blank for null, protects text beginning with `=`, `+`, `-`, `@` or leading control characters, and never exports contact fields. Preserve legitimate negative numeric margins as numbers.
- [ ] Run `node --test tests/finance-costs.test.mjs tests/finance-report.test.mjs`; verify the new behavior fails before implementation.
- [ ] Implement the declared pure interfaces. Reject invalid months and unsafe results. Report data uses saved historical amounts, not current price defaults; no blanket multiplication of current unit price by old magnet quantities.
- [ ] Repeat the focused command; require zero failures/skips. Commit this independently testable package as `feat: add private order costing calculations`.

## Task 2: Private settings, order snapshots and monthly data

**Files:** Create `migrations/security/0013_admin_finance.sql`, `security/finance.mjs`, `admin/finance-api.mjs`, `tests/finance-service.test.mjs`, `tests/finance-api.test.mjs`. Modify `security/index.mjs`, `security/orders.mjs`, `admin/worker.mjs`, `tests/retention-acceptance.test.mjs`; reuse `tests/helpers/artwork.mjs` for real SQLite migrations.

**Interfaces:** `financeService(request,env)` consumes internal POST `/finance/{settings-read,settings-save,order-read,order-save,order-confirm,month}`. `financeAPI(request,env,session)` owns authenticated `/api/finance/settings`, `/api/finance/orders/:id`, `/api/finance/orders/:id/confirm`, `/api/finance/month?month=YYYY-MM&before=SEQ`. GET reads; POST writes using existing `api(path,body)`/CSRF conventions. Proxy only explicitly allowed fields; never trust a client actor.

Migration tables: singleton `finance_settings(version,payload,updated_at)`; `order_costs(order_id PRIMARY KEY,version,order_version,status,payload,updated_at)`; `finance_changes(seq,order_id,kind,before_payload,after_payload,actor,created)`; singleton `finance_report_state(revision)`. Settings changes use null order_id. Use atomic version-checked writes plus audit insertion in one transaction. Six small insert/update/delete triggers on orders and order_costs increment the report revision, without changing existing order rows. The current login has no individual staff identity: use `authenticated-admin` as actor, without storing tokens, session IDs or pretending to identify Tim. Add an `orders(created,seq)` index for month paging. Do not rely on SQLite foreign-key enforcement alone for cleanup.

- [ ] Write failing SQLite/service tests: empty settings; save/deactivate settings; no GET side effects; first cost save copies defaults; later settings edits preserve snapshots; per-order overrides remain isolated; saving edits resets Estimated; confirming requires complete costs and matching cost/order versions. Two tabs saving the same version produce one success and one 409; stale confirmation fails. Unknown/expired order reads and writes fail without inserts. Accepted snapshot/stage/version/expiry and email state never change.
- [ ] Write API tests for unauthenticated requests, bad Origin/CSRF, wrong methods/content type, oversized body/arrays, unknown keys/actions, malformed IDs/cursors and no public route. Prove actor spoofing is ignored/rejected. Reads return explicit nullable cost records, not fabricated saved estimates.
- [ ] Write retention tests: original artwork expiry remains unchanged, cost reads deny at exact order expiry, and hourly `cleanOrders` removes order-cost records and their order-linked audit rows in the same batch before orders. Settings and unrelated live orders remain. Test an old-schema deployment followed by the additive migration against a fresh fixture.
- [ ] Run `node --test tests/finance-service.test.mjs tests/finance-api.test.mjs tests/retention-acceptance.test.mjs`; verify meaningful failures before implementation.
- [ ] Implement using Task 1 calculation contracts. A save takes `{version,orderVersion,lines}` with version 0 for no prior record; a separate confirmation takes `{version,orderVersion}`. Recheck live order/version in the write transaction; increment cost versions without changing order versions. Each accepted mutation inserts its before/after audit atomically. Bound payloads, use prepared SQL and no secrets/customer data in logs.
- [ ] Implement month data as scalar projections only: reference, created, stage, magnet count, saved customer amounts, cost version/status/completeness, nullable complete cost total and sum of known cost lines, all Unpaid. Filter `expires>now` and month range. Return up to 50 rows with keyset cursor, all-month aggregate counts/totals, earliest retained creation date, report revision and earliest included order expiry (`validUntil`). Read revision before and after the read batch and reject changed results. Export pins/rechecks the revision across pages and once before download; reject if an included order has expired, even before hourly cleanup. Discard changed exports and ask for a fresh explicit export. Test changes and expiry between pages. No periodic polling, entire cost-line payloads or full artwork/contact snapshots in monthly responses.
- [ ] Re-run focused tests and existing `tests/admin-security.test.mjs`, `tests/order-records.test.mjs`, `tests/fulfilled-orders.test.mjs`; require zero failures/skips. Commit as `feat: persist private Admin costs and monthly summaries`.

## Task 3: Simple Admin screens and Excel export

**Files:** Create `admin/Finances.jsx`, `admin/CostSettings.jsx`, `admin/OrderCosts.jsx`, `admin/finance.css`, `tests/fixtures/admin-finance.html`, `tests/fixtures/admin-finance.jsx`, `tests/finance-ui.test.mjs`. Modify `admin/AdminShell.jsx`, `admin/main.jsx`, `admin/OrderDetail.jsx`, `admin/worker.mjs`; add one local browser acceptance record under `docs/admin-finances-verification.md`.

**Interfaces:** `<CostSettings/>` reads/saves versioned settings. `<OrderCosts order={order}/>` loads private costs only when opened and offers explicit Save costs and Confirm costs. `<Finances/>` owns month selection, page navigation, summary CSV and cost-detail CSV, consuming Task 2 endpoints and Task 1 formatting. Add authenticated `/finances` document routing and the Finances navigation entry. Reuse existing Admin components/styles and memory-only session recovery.

- [ ] Write failing UI/contract tests for exact labels `Unsaved estimate`, `Estimated`, `Confirmed costs`, `Projected margin` and `Order value is not money received`. No seeded prices, Mark paid, wastage, inventory or new artwork actions. Test that a missing cost is not silently a zero, explicit zero is editable, an edited confirmed record becomes Estimated, and controls never recalculate a saved snapshot from new settings.
- [ ] Build the synthetic fixture with external network/send mutations blocked. Exercise empty settings, add/edit/deactivate, two category entries, fractional usage, free-shipping courier cost, unknown historic delivery, unsaved old order, saved override and a multi-page month. Assert a lost save response offers read/reconcile, never automatic replay; a restored session preserves drafts until explicit save; a 409 does not overwrite either record.
- [ ] Implement the three declared components. Make category/usage controls plain labelled forms; distinguish cost completeness from confirmation. Keep overrides and order-only expenses inside the Costs section. Export all selected-month pages, not just the visible 50, with bounded sequential reads and matching report revision. Detailed CSV reads saved lines through the existing per-order finance read, one order at a time, retaining the same report revision/expiry checks. If the month changes or navigation cancels export, discard the partial output. Keep customer information out of files and report requests.
- [ ] Run `node --test tests/finance-ui.test.mjs tests/finance-costs.test.mjs tests/finance-report.test.mjs tests/finance-api.test.mjs`; require zero failures/skips. Through the available browser automation, verify the local fixture at 1440 and 375 px, keyboard focus, field errors, loading/empty states, conflict and sign-in recovery. Record actual checks and safe screenshots; never claim live or phone acceptance from code-only tests.
- [ ] Commit as `feat: add Admin costs and monthly finance views`, including the local verification note and any genuinely necessary shared error-copy change.

## Task 4: Review, owner preview and controlled release

**Files:** Update `docs/admin-finances-verification.md`, the approved spec status, `AGENTS.md` only for lasting verified rules, and existing release-manifest/check configuration only where new routes/identities require it. No new release framework.

- [ ] Run the complete existing Node test suite on the established Node 22.23.3 runtime, dependency notices, public/SSR and Admin builds, and existing supporting Python checks. Use `package.json` and current CI for exact supporting commands. Require zero unexplained skips/failures. Re-run broader checks only after actual new fixes.
- [ ] Get an independent whole-branch review for arithmetic, authorization, retention, migration, data leakage and report correctness. Resolve findings and verify affected tests. Compare existing email/print/customer outputs: no private cost values or new sends. Review the emitted route and asset manifest with existing release validation.
- [ ] Show Tim the local Admin preview and a sample synthetic CSV. Acceptance: enter a real material's pack details locally if desired, adjust one synthetic order, confirm calculated costs and inspect monthly totals/CSV. Do not create live orders or emails. Record any further owner price/material facts without inventing them.
- [ ] Before release, refresh GitHub service status, current main/release dependencies, database schema and usage. Estimate the feature's indexed D1 reads/writes/storage, including audit records, within existing approved service allowances. Prepare the additive migration, exact source and matching release identity using current tools. Obtain any required protected-branch/migration/deployment approval for those concrete artifacts; no further paid upgrade.
- [ ] Apply only an approved migration, then deploy compatible Security and matching website/Admin as required by current release rules. Verify original gates, Unpaid/payment protections, catalogue, existing orders, mail controls and expiry settings. Roll back to reviewed previous artifacts if checks fail; keep additive data, never delete orders or disable protections.
- [ ] Verify signed-in live settings/report reads. Live costing writes require the approved feature-specific save test; otherwise mark write acceptance pending. Do not silently modify an existing production order's costs. Update Founders Hub once per meaningful verified milestone, link repository evidence and distinguish local, released and owner-tested status. Leave parent incomplete until all required acceptance is complete.

## Execution and scope boundary

Preserve the owner's requested parallel/subagent approach where useful. After plan review, one implementer owns pure calculations/report formatting; a separate implementer can prepare private persistence/API tests against the declared contracts. UI work starts after those contracts are verified. A dedicated existing coordinator owns brief Hub updates. Keep source ownership explicit, avoid concurrent edits to the same files, and use a fresh reviewer before integrating each task.

This is a plan, not an implementation or release receipt. Stock, archive/reopen, long-term finance retention, payments, accounting/invoices and the deferred artwork buttons are outside it. Next action is owner review of this plan, then implementation by the preserved subagent method.
