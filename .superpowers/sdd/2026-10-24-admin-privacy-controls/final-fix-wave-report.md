# Final bounded whole-branch fix wave

Base: `3d60792387cde1c5b1fac817ec51feee1ff61b2f`. Scope: WBR-1 and WBR-2 only, as assigned in `final-fix-wave-brief.md`. No schema, dependency, policy or provider configuration changes.

## Changes

WBR-1: list reads union ordinary retained rows with only the minimal retained metadata of unfinished erasure operations. An erasing source row never participates in contact/name/older-reference searching. Its retained current reference supplies bounded sequence pagination, including after ordinary order expiry and actual `cleanOrders` source-row removal. Incomplete operations appear in the existing separate erasure surface across stage filters; completed operations stay excluded. Detail reads recover `{id,reference,version,privacy}` directly from the same operation, without restoring an expired snapshot/contact/notes/artwork record. The final projection also suppresses contact-search inference if a claim wins between list selection and the authoritative privacy read. Existing original deadlines, manifests, explicit status/confirm/resume, deletion and quota-release behavior are preserved.

WBR-2: an authoritative erasing preview now clears obsolete correction data and previews, adopts its existing operation and authoritative minimal identity/version into the wrapper, and keeps that wrapper fenced after Cancel/Escape. Same-operation prop adoption preserves the newly displayed original-scope preview. This tab's own unknown-result identity remains guarded until explicit status reconciliation. Archive preparation notifies the wrapper before rejecting either initial or final minimal authoritative DTO. Print preparation and PDF generation do the same at all four read boundaries, before consuming a missing snapshot or exposing prepared bytes. Ordinary UI is unmounted, removing stale contact/artwork/stage/mail controls and print resources.

Fixture only: `other-tab-erasure` in the existing visible mode select creates a routed synthetic partial R2 erasure without refreshing mounted product props. It restores the synthetic delete binding so subsequent status and explicit same-operation resume can work. Its audit contains only method/path/status. It uses actual product Orders/OrderDetail/OrderPrivacy and routed service. All sends remain blocked; no real records/provider bindings are reachable.

## Test-first evidence and sequence

Before any product changes:

1. Added only fixture support and sent Root the launch/mode instructions. Worker did not start, stop or control the fixture/server/browser.
2. Added routed SQLite/R2 expiry regression. RED: expected retained minimal operation, actual list `[]` at original order expiry plus one second.
3. Added isolated post-cleanup detail regression. RED: HTTP 404 instead of 200 after actual `cleanOrders` removed source.
4. Added bounded 52-operation pagination regression. RED: zero rows instead of first 50 retained operations.
5. Added actual bundled archive regression. RED: bytes were rejected but authoritative minimal state was never forwarded, leaving wrapper adoption `undefined`.
6. Root reported actual mounted-component CUA RED on original product: unsaved draft plus other-tab incomplete erasure, authoritative preview and Cancel exposed ordinary stale UI; Download all and Prepare print sheet also left ordinary UI. Root recorded full AX files `CUA-WBR2-RED-FULL.txt`, `CUA-WBR2-BYTE-RED-FULL.txt` and screenshots, then explicitly sent GO for product changes.

During the same bounded fix wave, self-review added the contact-search interleaving regression. RED: one contact-match row remained discoverable after the concurrent claim, expected zero. GREEN follows the safe reference-only final projection; reference search still returns the minimal operation.

The first product attempt used a SELECT-only CTE prefixed with WITH. The existing bounded-read helper correctly refused it, causing six list-related failures in a 25-test run. Converted it to an explicit SELECT over a UNION subquery, without changing/weakening the read helper. Subsequent focused runs passed 25/25, then 26/26 after the additional interleaving regression. No unresolved failed checks remain among worker-run checks.

## Exact commands and results

Working directory for all commands:

```text
/Users/timothymorton/.codex/.chatgpt-projects/g-p-6acf844518448191a0201022d78e5e97/research/customvibe-admin-privacy-20261024
```

Every `node` below was invoked by this exact absolute executable, with no install/update:

```text
/Users/timothymorton/.codex/.chatgpt-projects/g-p-6acf844518448191a0201022d78e5e97/audit/fix-plan/admin-finances-20261022/release-prep/execution-20261023/runtime-recovery/node-v24.19.0-darwin-arm64/bin/node
```

Initial RED commands, all expected exit 1:

```sh
node --test --test-name-pattern='unfinished erasure stays listed' tests/order-privacy-service.test.mjs
node --test --test-name-pattern='fresh detail uses only|operation-only erasure navigation' tests/order-privacy-service.test.mjs
node --test --test-name-pattern='archive adopts authoritative' tests/order-privacy-ui.test.mjs
node --test --test-name-pattern='erasure claiming between list' tests/order-privacy-service.test.mjs
```

Fixture syntax check, exit 0:

```sh
node --check tests/order-privacy-review-server.mjs
```

Focused final run, exit 0, 26 passed, zero failed/skipped/cancelled:

```sh
node --test tests/order-privacy-service.test.mjs tests/order-privacy-ui.test.mjs
```

Final combined covering run after the last product edit, exit 0, 112 passed, zero failed/skipped/cancelled:

```sh
node --test tests/order-privacy-service.test.mjs tests/order-privacy-ui.test.mjs tests/order-privacy-api.test.mjs tests/order-groups.test.mjs tests/order-archive.test.mjs tests/admin-print-branding-preview.test.mjs tests/print-artwork-transport.test.mjs tests/admin-orders.test.mjs tests/fulfilled-orders.test.mjs tests/database.test.mjs tests/order-privacy-dispatch.test.mjs tests/admin-print-layout.test.mjs tests/admin-print-pdf.test.mjs tests/availability-diagnostics.test.mjs tests/retention-acceptance.test.mjs tests/retention-migration.test.mjs
```

Before that final combined run, equivalent covering batches passed 49/49, 35/35 and 28/28. The 49-test command also named nonexistent `tests/order-privacy-races.test.mjs` and `tests/orders.test.mjs`; Node did not execute those names. They are excluded from the exact combined final command above and no nonexistent test is counted as coverage.

`git diff --check`: exit 0, no output.

## Self-review and acceptance bounds

Checked approved spec/shared contracts and both review findings against the final changes. Operation navigation returns only the allowed minimal keys. Original deadline and manifest equality, contact/email/phone non-discovery, stage-filter discoverability, pagination, source deletion, no automatic delete during cleanup/list/status/preview, explicit same-operation resume, completed exclusion and quota-once replay are exercised with real dispatched service and disposable SQLite/R2. Existing auth/origin/CSRF/capability binding, initial dispatch, manual email, retention, bounded SELECT recovery, archive bytes, print layout and PDF checks pass.

No worker network/provider/browser/helper/process-management/auth/credential/deployment operations, real customer mutation or real sends were performed. No subagents or new dependencies. Fixture server remained Root-owned. Root separately reported actual mounted CUA GREEN for the exact unsaved-draft/other-tab/authoritative-preview/Cancel path, explicit status 200, and separate archive and print resets. Full evidence is under the project `audit/fix-plan/admin-privacy-20261024` as `CUA-WBR2-GREEN-FULL.txt`, `CUA-WBR2-ARCHIVE-GREEN-FULL.txt`, `CUA-WBR2-PRINT-GREEN-FULL.txt` and green screenshots. Root reported one synthetic fixture erase 503, preview/status 200, zero send requests/provider calls. Worker did not operate the browser or independently claim that evidence. Current full application suite, builds, CI, final scoped independent review, final own-unknown UI readback, release binding/publication and read-only live verification remain Root-owned. Worker claims only the local checks above, not production verification, owner acceptance or publication.
