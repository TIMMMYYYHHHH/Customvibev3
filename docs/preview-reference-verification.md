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

Publication and signed-in verification pending.
