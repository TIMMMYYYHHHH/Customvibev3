# Admin Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approved simple stock alongside costs, retaining the reviewed artwork-control removal in one combined PR/release.

**Architecture:** Existing Admin calls Security through AUTH. Stock operations atomically update versioned balances and an immutable operation journal; temporary order links expire independently. Two disjoint implementation lanes share the contract below.

**Tech Stack:** Existing React, ES modules, Workers/D1, Node tests and SQLite fixture; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-23-admin-stock-design.md` (owner approved).

## Global Constraints

- Base `3069523ce84786260e3f5929c653299835c5f54c`; branch `codex/admin-stock-20261023`; no overlapping PRs.
- 100 physical entries, 50 operations/history page, 200 pages/export and 4 MiB CSV maximum; no polling or history pruning.
- Money integer cents; quantity safe integer thousandths; whole sheets. Reject negatives/overflow. No FIFO, wastage, allocations, new services or paid upgrades.
- Fixed stock units; finance units remain editable. Match trimmed lowercase labels only; mismatches require explicit quantities without conversion.
- Explicit Materials used only; one active use/order; exact reversal blocked after any affected material's later stocktake.
- Preserve locked website/Admin, payments disabled, Unpaid, manual Preview/Send updates, original 14-day artwork and existing six-month order schedule.
- No em dashes, diagonal arrows or accent-stripe notice boxes. Reuse workroom controls. Fixtures never reach production or send email.
- Owner already approved build/parallel execution; root dispatches workers after this contract. Do not add another execution approval.

## Review Focus

1. Lost success response must reconcile the original operation, never double deduct.
2. Partial multi-material failure must leave every balance/link/journal unchanged.
3. Stocktake after use must prevent inflation through an old reversal.
4. Cost-unit edits must never reinterpret stock quantities or rewrite costs.
5. Expired order links must disappear without deleting stock history or replenishing stock.

## Shared contract, fixed before dispatch

IDs are UUIDs; timestamps epoch seconds. Unknown fields fail. All writes have `operationId`; same ID/same canonical request returns saved success, changed request returns 409. Never persist raw order IDs in the movement journal, canonical request or saved result: store request digest only; order IDs belong only to `order_stock_use`.

Types:
- `Item={id,name,unit,wholeUnits,balanceMilli,initialized,lowMilli,version,stocktakeGeneration}`; ID links a current finance entry, never courier. Names are snapshots. Stocktake generation increments even when the counted balance is unchanged.
- `VersionLine={itemId,version,stocktakeGeneration}`; `UseLine=VersionLine+{quantityMilli}`; zero permitted, at least one positive line required.
- `Movement={seq,operationId,kind,created,reason,lines,price}`; each line `{itemId,name,unit,deltaMilli,balanceMilli,stocktakeGeneration}`; `price=null|{packCents,packQuantity}`. Kinds `item|receipt|stocktake|use|reverse`; item events have no physical delta. No customer information.
- `Use={operationId,status:'active'|'reversed',lines:UseLine[],canReverse,reverseBlockedByStocktake}`; versions in preview lines reflect current balances, while the original use's stocktake generations remain preserved server-side.

Authenticated GET routes:
- `/api/stock/items` returns `{revision,settingsVersion,items,costEntries}`; `costEntries` are current finance defaults for selection; settingsVersion supplies the optional receipt price-update guard.
- `/api/stock/history?before=&revision=` returns `{revision,rows:Movement[],next}`; omit optional query values initially. Descending operation seq; next is last returned seq or null. Revision is journal maximum seq, including item-setting events. Reject changed revision before/after reads.
- `/api/stock/orders/:id` returns `{orderId,orderVersion,costVersion,usageVersion,usage:Use|null,lines}`. Preview lines are current linked/included saved costs plus Item/VersionLine fields, `suggestedMilli:number|null`, `requiresQuantity:boolean`. No saved costs means empty suggestions; instruct Save costs first. Unit mismatch has null suggestion.

POST bodies:
- `/api/stock/items`: `{operationId,id,version,unit,wholeUnits,lowMilli}`; version 0 creates, otherwise edits. Units/wholeUnits fixed after movements; wholeUnits must be true for sheet stock. Name/category validated from current defaults. Maximum name 80/unit 24 characters.
- `/api/stock/receipts`: `{operationId,itemId,version,quantityMilli,packCents,packQuantity,updateDefault,settingsVersion}`; positive receipt, nullable unknown price, positive whole pack quantity. `settingsVersion` is null unless updating defaults. That option requires matching stock/default units and an explicit known price; update finance defaults/audit/version in the same transaction. Past costs unchanged.
- `/api/stock/stocktake`: `{operationId,itemId,version,countedMilli,reason}`; count nonnegative, reason trimmed 1–200 characters.
- `/api/stock/orders/:id/use`: `{operationId,orderVersion,costVersion,usageVersion,lines:UseLine[]}`; exact set of linked/included saved-cost entries, no duplicates, initialized stock, sufficient balances, at most 100 lines.
- `/api/stock/orders/:id/reverse`: `{operationId,orderVersion,usageVersion,lines:VersionLine[],reason}`; exact active-use item set, quantities derived server-side. Reject if any original stocktake generation differs. No partial reversal.

Success for every POST: `{operationId,revision,items,usage:Use|null}`. Read current views after success. For order retry, validate unexpired order before returning stored operation result. Errors `{error,code}`: 400 `INVALID`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT|SHORTAGE|ALREADY_USED|STOCKTAKE_AFTER_USE|OPERATION_MISMATCH`, 410 `EXPIRED`, 413 `TOO_LARGE`, 503 `UNAVAILABLE`. Do not rely on error prose for branching. Body limit 65,536 bytes. UI retains drafts and requires read/reconcile after 401/409/network/5xx.

Shared export: `shared/stock.mjs` exports `stockCsv(rows:Movement[]):string` (BOM, CRLF, safe quoted text/formula protection, integer-derived decimal values). UI's `exportStockHistory({request,signal,onProgress})` reads matching-revision pages sequentially, checks final revision and discards partial/cancelled output.

### Task 1: Backend, calculations and persistence lane

**Own:** new `shared/stock.mjs`, `security/stock.mjs`, `admin/stock-api.mjs`, `migrations/security/0014_admin_stock.sql`, `tests/stock-{calculations,service,api}.test.mjs`; modify only `security/index.mjs`, `admin/worker.mjs`. Do not edit UI, finance modules, package files or the other lane's tests.

**Storage:** three tables: stock_items; stock_movements as immutable operation headers with bounded JSON lines, request digest and non-customer saved result; order_stock_use for versioned current use/link. Index item IDs, operation UUID and movement seq/time. An order-delete trigger removes its use link only. Record stocktake generations and reversal identities; enforce once-only reversal and one active order use. No history deletion job.

- [ ] Write failing tests for all five Review Focus cases, whole sheets, same/changed operation retries, two concurrent uses/receipts, stale settings price update, all-or-nothing audit failure, exactly-expired order, negative/overflow, original-use-only reversal, CSV formula injection and stable pagination.
- [ ] Run `node --test tests/stock-calculations.test.mjs tests/stock-service.test.mjs tests/stock-api.test.mjs`; capture meaningful RED.
- [ ] Implement `stockService(request,env)` and `stockAPI(request,env,session)`, dispatch `/stock/` and `/api/stock/`. Use a database-execution-time conditional operation gate inside D1 batch; all version/generation/order-expiry/default-price guards must hold before any update. Batch failure rolls back journal, balances, finance audit and order link. Recheck expiry for exposed order reads. Reads never mutate.
- [ ] Run the same tests to GREEN; self-review and commit only owned files.

### Task 2: Admin/client and synthetic fixture lane

**Own:** new `admin/Stock.jsx`, `admin/OrderStock.jsx`, `admin/stock-client.mjs`, `admin/stock.css`, `tests/stock-ui.test.mjs`, `tests/fixtures/admin-stock.{html,jsx}`; modify only `admin/Finances.jsx`, `admin/OrderCosts.jsx`. Consume Task 1 HTTP/CSV contracts; do not edit shared/backend modules or existing finance fixtures.

- [ ] Write failing client/render tests: receipts/settings option, stocktake reason, low threshold, missing setup, matching/mismatched units, saved-cost overrides, explicit use, shortage, blocked reversal guidance, 401/409/lost-response reconciliation, no automatic writes after sign-in, pagination/export limits/cancellation.
- [ ] Run `node --test tests/stock-ui.test.mjs`; capture meaningful RED.
- [ ] Implement Stock tab, forms and OrderStock beside saved Costs. Preserve use preview while reconciling; retry original operation identity only after explicit review. Never hook stage/cost saves to stock writes. Fixture intercepts every request locally and blocks external traffic/sends.
- [ ] Run focused tests to GREEN; verify fixture keyboard/390px/desktop interactions and no overflow, then commit owned files.

### Task 3: Root integration, review and release evidence

**Own:** `AGENTS.md`, `docs/admin-stock-verification.md`, `docs/admin-stock-runbook.md`, integration-only fixes by explicit handoff; no worker-overlapping edits while lanes run.

- [ ] Review each lane's spec/quality evidence independently, then test real API/client interoperability with synthetic SQLite and the fixture; resolve contract deviations before whole-branch review.
- [ ] On established Node 22.23.3 run full tests, public/SSR and Admin builds, current required Python/dependency-notice checks. Baseline is inherited artwork commit, not an asserted fresh full-suite pass. Review the combined stock plus artwork diff against current main.
- [ ] Refresh main/CI, D1 schema, service usage/headroom and exact compiled-source identities. Prepare additive 0014 migration and matched Admin/Security release packet, without applying/deploying in worker lanes. Rollback hides stock UI/routes, retains additive records, and never reverses stock or deletes customer records. Follow existing concrete release authorisations.
- [ ] Maintain existing Founders Hub tasks/subtasks and verify saves; distinguish implementation, tests, deployment and live acceptance. One combined PR, attach it to this chat. Record stock-history business-policy follow-up without asserting legal compliance.
