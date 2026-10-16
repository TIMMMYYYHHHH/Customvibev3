# Admin availability recovery

## Current owner decision, 17 October 2026

Tim chose to leave the availability investigation and stability follow-up Blocked and return later. Do not contact Cloudflare or resume diagnostics until he resumes this work. The report below remains unsent. Phone email acceptance stays on hold. Independent wording work may proceed.

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
