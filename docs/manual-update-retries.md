# Manual customer-update retries

A non-Fulfilled customer update may be retried only after a recognized, structured provider rejection confirms that the provider did not accept it. Admins use **Preview retry**, review the current message, then explicitly choose **Send update**. Previewing, changing stages and recovering an expired session never send automatically.

## Safeguards

- Pending, accepted, uncertain and unclassified historical failures remain locked. Timeout, 408, 409, 429, 5xx, malformed responses and unknown provider errors do not unlock retries. Delivery confirmation and bounce reconciliation are separate work.
- Fulfilled remains exactly one attempt per order, even after rejection, reopening or fulfilling it again.
- Retry previews require an authenticated, same-origin, CSRF-protected POST. Ordinary GET previews are read-only. Each fresh preview replaces a ten-minute capability tied to the expected failed attempt.
- The current order version, previous attempt, rejection classification and preview capability are checked atomically. Only the winning reservation consumes the shared daily/monthly email allowance. Every attempt has a distinct stable provider idempotency key.
- Outcomes identify the reservation, so a late outcome cannot overwrite a newer attempt. An outcome that cannot be recorded leaves the attempt locked pending verification.
- All retries send ordinary stage updates, including orders with historical approval state. There is no proof invitation or customer review capability dependency. Retry previews retain the exact failed attempt/version and fresh retry capability; they do not change stage or version to bypass duplicate protection.
- Migration `0010_manual_update_attempts.sql` preserves the existing per-version summary and adds durable attempt history. Historical failures are not silently reclassified. All history and preview hashes expire with the order details. Compatibility triggers preserve older summary writes and expiry cleanup.
- Website and admin locks, CSRF, private artwork, retention, unpaid status and disabled payments remain unchanged. Email availability does not depend on the website gate. No new paid service or recipient allowlist is introduced.

## Deployment order

1. Complete independent review, actual CI and coordinated release checks. Preserve a protected database backup using the existing operational process.
2. Apply additive migration **0010 first**. Existing workers continue using the unchanged summary table; the new triggers preserve their writes and cleanup.
3. Deploy the new private **security worker**. Verify migration availability and authenticated detail reads without sending email.
4. Deploy the matching **admin code and assets** from the integrated revision. Complete any paired publication required by that release, then refresh admin tabs.
5. Verify the live publication without sending messages unless an actual email acceptance check is explicitly authorized. Local acceptance is not production verification.

Do not deploy the new admin against the old security worker. A claim without an attempt identity fails closed before provider dispatch and can leave a pending reservation requiring investigation.

## Safe rollback

Keep migration 0010 and all attempt history. Never delete failed rows to unlock sending. After retries exist, do not restore the old version-only security outcome writer. Keep the new reservation/marking handlers and use a compatible forward repair. An older admin UI can be restored while retaining the new security worker, but it will not expose retries and may render history with duplicate keys; refresh to the corrected UI when available.

## Historical local validation

The exact-proof-link and review-invitation assertions in this implementation evidence are superseded by the 21 October 2026 [customer preview policy](customer-preview-policy.md). Current verification must prove ordinary manual stage preview/send and retries work without customer proof tokens while retaining all retry safeguards.

At implementation handoff, the full local suite passed **352/352 tests**. Public client/SSR/prerender and admin build/preparation passed; the existing public bundle-size warning remains. Independent reviews covered the ledger and admin/preview boundaries.

Synthetic regressions cover concurrent and repeated retries, stale versions/attempts/previews, expired capabilities/orders, quotas, ambiguous provider outcomes, failed outcome recording, late marks during a pending retry, exact proof links, historical migration, cleanup and Fulfilled across reopen. Route tests verify authenticated GET remains read-only and rejected POST requests cannot change capabilities. A local Chrome flow verifies POST/CSRF preview issuance, zero sends from opening or closing previews, locked pending controls, one explicit send and retained rejected/accepted history. All API responses and provider calls were synthetic; no real email or production record was used.

Relevant checks:

```sh
node --test tests/*.test.mjs
node tests/manual-update-attempts.browser.mjs
```

The browser check requires a local Vite server on port 5193 by default, Playwright and a compatible browser. `PREVIEW_ORIGIN`, `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` can select local alternatives. Do not point fixtures at production.
