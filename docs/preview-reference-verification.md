# Designed admin preview and short order numbers

Owner request: fix the plain-text-only admin preview and replace long grouped references with CV-000004-style numbers. Existing sent emails already have the intended template.

## Implementation

- Admin displays the existing API HTML and embedded PNG attachments in a sandboxed srcdoc iframe inside a native modal dialog. No script, same-origin permission, remote resources, forms or connections are allowed. The actual message template and send API remain shared. Recipient, subject, plaintext fallback and separate send/cancel controls remain clear.
- Existing server order sequence is the primary number for all admin records. Earlier email references are read from immutable snapshots and remain visible/searchable. No schema migration or stored record rewrite.
- New version-2 checkout submissions use the server-assigned number for receipt and both emails. Version-1 and legacy in-flight payloads keep original email content on retries. Full UUID idempotency/storage identifiers remain unchanged. Missing server number or unavailable records prevents sending.
- Existing authentication, stage/version checks, duplicate protection, unpaid status, quotas and 14-day expiry remain unchanged.

## Verification

164 automated tests passed, including actual template rendering, attachment inlining/sandboxing, sequential confirmation/email equality, interrupted receipt retry with identical provider payload, concurrent allocation, aliases without snapshot/history mutation, version fingerprint protection and missing-record fail-closed behaviour. Public, server-rendered and admin builds passed.

Desktop browser rendering with the production frame/image policy succeeded without changing application security headers. The development server alone allows its inline hot-reload preamble. Actual Gmail phone appearance remains a separately blocked owner check. Local fixture sending is disabled.

## Publication and signed-in checks

Published application `f975d05` on 17 October 2026 SAST. Protected Pages workflow [38976936278](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38976936278) passed all 164 tests, builds and before/after protection checks. Business security Worker `d68a2560-bb5b-4298-bdd8-9f25457f01fb`; admin Worker `88a981c8-ddbb-4b97-b632-9daa804b6d7c`, asset `index-MjPU6aIz.js`. Admin destination/auth/manual-send guards passed before and after deployment.

Signed-in live Orders shows CV-000001 through CV-000004. Searching CV-QZYB-R3BT-QC56-ZQZC returns CV-000004. Its earlier email reference, Shipped stage and existing accepted/pending history remain visible. The actual published preview renders the current design with inline images, recipient, short subject/body reference, saved stage, magnet count and truthful Unpaid status. Cancel restores focus to Preview update and leaves history unchanged.

CV-000001 remains In progress with 11 magnets, the original 30 October artwork expiry and both accepted updates at 13:06 and 12:44 on 16 October. Duplicate preview/send remains disabled. No live submission, send, stage mutation or migration was performed. New checkout number agreement is verified by synthetic end-to-end server submissions, not a new real customer email.

Desktop and 390px local dialog rendering passed; mobile cancellation restores focus. Browser rendering follows the email's light/dark CSS and is not proof of Gmail phone acceptance. Availability and phone acceptance remain blocked by the owner's previous decision. No availability diagnostics or provider contact resumed.
