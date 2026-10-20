# Inactive delivery backend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Owner assigned inline Lane A; no subagents, commits or production actions.

**Goal:** Capture future exact recipient bindings and persist minimized authenticated delivery observations privately without changing sends or workflow facts.

**Architecture:** Exact reviewed reducer bytes, additive0012 schema, forward-only initial association, atomic acceptance/binding and revision-CAS snapshot/event claim with final SQL expiry abort guard. No public ingress, verifier, UI or activation in this lane.

**Tech Stack:** JavaScript modules, Cloudflare D1 prepared statements/transactional batches, Node24 SQLite fixtures.

**Spec:** audit/fix-plan/TECH-03-DELIVERY-INTEGRATION-DESIGN.md and TECH-03-DELIVERY-DESIGN-INDEPENDENT-REVIEW.md in project mirror.

## Global constraints

- Base db23134b8f3336c8b0f33223b9e7dab3e4bed7ba, verified remote main20October2026; no existing worktree edits.
- Only Lane A paths, proposed pure digest helper awaiting coordinator confirmation; exact three model files copied unchanged.
- Never apply migration, call provider, send real mail, access secrets, commit, push, deploy or update Hub.
- Keep gates, payments-off, manual sends, duplicate prevention, original two-day/fourteen-day expiry and six-month reduced history.
- No em dashes, raw addresses/content/diagnostics in delivery storage or projection; no legacy binding backfill.

## Review focus

- Legacy accepted replay cannot initialize a binding; exercise real mark twice.
- Record-disabled initial mail still works; no phantom order association.
- Late manual mail still sends under existing rules but stores no fresh receipt/binding.
- Source mutation/cleanup between read and CAS cannot leave evidence; inject through DB boundary.
- Final expiry guard aborts snapshot and event together; advance SQL clock at final batch statement.

## Task1: schema and receipt association

Files:0012 additive migration, security/submissions.mjs, security/orders.mjs, server/submissions.mjs, admin/order-mail.mjs, receipt/persistence tests; pure recipient helper if approved.
Interface: future accepted mark optionally carries `recipientBinding:{recipientCount:1,recipientDigest:<64lowerhex>}`; old callers omit it. Initial create optionally carries `submissionId:<64lowerhex>` alongside existing fingerprint. Bind once only on first authoritative receipt write and exact source expiry; source remains authoritative.
- [x] Write failing real SQLite tests for initialization, atomic rollback, no historical binding, immutable link, record-disabled and expired-manual compatibility.
- [x] Observe intended failures, implement0012 and existing mark/create integration, preserve source success/retry semantics.
- [x] Pass focused receipt/association tests and record results.

## Task2: atomic observations and private projection

Files: exact reducer/test/docs copies, security/mail-delivery.mjs, security/index.mjs, security/orders.mjs; new tests/mail-delivery-persistence.test.mjs.
Interface: private POST `/mail-delivery/observe` input exactly `{providerMessageId,source:'webhook',type,eventId,occurredAt,checkedAt,recipientCount:1,recipientDigest}`. Trusted adapter authenticates raw webhook first; backend derives purpose/reference/attempt. Return200 fixed `{ok:true,disposition:'applied'|'duplicate'|'ignored',reason:<fixed>}` only after guarded persistence/revalidation; invalid400, transient/contended503. No manual capture yet. Detail adds `mailDelivery` allowlisted summaries; no ledger/digest/provider payload.
- [x] Write failing global-cardinality, recipient mismatch, terminal/replay/conflict, concurrency/CAS and failure rollback tests.
- [x] Implement primary reads, maximum3 reread/reduce attempts, unique event claims, one transactional CAS+claim+final expiry-abort guard.
- [x] Pass focused persistence tests with zero external fetch and unchanged workflow fields.

## Task3: expiry and regression verification

Files: same owned files, focused cleanup tests and supplemental runbook.
- [x] Write failing exact-boundary, source scrub/delete, cleanup-race and final-guard-clock-crossing tests; implement guarded hiding and existing hourly cleanup integration.
- [x] Run focused suites, current full project test command and paired build/prepared artifact checks using copied ignored local dependencies only.
- [x] Record actual failures/skips, source/diff hashes, frozen contract and protected-byte closure. Leave uncommitted for root's independent review.

## Execution ledger

Plan pinned before implementation. Native worktree creation returned Not a git repository; manual detached worktree created at the verified requested anchor. Existing model worktree stays unchanged. Shared interfaces: Task1 accepted binding feeds Task2 exact mapping; Task2 original expiry and source keys feed Task3 cleanup. Root owns later verifier/UI lanes and final review.

Execution results: focused56/56 pass; paired builds and security browser bundle pass. Prepared-output notice4/4 pass. Full final suite result recorded separately after completion. No commit/push/migration/provider/Hub action.

Rulings: use a stateless assertion view with an abort trigger instead of a third persistent guard table; supports a final transactional expiry abort without extra durable data. Preserve acceptance even when provider IDs are globally ambiguous; exact-one belongs only to observation/read. Manual binding selection additionally uses its exact attempt. Reuse existing readSelect for new private detail reads. Existing failure-injection test now covers batch all() as well as first(), since acceptance became transactional. The raw provider/D1 gap remains.

## R2 bounded P1 correction

Root authorized correction after independent review. Original16 deliverables, freeze/results/contract/review were copied and hash-verified in `audit/fix-plan/tech03-backend-lane-a-r1-archive` before edits. Original freeze remains immutable.

- [x] Reproduce fully accepted and owner-only accepted historical unlinked recovery using the actual db231 released public sender and real migrated fixtures. Both candidate requests returned409 instead of released200 before correction.
- [x] Permit a no-association result only for an exact already-existing order and unlinked order submission with an existing initial sent flag, matching fingerprint and exact snapshot, live original deadlines and no competing link. Keep new-create, missing/mismatched source and reassociation rejection.
- [x] Verify actual candidate public recovery preserves original receipt/link/binding facts, recovers only a first remaining customer receipt, and leaves current linked records unchanged. Run focused regressions and one final prepared suite/build; preserve all R1 evidence and issue a separate R2 freeze.

R2 results:102/102 focused pass. One final prepared full run with CV_CHECK_BUILT_NOTICES=1:533 total,532 pass,1 existing locker-listener EPERM failure,0 skips. Fresh paired storefront/admin builds and browser-platform security bundle pass. Helper/contract/schema/persistence hashes unchanged. Source remains uncommitted on db231 for focused independent R2 review.
