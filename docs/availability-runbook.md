# Catalogue failure signals and response

This runbook covers the private catalogue Worker's two existing read routes. It adds no route, dashboard, provider integration, alert destination or scheduled job. Routed alerts, scheduled cleanup/snapshot freshness and full monitoring acceptance remain separate TECH-22 work, subject to DEC-06 and an authorized provider check.

## Signal and public behavior

A caught failure emits one structured `console.error` record through the existing `server/availability.mjs` sanitizer:

```json
{"event":"customvibe_unavailable","step":"catalogue_content","reason":"database_schema"}
```

`catalogue_content` identifies a failed `/content.json` read. `catalogue_season` identifies a failed `/season.json` read. These are fixed labels, never caller-supplied path or query text. The record contains only the event, step and fixed reason. It never includes the exception, SQL, response body, saved wording, URL/query, headers, cookies, tokens or customer information.

The catalogue still returns status 503 and `Temporarily unavailable` on a caught failure. Successful reads retain `Cache-Control: no-store`, live saved content authority, hidden-product filtering and public seasonal filtering. Unsupported routes/methods remain empty 404 responses. An absent content row or seasonal table still uses its existing normal defaults; a corrupt saved row remains unavailable and is never silently replaced with defaults. The service remains read-only and reachable through existing service bindings, with no public route or workers.dev address.

## Respond to a sampled failure

1. In the existing authorized Cloudflare logs for `customvibe-catalogue`, find `customvibe_unavailable` and record only the fixed step/reason and occurrence time. Check the current deployment identity, authorized provider health and existing usage view. A catalogue signal identifies the boundary and category, not a proven underlying cause.
2. Use the category below to choose the next read-only investigation. Preserve latest saved catalogue/seasonal settings. Do not reset data, apply a migration, bypass protection, enable payments or publish another service as a diagnostic experiment.
3. After an approved remedy, use the existing protected application workflow to verify normal reads and exact saved settings. A missing log alone does not prove recovery. Record implementation, deployment and live verification separately.

| Fixed reason | Next investigation |
| --- | --- |
| `database_schema` | Check the reviewed schema/migration and deployed source compatibility. Plan any change with the normal backup/release procedure; never infer a safe migration from an error category alone. |
| `database_transient`, `database_reset`, `database_internal`, `network_connection_lost`, `request_context`, `timeout` | Check provider health and whether failures persist. Preserve the current response and data. This change adds no retry, replay, polling or request amplification. |
| `service_limit` | Inspect current included D1/Worker/log usage and approved limits. Retain existing cost controls. No paid add-on or plan change is authorized by this signal. |
| `database`, `kv`, `unknown` | Compare current bindings/configuration and storage integrity with the reviewed version using authorized access. `unknown` may include malformed saved JSON, validation or missing-binding failures. Do not add raw exception logging to learn more; prepare a separate reviewed, sanitized diagnostic if needed. |

## Volume, retention and cost boundaries

There is at most one diagnostic record per caught supported catalogue request. No success or unsupported-request record, extra database call, per-query log, timer, retry, persisted counter or external request is added. Disconnected tests cover a 20-request failure burst and bound each serialized event record below 150 bytes, regardless of the exception's size. This bounds per-request output, not the total number of incoming failed requests.

`wrangler.catalogue.jsonc` keeps existing observability enabled, `head_sampling_rate: 0.01` and invocation logs disabled. Sampling means these records are not a complete incident count and not every failure is guaranteed to appear. Configuration, retention and provider allowances are unchanged. No new monitor, log sink, alert rule or paid feature is enabled. Confirm the account's actual retention, included logging/D1 allowances, sample behavior and remaining budget in the authorized provider controls before expanding monitoring. The current approved Cloudflare budget and existing usage alerts remain in force; billing alerts do not prove availability monitoring.

## Remaining acceptance

- Verify the exact catalogue version and these signals after an authorized coordinated release. Local fixtures do not verify live bindings, provider access or notification delivery.
- Define cleanup/snapshot freshness signals and bounded incident suppression/recovery behavior in the separate scheduled-work slice.
- Verify existing free/included monitoring capability, retention, quota and cost eligibility before configuration. If the needed route is unavailable within approved allowances, record the gap.
- Route a controlled non-customer alert to the already intended and verified owner/security destination, naming this runbook. Confirm actual receipt and quiet unchanged-state behavior. No new destination or service is selected here.

Rollback is the catalogue import/catch addition and its tests/documentation together. No schema, stored record, private protocol or service configuration changes need rollback. Retain existing observability settings and the shared sanitizer.

## Hourly cleanup failures

The Security scheduled handler reports one `customvibe_unavailable` record for a failed hourly phase: `scheduled_orders`, `scheduled_artwork`, `scheduled_mail_delivery` or `scheduled_auth`. The existing sanitizer records only the fixed phase and reason category. Added application diagnostics exclude exception text, SQL, identifiers, request data and nested exception details.

The handler rejects with a fresh `Error` whose fixed message is `Scheduled cleanup failed`, without the original cause or custom properties. This intentionally changes exception identity and removes the original message and stack from the rejection handed to platform capture while retaining a failed invocation. Platform-enriched context and uncaught platform payloads remain unverified; this boundary does not establish complete platform privacy or monitoring.

The handler stops later phases and adds no retry. Earlier cleanup may already have succeeded. Mail delivery cleanup retains its existing position between artwork and auth cleanup. The five-minute path retains its early return and existing caught `scheduled_maps` reporting; a caught maps failure still allows the same scheduled continuation, including the read-only locker health check described below.

Investigate the reported category against the matching deployed revision and schema, then use the existing release and recovery process. Do not assume a successful bounded invocation cleared the expired backlog. Order snapshot cleanup remains limited to 50 rows and artwork request cleanup to 20 rows per invocation. No success or completion marker is produced. These records do not detect a missed invocation, send an alert, establish recovery or close operational monitoring acceptance.

## Locker directory health

When locker refresh is enabled, the existing five-minute Security job checks the stored successful refresh time with one primary-key D1 read and uses R2 HEAD for the single fixed directory object. It does not read directory bodies, list objects, write a marker, change a lease or retry a failed refresh. The hourly cleanup path is unchanged. Healthy snapshots are silent. An unhealthy or unknown result emits at most one new fixed diagnostic per five-minute invocation:

```json
{"event":"customvibe_snapshot_unhealthy","state":"critical","reason":"snapshot_missing","runbook":"docs/availability-runbook.md#locker-directory-health"}
```

Only fixed state/reason strings and the static runbook path are included. No timestamps, directory contents, object keys, identifiers, request data or exception text are copied. `snapshot_missing` means HEAD confirmed an absent object. `snapshot_stale` warns at 365 minutes since the existing successful refresh marker and becomes critical at 375 minutes, matching the directory service's refusal. Missing/invalid metadata, bindings, failed reads or a two-second total probe deadline produce `unknown`/`missing_summary`; future timestamps produce `unknown`/`future_timestamp`. Unknown never establishes health or recovery. Oversized, zero-size or malformed HEAD metadata is unknown; this check does not validate the object's JSON body.

For missing objects, inspect the existing refresh's storage/binding state. For stale data, inspect the refresh outcome and retained six-hour lease without resetting it or replaying provider calls. For unknown/future data, inspect the matching deployed source, reviewed bindings, clock and provider health through authorised controls. Preserve manual locker entry, customer records, gates, disabled payments and all retention rules. A Promise deadline bounds the handler wait, not cancellation of an already-issued provider read. A late D1 result cannot start a later HEAD after this deadline; late read rejections are consumed safely.

At the existing schedule there are at most 288 probes/day, 8,928 per 31 days, each adding at most one D1 primary-key read and one R2 HEAD. No new application storage, schema, binding, credential, route, schedule, sender or paid feature is introduced. Existing 1% sampled logs and platform retention are unchanged. Repeated unhealthy state can produce repeated bounded diagnostics; it does not send messages or implement persisted alert suppression. Sampling can omit any particular diagnostic. This checks failures while the scheduler runs, cannot detect a stopped scheduler, and does not establish actual alert delivery or full TECH22 completion.

Local regression evidence and release status must be recorded separately below. Rollback removes the five-minute import/call, `security/locker-health.mjs` and its focused test together; no stored-data or configuration rollback is required.

21 October local verification: the two missing runtime diagnostics failed on the unchanged base, then all 34 focused snapshot, map-service and hourly-preservation tests passed under Node 22.23.3. They use actual refresh/scheduled handlers with disposable SQLite/R2, synthetic provider responses and no real network. Deadline cases verify late reads cannot start a HEAD or produce an unhandled rejection; query-only storage and fixed HEAD traps verify no probe write/body/list. The clean-worktree full-suite attempt encountered missing generated client/Admin prerequisites, loopback restrictions and a dependency-symlink permission fixture failure; the combined built integration suite remains required. No deployment, provider setup or live alert is claimed.
