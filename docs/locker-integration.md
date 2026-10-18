# TCG Locker integration

18 October 2026. Deployed and verified on the locked live storefront. Payments and courier booking remain off. Provider API fee/refresh terms and cold-refresh CPU headroom remain open launch checks.

## Status and remaining dependencies

The owner authorised a dedicated CustomVibe key, Cloudflare secret storage and locker selection, with no paid upgrades, payments disabled and the website locked. On 18 October the CustomVibe key was created in the signed-in TCG Locker portal. No scope controls or API charge were displayed. Treat the credential as potentially broader than directory-read access and revoke it in that portal if compromised. The application itself only uses one fixed read endpoint.

The key was saved as the encrypted production-only `TCG_LOCKER_API_KEY` binding in business Cloudflare Pages `customvibe-business`. Reopened settings confirmed persistence and encryption. The key was passed through a local mode-0600 named pipe for bounded API verification; it was not saved in a regular local file or logged.

Authenticated `GET https://api-pudo.co.za/api/v1/lockers-data` returned HTTP 200, 3,564 service points and approximately 5.98 MB of JSON. The live schema has `status: online/offline`; only online type-id-2 lockers are accepted. There were 2,138 accepted online lockers and 375 offline lockers excluded. Kiosks and pickup points are excluded. The normalised directory is about 837 KB. Both HH:MM and HH:MM:SS hours occur. Public production documentation at https://api-pudo.co.za/ describes this directory integration, but its abbreviated example hostname/path is inconsistent with the verified route.

Provider API fees and refresh quotas were not stated in the reviewed portal/documentation. No fee, upgrade, booking or top-up was accepted. Preserve that uncertainty in cost reporting and follow it up before public launch.

## Deployed behaviour

- An authenticated, production-host-only `/api/lockers` route behind the existing website gate and signed form session. A fixed GET request sends the credential only to the courier API; it is not a general proxy.
- Explicit field allowlisting, South African coordinate bounds, type filtering, duplicate-ID rejection, response-size and timeout limits. Provider error bodies are not passed to customers.
- Public location data cached for up to six hours, concurrent request coalescing and one-minute failure backoff. Expired results are not silently treated as current. Cache reuse is per Cloudflare data centre, not a global hard request quota. Provider terms must allow this refresh approach.
- Search by name, town, address, postcode or code. Up to 20 results initially, with Show more. Search terms stay in the browser.
- Choosing a result fills the locker name/town and shows its pin when the customer opts into the existing OpenStreetMap embed. Editing either manual field removes the selected ID/pin.
- Fresh selected IDs and their name/town are checked against the server's directory before artwork allocation. Signed resume and upload grants bind the full verified snapshot, allowing recovery/finalization without another directory dependency. Legacy attachment mode continues using manual preferences; live selection is offered only with private artwork storage. Only the server adds the provider identifier. Admin and order summaries retain the code. Manual entries remain visibly preferences.
- No quoting, reservation, booking, tracking, dispatch, payment or automatic status-email capability added.

## Credential and rollout procedure

1. Use the existing TCG Locker account. Create a dedicated `CustomVibe` key. Choose read-only locker-directory scope if the portal supports it. If the portal provides only broad account access, document that scope and protect/revoke accordingly. Do not store the key in chat, documents, logs or screenshots.
2. Verify the documented production route with one bounded read request. Inspect schema and inactive status semantics without printing credentials. Do not send customer data to verify directory access.
3. Store only in the business Cloudflare account `4f57d4e924674cb87b33d4c884745cf6`, Pages project `customvibe-business`, production encrypted secret `TCG_LOCKER_API_KEY`. Do not install in the personal account, admin browser state, preview environment or frontend variables. Keep a revocation/rotation path in the courier portal.
4. The production release sets `LOCKER_LOOKUP_ENABLED=true`; defaults and preview stay false. Keep the website gate on. Provider fee/refresh terms remain an explicit follow-up, and do not authorise any paid plan. Remove or disable the binding if access must be revoked.
5. Build and test from the clean release worktree. Publish the public site and the admin Worker from the same source revision using the existing protected deployment flow. Do not deploy the other dirty checkout.
6. Verify gate/login protections, payments off, real directory search/selection, pin placement, keyboard/mobile operation, manual fallback, saved locker ID/name/area and absence of secret values in public responses/assets. Use local mocked side effects for automated tests. Do not claim a real order was stored without verifying one; any live unpaid order remains a real record and may send the normal order emails.

## Costs and limits

No paid plan, subscription, top-up or booking was enabled during this work. The Cloudflare dashboard showed $0 billable usage and 17,572 of 100,000 daily requests during setup. This is a point-in-time observation, not a guarantee about future provider billing. Target additional hosting/map subscription cost is R0 while the existing account remains within free quotas and the courier confirms API access is free. Actual courier charges are separate and no delivery is booked by this feature.

- Cloudflare Workers Free currently lists 100,000 requests/day and 10 ms CPU per invocation. Pages Functions consume the Workers allowance, shared with other Workers on the account. Cache reuse reduces courier reads but does not remove incoming Function requests. The first live cached read used 14 ms CPU. Streaming the validated cached JSON reduced a measured cached read to 3 ms CPU / 152 ms wall time. A cold directory refresh succeeded with 221 ms CPU / 1,478 ms wall time, above the nominal free allowance. Cloudflare allows flexibility for infrequent overruns, but this is not guaranteed. Cold-refresh CPU remains an explicit reliability follow-up before public launch. No paid upgrade was enabled. Free quotas can interrupt service; manual entry remains available and no automatic upgrade is allowed.
- The existing OpenStreetMap embed needs no paid map subscription or API key. It loads only on request, retains attribution and does not bulk-download tiles. Service is best effort with no SLA, and access can be blocked under the usage policy. Keep the text list/manual fallback usable.
- Public courier documentation reviewed did not establish the account's API price or usage entitlement. Do not advertise guaranteed free courier API access until verified. Actual parcel charges, dimensions, weight limits, collection windows and coverage still require confirmation before deliveries.
- Selection does not prove available locker capacity and does not reserve it. Cached locations can be up to six hours old; fulfilment requires a fresh courier check.

Sources checked 18 October 2026:

- [Production API documentation](https://api-pudo.co.za/)
- [Sandbox API documentation](https://api-docs.tcglocker.co.za/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)

## Verification

Public build, server rendering/prerender and admin build passed, followed by all 319 automated tests in the final protected workflow. Coverage includes server-only credentials, malformed/oversized provider responses, disabled/preview/cross-site/session rejection, cache expiry/failure recovery, ID tampering, canonical order/email fields and unchanged payment status.

Local fictional-data browser checks verified search, selection, field population, real optional OSM pin/attribution, manual edits clearing selection, and zero-result recovery. Phone layouts at 320 and 393 px were visually inspected. Independent code review identified retry/cache recovery issues; both were fixed with regression tests. The authenticated live API, encrypted secret installation, deployed live search, keyboard selection, field/basket summary updates, optional real map pin, manual-edit reset and no-result fallback are verified. Founders Hub is the current progress reference; this document contains implementation detail only.

## Release and live evidence

- Initial feature release `aa0c72c` and matching admin Worker `f8258938-9706-490b-811a-b72de233ae8b` deployed. The existing Pages-only CI credential could not publish admin; the existing business helper deployed the reviewed admin bundle/assets without expanding permissions. Its temporary configuration was restored byte-for-byte. Admin gate, AUTH binding, manual sending and credential-presence checks passed.
- Live diagnosis found Workers does not support `redirect: error`. The adapter now uses `manual` and rejects non-success responses, including redirects, so credentials are never forwarded to a redirect target. An actual workerd regression test failed before this fix and passed afterwards. Diagnostics log only fixed stage names and HTTP status, never secret values, bodies or exception text.
- Final application `e1c298e`, Pages deployment `c08046ff-3fe5-4fe9-8417-1359b56f5587`. [Protected workflow 39140523559](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39140523559) passed public/admin builds, 319 tests and before/after protection checks. Concurrent approved button and seasonal changes were retained.
- Production key encrypted and lookup enabled; preview has no courier key and lookup disabled. Website gates remain enabled; payments unavailable. No secret enters public assets or directory responses.
- Live directory contained 2,031 accepted online lockers at checkout, compared with 2,138 during the earlier direct API check. Status/counts change over time. Postcode `4051` returned 17 matches. Exact code `CG1291` selected Astron Energy Glen Ashley, Durban North. The real OSM pin loaded at -29.758306, 31.049232 with attribution. Editing the name cleared the ID/pin and changed the summary to a manual preference. An unmatched search showed recovery guidance. Repeat checkout loaded the cached directory successfully.
- Cold and cached outcomes were both `ok`, with no exceptions. The measured cold CPU overrun is not evidence of guaranteed free-tier reliability. Keep the CPU follow-up open.
- No contact/order form was submitted, email sent, customer record changed, payment taken or courier shipment booked. Canonical ID persistence and signed recovery are covered by automated tests with mocked side effects; no new live stored-order claim is made.

Additional references: [Workers request redirect support](https://developers.cloudflare.com/workers/runtime-apis/request/), [Workers CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).
