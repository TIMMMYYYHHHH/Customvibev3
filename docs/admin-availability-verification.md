# Admin availability recovery

## Evidence, 16 October 2026

A normal authenticated Orders GET returned 503. Privacy-safe diagnostics on admin version `056240e9-234a-4e65-8f46-962d6fb5e8fe` identified `auth_status`, upstream HTTP 503. Security version `1353eb50-04d3-4d3d-b68d-16712dd2e936` identified a D1 database exception during `security_status`, the session-revocation SELECT, taking about 2.9 seconds. Later identical checks succeeded in about 0.16 seconds without changing data or configuration. The error was caught, so Cloudflare's execution outcome of `ok` did not imply HTTP success.

This confirms the failing application boundary and intermittent database behaviour. It does not identify Cloudflare's internal infrastructure cause. Authentication secrets, order stages and email templates were not the failed operation in the captured request.

## Correction

The security service retries only the session-revocation SELECT once after 150 ms for D1/network errors. Known schema, validation, quota, overload and limit errors are excluded. There is no session cache or authentication bypass: revoked sessions remain revoked and an unsuccessful second read still returns 503. The retry creates a fresh statement and uses the same validated session ID and query parameters.

Login reservation counters, logout writes, order changes, artwork operations, email reservations and sending are not retried by this change. No migration, account/resource upgrade or permission change is required. The existing security Worker serves both website and admin authentication.

Fixed-category diagnostics identify the failing boundary and recovery attempt. They never print error objects/messages, headers, bodies, URLs, passwords, session tokens or customer details. Persistent Cloudflare observability remains disabled; temporary live logs are used for verification.

Cloudflare documents transient D1 errors and permits retries only for idempotent operations. It already retries read-only queries internally; this adds at most one application-level retry for this specific SELECT after those internal attempts are exhausted: https://developers.cloudflare.com/d1/observability/debug-d1/ and https://developers.cloudflare.com/d1/best-practices/retry-queries/ .

## Local verification

Regression tests failed before the correction and passed afterward. They cover recovery, retained revocation, bounded persistent failure, no schema/quota retries, no replay of login writes, and diagnostic privacy. Full suite: 154 passing tests. Public, SSR/prerender and admin builds pass. No real email or production record change is part of these tests.

## Live verification

Publication and final signed-in checks are in progress. Do not treat the previous successful retry as proof of the correction. Phone email testing remains subsequent work.
