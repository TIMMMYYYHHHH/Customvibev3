# Admin privacy controls implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. Steps use checkbox syntax for tracking.

**Goal:** Add reviewed manual contact correction and scoped, previewed early erasure to existing Admin order detail.

**Architecture:** A private Security service owns contact overlays, graph snapshots, erasure claims and minimal replay tombstones. The Admin proxy signs session-bound preview capabilities and exposes guarded JSON actions. A focused order-detail component owns memory-only edits, explicit confirmation and outcome reconciliation.

**Tech Stack:** Existing React, Cloudflare Workers/D1/R2, Node test runner and disposable SQLite/R2 fixtures. No dependency or provider additions.

**Spec:** `docs/superpowers/specs/2026-10-24-admin-privacy-controls-design.md`.

## Global constraints

- Business facts remain Deferred; website gate, server Admin sign-in/external MFA and payments-off remain.
- Name/email/phone only; immutable original snapshot/fingerprint/initial mail facts; no automatic email or changed retention clock.
- Erase only exact selected-order relations; preserve business stock balances/history. No real customer mutation or provider deletion test.
- Private API, CSRF/origin/session, bounded body, fixed safe errors, quotas and free-tier safeguards remain.
- No em dashes, diagonal arrows, new service or unrelated UI/refactor.

## Review focus

1. Contact correction after an initial/manual send claim must not retarget an existing idempotency key or unlock a duplicate Fulfilled email.
2. A stale preview, changed graph, new tab or changed session must reject before any storage deletion.
3. In-flight/delayed artwork writes must not recreate R2 objects after completed erasure.
4. Partial R2 deletion or a lost response must retain a resumable exact operation and release quota only once.
5. Saved checkout/resume capabilities must not recreate erased customer data; unrelated orders and business stock remain untouched.

## Shared contracts

All Admin routes are protected POST under `/api/orders/:id/privacy/:action`, handled in `admin/order-privacy-api.mjs` before ordinary order routes. Actions are `preview-correction`, `correct`, `preview-erasure`, `erase`, `status`.

Private service POST routes are `/privacy/:action` with server-injected `id`. The service exports `orderPrivacyService(request,env)` from `security/order-privacy.mjs`. A shared private gate/helper may be exported from that module for existing handlers.

- `preview-correction`: `{id,version,contact:{name,email,phone}}` returns `{id,reference,version,digest,contactRevision,contact:{before,after}}`. No customer write.
- `correct`: `{id,version,contact,expectedDigest,operationId}` returns `{ok:true,version,contactRevision}` or fixed conflict. Duplicate/lost response must be reconciled by authoritative read, never blind retry. Existing order detail projects corrected contact.
- `preview-erasure`: `{id,version}` returns `{id,reference,version,digest,operationId?,counts,artworkExpires,expires,state?}`. Counts include `orders`, `history`, `updates`, `receipts`, `submissions`, `proofs`, `artworkRequests`, `artworkFiles`, `artworkBytes`, `costs`, `stockLinks`. Include fixed safe blockers if activity prevents erasure. An existing erasing operation returns its original resumable identity/scope.
- `erase`: `{id,version,expectedDigest,operationId,confirmation,acknowledged:true}` returns `{ok:true,state:'complete',operationId}` or `{ok:false,state:'incomplete',operationId,error}`. Never claim completion after a partial failure.
- `status`: `{id,operationId}` returns `{state:'erasing'|'complete'|'not-found',operationId}` and fixed safe reconciliation information. No deletion or automatic retry.

Admin preview adds `previewToken` and a UUID `operationId`. Token binds action, session.jti, id, version, backend digest, normalised contact if relevant, operationId and ten-minute expiry using existing Admin session-secret primitives with a distinct purpose. The backend digest includes the current contact revision; correction does not change stage version. Execute accepts only its signed values plus confirmation/acknowledgement. Security receives only verified fields. Do not accept caller-supplied IDs outside the route or unknown fields.

When erasing, order detail/list may expose only a redacted `{id,reference,version,privacy:{state:'erasing',operationId}}` view for safe resume. The UI must detect that before dereferencing a snapshot. Completed operations remove ordinary order listing and return only minimal opaque outcome metadata, within original retention bounds.

### Task 1: Private state, correction and erasure

**Ownership:** Backend worker. New `security/order-privacy.mjs`, migration `0015_order_privacy.sql`, necessary private handler integration in `security/index.mjs`, `orders.mjs`, `artwork.mjs`, `submissions.mjs`, `proofs.mjs`, `finance.mjs`, `stock.mjs`; new `tests/order-privacy-service.test.mjs` and local fixture helpers if necessary. The reviewed initial-dispatch race also requires a narrow `server/submissions.mjs` caller change and its concurrency regression. Coordinate helper exports; do not edit Admin or root-owned docs.

- [ ] Write failing synthetic tests against real SQLite/R2 for overlay projection/search, exact immutable snapshot/receipt/expiry preservation, version conflict and zero sends.
- [ ] Run targeted tests and record expected failures before implementation.
- [ ] Implement the contracts above with the minimal additive schema. Keep current contact separate from the original snapshot. Atomically exclude unresolved sends and invalidate stale contact-revision previews. Keep order.version and existing per-version send attempts unchanged. Add current contactRevision to detail and manual previews; claim/send require it (legacy omitted value is zero only), so correcting a contact never unlocks another accepted same-stage or Fulfilled message.
- [ ] Write and observe failing erasure tests: exact graph counts, changed graph/version, pending/uncertain sends, active/delayed upload, original/child artwork, unrelated order, finance/stock preservation, partial R2 failure and resumable outcome.
- [ ] Implement durable two-phase erasure, atomic graph/claim guards, exact R2 keys, quota-once cleanup, redacted in-progress reads and minimal tombstones blocking old create/resume/dispatch. Use original deadlines and no PII in the final outcome.
- [ ] Verify anti-replay and pending mutation guards through the real service entry points, not test-only shortcuts. Do not run global cleanup as the scoped operation.
- [ ] Run targeted service/retention/mail/stock suites, then report contracts and all test outcomes. Root runs the full suite after integration.

### Task 2: Protected proxy and actual Admin controls

**Ownership:** Admin worker. New `admin/order-privacy-api.mjs`, focused component `admin/OrderPrivacy.jsx` and scoped CSS, edits `admin/orders-api.mjs`, `admin/order-mail.mjs` and `admin/OrderDetail.jsx`, and minimal redacted-row handling in `admin/Orders.jsx`; tests `tests/order-privacy-api.test.mjs`, `tests/order-privacy-ui.test.mjs`, synthetic browser fixture/script. Do not edit private service/schema or root docs.

- [ ] Write failing routed tests for unauthenticated access, cross-origin/missing CSRF, preview host mutation, bounded body/unknown fields, wrong session/action/id/version/contact and expired token.
- [ ] Run targeted tests and observe expected failures. Implement protected proxy/signature contracts using existing `signToken`/`verifyToken`, distinct scope/purpose and no real network calls.
- [ ] Add the actual memory-only editor, saved/proposed preview and explicit Save correction. Clear old mail preview and reread authoritative detail after success or uncertain response.
- [ ] Add exact erasure counts, original expiry, manual entitlement/retention acknowledgement, typed reference and separate final confirmation. Explain external/provider/mailbox/downloaded copies and preserved stock history.
- [ ] Support redacted in-progress order/resume, explicit status reconciliation after a lost response and completed navigation without stale artwork controls. Never automatically repeat correction or erase.
- [ ] Verify actual component behaviour, keyboard/dialog focus, draft preservation, mobile wrapping, manual-mail accessibility and zero sends with intercepted synthetic APIs. No real customer or provider requests.
- [ ] Run targeted API/UI tests and report actual browser methods/limits.

### Task 3: Integration, documentation, independent review and release

**Ownership:** Root. Update current AGENTS/manual runbook/public W3Forms qualification and Hub. Preserve original audit/source artifacts.

- [ ] Reconcile source contracts, inspect full diff and run full `npm test`, seven Python checks, public/SSR/Admin builds and shipped notices with the trusted bundled runtime.
- [ ] Obtain fresh independent whole-change security/data-integrity and UI reviews. Fix concrete findings with failing regression tests; verify again as appropriate.
- [ ] Commit, push and create a reviewable PR, attaching it to this chat. Check current-head CI and preserved policy/settings.
- [ ] Prepare a new finite migration/Security/Admin/Pages release and rollback compatibility review. Do not replay any consumed helper/binder or read credentials. Ask only for an actual missing release credential/session or consequential provider action when necessary.
- [ ] Publish within existing authority only after concrete reviews/checks pass. Verify live protected controls with read-only inspection; a production correction/deletion requires its own actual record/action approval.
- [ ] Reopen Hub records to verify saved status, distinguish implemented/local/CI/deployed/live-read from real irreversible acceptance, and keep business/legal/provider and launch parents accurately open.
