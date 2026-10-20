# Offline email delivery reconciliation model

Historical pure-model tranche below. The reducer remains unchanged; its current callers are in the inactive local backend and signed-ingress integration described in `mail-delivery-backend.md`. Claims below about absent integration describe that original tranche, not the combined current-main candidate. No production activation is implied.

This is an unconnected, pure TECH03 model. It does not implement live reconciliation, query Resend, authenticate evidence, expose an endpoint, send mail, reserve quota, write records or change the admin. Existing provider acceptance remains distinct from delivery. TECH03 and EXT01 stay open.

## Input contract

`reconcileMailDelivery({receipt, observation, prior, now})` returns `{disposition, reason, delivery}`. All times are positive safe-integer Unix seconds, supplied explicitly. The function does not read the clock. All returned reasons and delivery states are fixed values. Input objects are never modified.

The trusted caller must first resolve **exactly one** authoritative accepted receipt. Zero or multiple matches must not reach a writer. This model takes one receipt and cannot prove database match cardinality, authentication or transaction isolation.

A normalized receipt has these fields:

```js
{
  state: 'accepted',
  providerMessageId: 'synthetic-provider-id',
  acceptedAt: 1792400000,
  purpose: 'manual-update',
  reference: 'synthetic-order-id',
  attempt: 'synthetic-reservation-id',
  expiresAt: 1793609600
}
```

Provider IDs reuse the released `validProviderMessageId` predicate: 1 to 128 ASCII letters, digits, underscore or hyphen. Reference and attempt use the same bounded opaque-token format. No trimming, content search, email-address matching, approximate-time matching, HMAC reconstruction, legacy backfill or receipt creation is allowed.

Fixed purposes are `owner-notification`, `customer-receipt` and `manual-update`. A future separately reviewed adapter must associate initial owner and customer columns on their existing opaque submission row, including its exact reservation and original two-day expiry. Manual receipts come from the exact accepted `order_update_attempts` reservation, order reference and original artwork deadline. The test fixtures use the released row shapes with synthetic values. They are not production customer records. These names are an offline normalization contract, not new stored columns or an implemented association with Orders.

An already authenticated, minimized observation repeats the exact `providerMessageId`, `purpose`, `reference` and `attempt` and has:

- `source`: `webhook` or `manual-check`.
- `type`: one supported fixed email event name below.
- `checkedAt`: observation time, at or after acceptance and no later than `now`.
- `occurredAt`: real event time when known, positive and no later than `checkedAt`. Provider events may precede the later server receipt-recording time; this never changes the recorded acceptance time.
- `eventId`: bounded event identity for webhook observations.

Webhook observations require both real event time and event ID. A status-only manual check omits `occurredAt` and `eventId`; it retains only its real `checkedAt`. Manual checks must not invent a webhook identity. Explicit null, malformed/future times, unknown enums and explicitly ambiguous `recipientCount` values are rejected. Missing recipient cardinality is an upstream authentication/minimization responsibility, not proof that a multi-recipient payload is safe. Raw provider payloads must never be passed directly to this model.

`prior` is null or the previous `delivery` result for the identical receipt, acceptance time and original expiry. The model validates and rebuilds its allowlisted evidence, re-derives state instead of trusting prior display state/reason, and discards extra fields. Invalid or cross-receipt prior evidence returns `needs-review` with no snapshot.

## Fixed observations

| Event | Delivery state | Meaning |
| --- | --- | --- |
| No evidence | `unconfirmed` | Accepted receipt only; silence does not mean failure. |
| `email.sent` | `unconfirmed` | Provider accepted; delivery unconfirmed. |
| `email.delivery_delayed` | `delayed` | Delay observed; no resend authority. |
| `email.delivered` | `delivered` | Recipient mail server accepted. Inbox placement and reading remain unknown. |
| `email.bounced` | `failed` | Fixed `delivery-bounced` reason. |
| `email.failed` | `failed` | Fixed `delivery-failed` reason. |
| `email.suppressed` | `failed` | Fixed `delivery-suppressed` reason. Provider suppression remains unchanged. |
| `email.complained` | Review flag | Fixed `delivery-complaint` reason. Established delivery/failure is retained, with `complaint: true`; otherwise state becomes `needs-review`. |

Opened/clicked indicators, provider endpoint delivery success/failure and arbitrary diagnostics are unsupported. Failures here are delivery observations, never definitive pre-acceptance send rejection. Acceptance time is copied from the authoritative receipt and never replaced by event/check time. No delivery-time field is invented.

The reducer retains at most 64 minimized observations containing only source, fixed type, event identity and necessary times. It sorts evidence deterministically. Sent/delayed evidence cannot regress a terminal observation in either arrival order. Later delivery resolves delay. Incompatible terminal types remain `needs-review` with `conflicting-outcomes`, including equal-time conflicts and later incompatible events. This deliberately treats different failure types as reviewable rather than choosing a winner.

Timed terminal history takes precedence over status-only manual checks. A later check without event time cannot overwrite a stronger timed terminal outcome. Weak timed sent/delayed evidence cannot erase an established manual terminal outcome; without timed terminal history, the reducer considers both timed and undated evidence. Complaints remain visible regardless of that precedence. Exact event replay is a no-op even if the latest check time differs. Conflicting reuse of an event ID sets a persistent `event-id-conflict` review flag without storing the new conflicting payload. Identical manual observations are no-ops. At 64 entries, additional evidence sets persistent `evidence-capacity` review instead of evicting replay/conflict history. Stored IDs still deduplicate. No automatic compaction, retry or extra lookup follows saturation.

## Retention and purity

The caller supplies the original authoritative expiry; the model never derives, resets or extends it. Initial evidence follows the existing two-day retry-row deadline. Manual delivery evidence, provider IDs and deduplication metadata follow the original fourteen-day artwork deadline. At the exact expiry second, `delivery` is null before prior/replay processing, including a read with no new observation. A missing/deleted receipt cannot be recreated by prior evidence. A later event does not start another fourteen-day window.

The snapshot contains acceptance time, exact correlation identity, original expiry, fixed delivery state/reason, two bounded review flags, complaint flag and minimized evidence. It contains no recipient, subject, body, URL, diagnostic text, retry flag, order stage/version, quota, payment fact or proof state. The function only imports the existing pure ID predicate and has no network, filesystem, database, logging or sending dependency. Inputs carrying unrelated workflow fields stay untouched.

The existing six-calendar-month reduced order/attempt history and acceptance facts remain under their existing rules. This module does not alter history retention or authorize retaining new delivery details beyond their earlier expiry. It does not change manual Preview update / Send update, stage-move behavior, the provider/D1 acceptance gap, duplicate-send prevention, initial same-key recovery, locks, payments, website-gate independence, storage cleanup or costs. No service feature or upgrade is enabled.

## Deferred integration requirements

This tranche does not satisfy concurrent atomic persistence or cleanup verification. A later authorized writer must atomically read current unexpired receipt/evidence, verify one exact match, apply the reducer and commit evidence/deduplication together, with a commit-time original-expiry check. Parallel reducers over the same old snapshot can produce separate proposals; blindly saving either proposal would lose evidence. Transaction/CAS conflict handling, read hiding, cleanup and the zero/multiple-match boundary need focused integration tests at that stage. Never acknowledge durable success before commit.

Provider capability/account validation, owner-assisted status semantics, webhook receiver/signature/replay authentication, safe secret provisioning, database association/migration, private readers/writers and admin presentation are separate work. No receiver, route, migration, account read, provider message read, credentials, live event, test send, automatic resend or publication is part of this model. W3Forms/Reply-To verification remains separate EXT01 coverage.

## Local evidence

`tests/mail-delivery.test.mjs` exercises released synthetic receipt identities, cross-purpose/attempt mismatches, unknown legacy acceptance, provider-ID bounds, supported observations, malformed/future evidence, out-of-order terminal handling, complaints, terminal conflicts, event replay/collision, status-only checks, original two-day/fourteen-day boundaries, deleted-receipt cleanup races, prior-state validation, capacity and PII exclusion with unchanged frozen workflow inputs. The model has no production caller. See the audit report for exact source anchor, hashes, test/build results and protected-file closure.
