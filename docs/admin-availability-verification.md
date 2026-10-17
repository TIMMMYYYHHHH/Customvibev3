# Admin availability recovery

## Current owner decision, 17 October 2026

Tim explicitly resumed the availability investigation after temporary service errors blocked the approved CPU verification order. The earlier hold is superseded for this investigation. Continue only the same approved synthetic draft `62a8d010-96a3-4c1a-ab2a-bf9fef9f94aa`; no additional order is authorized. Other email testing, including phone acceptance, stays on hold. Tim subsequently chose to keep the prepared redacted report unsent. No provider or Community contact is authorized or has occurred. Availability stability and hosted CPU acceptance remain blocked by the unresolved D1 errors; the diagnostic evidence is retained without further speculative retries.

## Fresh evidence, 17 October 2026

The approved 60-file checkout attempt at 02:36:27 UTC and same-order retry at 02:37:21 UTC both stopped with a plain-text temporary-service response surfaced as a JSON parse error. A read-only check confirmed a single 31,522,260-byte reservation created 02:36:32 UTC, exactly 14-day expiry, 1/60 files ready, max tries 1, not finalised and no order sequence. Admin lookup confirmed unfinished artwork. The original tab and draft are retained.

After Tim resumed investigation, one further same-order attempt at 02:40:01 UTC was captured in temporary live logs on security version `e7ce60e4-3f11-4bce-b0f2-8f2af2cd63cb`. Upload index 2 returned HTTP 200 (11 ms CPU, 1,227 ms wall time) at 02:40:10 UTC. Index 3 returned HTTP 503 with fixed diagnostic `security_artwork/database_internal` (12 ms CPU, 2,453 ms wall time) at 02:40:11 UTC. Execution outcome was `ok` because the exception was caught. These are endpoint-attributed samples, unlike the earlier dashboard percentile window. They do not establish dependable Free CPU headroom.

Direct D1 dashboard SELECTs also intermittently returned internal errors without passing through application code. Provider references: `e_PVSMDp_ad50e61b29d1409f9f9927a129324d9a`, `e_PVSMDp_c5a083c9be884334af542511aa76d226`, `e_PVSMDp_0b4c74fcc55c413993515c030e052ec8`. Repeated metadata SELECTs and `SELECT 1 AS availability_probe` succeeded. Read-only API metadata: production database, 212,992 bytes, WEUR, replication disabled. This rules out the application response parser as the cause of those direct-console failures; it does not establish Cloudflare's internal root cause. No active D1 incident was listed on the public status page when checked. No migration, reset, write replay, auth bypass, paid feature or provider contact occurred.

A narrow application correction returns safe JSON for caught service errors so the existing checkout displays a readable retry message and retains the same draft. Its regression failed against the previous plain-text response and passes after the change. This fixes error presentation, not D1 availability. Separately, the CPU follow-up uses workerd's native FixedLengthStream to enforce exact upload size without JavaScript chunk copying. All 192 tests pass; local workerd accepts maximum sizes and rejects short/oversized bodies without storage writes. Independent native-stream checks also verified cancellation and source-error cleanup. Hosted acceptance remains open.


## Evidence, 16 October 2026

A normal authenticated Orders GET returned 503. Privacy-safe diagnostics on admin version `056240e9-234a-4e65-8f46-962d6fb5e8fe` identified `auth_status`, upstream HTTP 503. Security version `1353eb50-04d3-4d3d-b68d-16712dd2e936` identified a D1 database exception during `security_status`, the session-revocation SELECT, taking about 2.9 seconds. Later identical checks succeeded in about 0.16 seconds without changing data or configuration. The error was caught, so Cloudflare's execution outcome of `ok` did not imply HTTP success.

This confirms the failing application boundary and intermittent database behaviour. It does not identify Cloudflare's internal infrastructure cause. Authentication secrets, order stages and email templates were not the failed operation in the captured request.

## Correction

The security service retries explicit session-revocation, order-list/detail/history and artwork-lookup SELECTs once after 150 ms for D1/network errors. The helper rejects writes, multiple statements and non-read methods. Known schema, validation, quota, overload and limit errors are excluded. There is no session cache or authentication bypass: revoked sessions remain revoked and an unsuccessful second read still returns 503. Each retry creates a fresh statement and uses the same validated query parameters. Preview update renders one returned order snapshot instead of fetching order details twice.

Login reservation counters, logout writes, order changes, artwork quota writes and object operations, email reservations and sending are not retried by this change. No migration, account/resource upgrade or permission change is required. The existing security Worker serves both website and admin authentication.

Fixed-category diagnostics identify the failing boundary and recovery attempt. They never print error objects/messages, headers, bodies, URLs, passwords, session tokens or customer details. Persistent Cloudflare observability remains disabled; temporary live logs are used for verification.

Cloudflare documents transient D1 errors and permits retries only for idempotent operations. It already retries read-only queries internally; this adds at most one application-level retry for these explicit SELECTs after those internal attempts are exhausted: https://developers.cloudflare.com/d1/observability/debug-d1/ and https://developers.cloudflare.com/d1/best-practices/retry-queries/ .

## Local verification

Regression tests failed before the correction and passed afterward. They cover recovery, retained revocation, bounded persistent failure, no schema/quota retries, no replay of login writes, and diagnostic privacy. Full suite: 159 passing tests. Public, SSR/prerender and admin builds pass. No real email or production record change is part of these tests.

## Live verification

The initial session-only correction (`39e2e02`) passed sign-in, Orders reload and history checks. Subsequent manual preview returned 503 and some multi-file artwork previews failed while other captured artwork responses were 200. Do not infer their exact cause from the earlier auth failure. These checks led to follow-up `f55e96c`: scoped read recovery, one preview snapshot and distinct security order/artwork error categories. Live logs then captured two recovered auth reads (HTTP 200 after a retry) and one failed twice (HTTP 503, `security_status`, `database_internal`, about 6.75 seconds) at 23:49 SAST. The recovery works, but is not a cure for continuing provider errors.

`d52dd90` also bounds artwork preview loading to two requests at a time and adds a Retry preview action on only the failed image. Queued requests are cancelled on navigation; no background automatic replay of downloads occurs. Local tests cover cancellation, concurrency, and failure slot release. The published UI showed two specific failed previews; each recovered using its own retry action and all eleven files then displayed. The clearer error avoids incorrectly claiming the session or artwork expired. A security-artwork read still exhausted recovery with `database_internal` and HTTP 503 at 23:52 SAST. **Overall availability remains unresolved.** Do not mark the task complete or proceed to the phone email acceptance check on the basis of a later successful retry.

Final application commit: `d52dd9073ad7abea46a183fdc2f956e6a0848272`.
- Security Worker: `ce899445-1dcd-4fec-b6e9-5fa06e8d7f4d`.
- Admin Worker: `ed8ffa2a-b779-40bb-a636-97e97b966767`.
- Protected Pages [workflow 38972155642](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38972155642): success, including tests, builds and protection checks. Before/after business admin guards passed.
- Tim confirmed normal sign-in and Orders opened. Subsequent authenticated reloads/list/details worked. All three orders retained their stages. CV-000001 still has its two accepted manual updates and disabled duplicate-send action. The fresh-order Preview update displayed the correct recipient and message; it was cancelled without sending.
- No email sent, stage change, migration, credential rotation, authentication weakening or paid/persistent logging. Temporary live diagnostics are closed after verification.

## Remaining provider investigation

Cloudflare's public status page showed no active D1 incident when checked at about 21:50 UTC on 16 October: https://www.cloudflarestatus.com/ . This does not rule out an account/database-specific issue. Internal database faults continue on small indexed reads; further blanket retries, authentication caching/bypass, or replaying writes would conceal errors or create risk. Keep the Founders Hub availability task open with the provider follow-up explicitly tracked. Phone email acceptance remains pending.

A support-ready report follows. It has not been submitted to anyone:

**Subject:** Intermittent D1 internal errors on small indexed SELECTs

Business account `4f57d4e924674cb87b33d4c884745cf6`; D1 `customvibe-security`, database `25fb2dda-2ce9-4f8c-b49d-e6480218a5cf`. On 16 October 2026, normal authenticated admin reads intermittently fail, while identical subsequent reads succeed. At approximately 21:49:35 UTC, a session revocation check failed after a bounded application retry, HTTP 503, classified `database_internal`, approximately 6.75 seconds. Two nearby checks recovered to HTTP 200 after a retry. At approximately 21:52:20 UTC an artwork lookup also exhausted the bounded read retry and returned HTTP 503 classified `database_internal`.

Queries include `SELECT exp FROM revoked WHERE id=? AND exp>?` and `SELECT * FROM artwork_requests WHERE id=?`. Parameters contain private identifiers and are deliberately omitted. Each retry uses a new prepared statement. Known schema, quota and overload errors are excluded from retry; this event was classified as an internal D1 error. The deployed security Worker version is listed above. No migration, DB reset, permission change or paid feature was introduced. Authentication remains fail-closed, and writes are not retried.

Please investigate the database's internal errors at these times and advise on a durable remedy within the existing Free resources. The application logs intentionally retain fixed error categories rather than full error text or customer/session data; no precise Cloudflare-internal cause has been established.

## Follow-up deployment and final captured failure

Commit `376795e` deployed the native bounded reader and safe JSON errors at 02:45:18 UTC. Security version `38cdf928-a60d-449d-916f-b8815840ffe9` was verified at 100% traffic; public Worker/preview URLs remain disabled. The same draft was retried at 02:46:07 UTC. Upload index 0 failed at 02:46:08.713 UTC with HTTP 503, `security_artwork/database_internal`, 2 ms CPU and 2,332 ms wall time. The browser now displays the safe retry message, retains the same draft and offers Retry same order. The error-presentation acceptance passed. This failed readiness lookup did not exercise the native reader, so its 2 ms CPU is not evidence of successful upload CPU headroom. No new order number or successful email sending was observed. Temporary live diagnostics were paused after capture.

The D1 dashboard's last-24-hour rounded totals were about 5k queries, 5k rows read and 2k rows written. The usage chart reported 193 kB current storage; the read-only database metadata API reported 212,992 bytes. These are different reported observations, not a precise storage comparison. The unchanged project resource use remains small. No paid upgrade or persistent logging was enabled.

### Prepared public report, not sent

Cloudflare's [support options](https://developers.cloudflare.com/support/contacting-cloudflare-support/) direct Free technical issues to Community or Discord; paid technical support is not being enabled. The following redacted Community report is ready for owner review. It omits account/database identifiers, hostnames, customer/session details, credentials and full request headers. Tim reviewed the proposed contact and explicitly chose to keep this report unsent. Do not post or send it without a later explicit change of decision.

**Title:** Intermittent D1 internal errors in Dashboard console and Worker binding (Free, WEUR)

A small production D1 database on Workers Free intermittently returns internal errors through both the Cloudflare Dashboard SQL console and the Worker binding. Repeating the same read later can succeed. Database metadata reports production, WEUR, 212,992 bytes and read replication disabled. The dashboard's last-24-hour totals are approximately 5k queries, 5k rows read and 2k rows written.

The problem was observed on 16 October 2026 around 21:49 and 21:52 UTC and again on 17 October around 02:35-02:46 UTC. A direct-console example is `SELECT id,amount FROM artwork_usage ORDER BY id;`. Console errors include:

- `internal error; reference = e_PVSMDp_ad50e61b29d1409f9f9927a129324d9a`
- `internal error; reference = e_PVSMDp_c5a083c9be884334af542511aa76d226`
- `internal error; reference = e_PVSMDp_0b4c74fcc55c413993515c030e052ec8`

A later `SELECT 1 AS availability_probe;` succeeded, as did a repeated indexed record lookup. No data reset, migration or configuration change occurred between failures and successes. Application traces also catch D1 internal errors and return HTTP 503: 17 October 02:40:11 UTC (2,453 ms wall, 12 ms CPU) and 02:46:08 UTC (2,332 ms wall, 2 ms CPU). The second failure is well below the Worker CPU allowance. The public status page showed no active D1 incident when checked.

Authentication stays fail-closed. Existing explicit read-only recovery is bounded; writes and email sends are not automatically replayed. The affected application remains password protected. The dashboard-console failures reproduce outside our application request handler.

Can Cloudflare investigate the internal-error references and advise on a durable remedy within the existing Free resources? We can provide the database ID privately to Cloudflare staff through an appropriate authenticated channel. No credentials or customer data will be shared.
