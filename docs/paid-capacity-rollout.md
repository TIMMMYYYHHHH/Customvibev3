# Approved capacity and nearby locker map

19 October 2026. Owner approved Workers Paid US$5/month, targeting total Cloudflare spend below US$10/month. Reported first charge: R83. Zone stays Free; no paid add-ons. Geoapify Free: 3,000 credits/day and 5 requests/second. Currency conversions and applicable taxes can vary. Usage alerts are warnings, not a hard billing cap.

## Capacity and cost controls

- Pages and all three private Workers: 1,000 ms CPU ceiling per request.
- Worker diagnostic sampling 1%, automatic invocation logs off. No queries, credentials or customer details in map logs.
- Artwork: 2 GB retained, 500 MB/day, 5 GB/month, 100,000 monthly storage operations. Existing 14-day expiry, 60 files/order, 4 MB/file, 32 MB/order, 20 requests/day and 400/month remain. Email quotas remain separate.
- Cloudflare usage alerts: US$1 early warning and US$5 ceiling warning above the US$5 base. Existing default US$10 alert preserved.
- Geoapify requests share a database-backed 250 ms global spacing lease, 2,500 requests/day and 120/session/minute. Rejected requests fail safely to the list/manual choice. Counting every tile as one credit is deliberately conservative. Cached tiles/searches do not call the provider.
- Searches require the existing signed form session and CSRF. Tiles require that session, valid South African bounds and zoom 5 to 17. All browser calls use the same-origin server proxy. The Geoapify key stays encrypted in production Pages. Preview lookup is off.
- Search text is sent to Geoapify only on explicit search. Cache keys hash it; sanitized location results and public tiles cache for one day. The browser sees no key and no customer IP is forwarded. Provider attribution remains visible.

## Locker directory and selection

The private security Worker owns a single six-hour refresh lease, with at most four Courier Guy directory requests/day. A five-minute cron checks whether a refresh is due; separate hourly cleanup is preserved. There is no per-customer directory download/normalization. The validated public directory is stored in private R2, with its freshness stamp in D1, then cached at the edge for the remaining freshness interval. A 15-minute freshness grace beyond the six-hour refresh interval covers cron jitter and fetch time. Stale or unavailable data fails to the manual preference flow. Map maintenance errors do not prevent order/artwork retention cleanup.

The owner explicitly approved a second broadly scoped courier key, CustomVibe locker refresh, because the existing key cannot be revealed. The new key is encrypted in the private security Worker; code uses it only for the fixed read-only directory endpoint. The original production Pages key remains as a rollback reference. Neither key belongs in source, logs, browser responses or Founders Hub.

Customers search a town, suburb or postcode, choose a location match, then view nearby pins and a distance-sorted list. Radius choices are 10/25/50/100 km. Zoomed-out pins group together. Pins show a locker address/hours and an explicit selection action. Panning supports Search this area. Distances are approximate straight-line distances. Manual edits clear the verified locker identity. Server-side selection validation remains canonical. Selecting a locker never reserves space, books a shipment, quotes a charge or takes payment.

## Separate checks still required

Courier Guy public documentation does not publish directory fees, numerical limits or caching/display entitlement. These remain unconfirmed for this account. Actual shipment charges are separate. Do not claim free/unlimited courier API access or close the prelaunch terms check. No support message has been sent.

D1 paid recovery history and increased runtime do not prove intermittent availability issues resolved. Keep the existing stability and recovery rehearsal follow-ups open until measured. Current service usages suggest the US$5 base should cover this locked site's load; the US$10 target is not guaranteed by alerts.

## Verification record

Release 0c9d648 published successfully through protected workflow 39238283845, including the final keyboard fix. The preceding infrastructure release was 8967c8b (workflow 39235846903). CI passed 328 tests, public/SSR/admin builds and before/after deployment protection checks. The independent code review found one refresh/expiry timing issue, fixed with a 15-minute grace and regression coverage. Local map verification passed explicit location search, pin details/selection, distance-sorted list and manual edits clearing verified selection.

Original map rollout versions (later unrelated branding/email releases may supersede the application version):
- Pages: release 0c9d648; protected publish and post-deployment checks passed.
- Security: 7ab57005-8723-484b-95ce-bf626ca6091e; migration 0009 applied.
- Admin: 2582692a-a323-45e7-8089-5c8d9d6a7ca8, matching final public source/build.
- Catalogue: f6a20f47-cce3-417d-952f-54d4426f43a4.

Read-only Cloudflare API verification confirmed 1,000 ms limits on Pages production and all three Workers, plus 1% Worker diagnostic sampling with invocation logs off. Map feature flags and encrypted provider secrets are production-only. Website gate remains true. The scheduled refresh created the private 896.01 kB locker snapshot at 12:17:12 SAST on 19 October, verified in R2 with public access disabled.

Founders Hub Finance verification: the Cloudflare service amount is R83 monthly, automatic renewal. Recording the owner's reported payment in Tools & services generated one committed R83 cost/payment dated 19 October and one planned R83 renewal dated 15 November. A separate freshly loaded Finance view confirmed both linked records and the R83 cash movement, without manually entering any Finance expense. Subsequent rand charges may vary. Intermittent Hub response interruptions were recovered with Check original save, avoiding duplicates.

Live signed-in desktop acceptance passed: Durban North location search, real road tiles and attribution, 129 lockers within 25 km and 73 within 10 km, Kensington Boulevard (CG793) pin details/selection, and manual edits clearing the verified identity. The scheduled directory contains 2,199 lockers. Enter and Space pin activation and keyboard selection passed in both the local fixture and the final live release. Search this area and manual fallback also passed live. No customer order, email, payment or courier booking was submitted. Live responsive acceptance also passed on 19 October at 320×740 and 393×852: search, map tiles and attribution, clustered pins, CG793 pin selection, RVM00535 list selection, radius changes, Show/Hide, no-match guidance, Search this area and manual fallback. Document width matched viewport width at both sizes, with no horizontal overflow. These are responsive browser checks, not physical-device email rendering tests. Increased runtime is not a new hosted maximum-artwork acceptance result; the existing availability/recovery follow-ups remain open. Website password gate, separate admin sign-in and payments-off remain mandatory. Founders Hub Tools & services is the source for linked Finance costs; do not create duplicate manual expenses.

## Follow-up verification, 19 October

Read-only Cloudflare verification at approximately 13:15 SAST confirmed the website gate in both production and preview, the separate admin gate, 1,000 ms Pages/Worker CPU limits, and 1% Worker logs with automatic invocation logs off. The live Pages version was c123372 during mobile checks; concurrent branding and email work is preserved. The Workers dashboard showed 68.74k requests, 97.8k ms CPU and US$0 metered usage for the current cycle. R2 billing also showed US$0. US$1 and US$5 usage alerts plus the existing US$10 alert remain. No new paid feature was enabled. These observations support the US$5 base expectation, but alerts cannot enforce a US$10 hard cap.

## Founders Hub follow-up record

Confirmed saved: Cloudflare hosting service R83 monthly, automatic renewal, next 15 November; linked committed/payment and planned Finance entries; Geoapify service renamed from the existing OpenStreetMap record, R0 cost, provider dashboard link, and current setup/limits/live-map notes. No duplicate service or manual Finance expense was created. Cloudflare data/backups and PUDO notes now reflect the deployed capacity and encrypted scheduled refresh. Spending-controls task is Done; the map implementation activity and corrected parent scope/blocker are saved.

Hub returned repeated interrupted responses and HTML instead of JSON during subsequent edits. Its original-save recovery and refresh/review flow must be used before retrying any retained draft. Do not assume a failed save succeeded.

Follow-up reconciliation on 19 October:
- Geoapify Setup status and purpose now describe the connected Free map. Notes include desktop and 320/393 px acceptance. These fields were verified after reloading and reopening the service.
- Cloudflare hosting notes now record completed desktop/mobile acceptance, while retaining R83/month and automatic renewal. Original-save recovery confirmed the note.
- A fresh Finance session confirmed exactly one committed R83 cost and payment on 19 October and one planned R83 renewal on 15 November, each linked to Tools & services. The Finance verification subtask is confirmed Done.
- Map implementation scope and mobile evidence were saved, and its status is Done. The parent scope/blocker now removes mobile acceptance and retains the courier terms and separate CPU measurement follow-up.
- Refresh measurement scope now reflects the approved Paid plan instead of obsolete free-tier-only acceptance. Its post-rollout cold/cached/selection measurement remains required.
- Capacity rollout is now In progress with a saved activity recording deployed limits and the outstanding hosted artwork/stability/recovery acceptance. Its parent remains In progress. No new customer test order was submitted.
- Fresh unauthenticated checkout request returned HTTP 401 with noindex and private/no-store. Payments remain unavailable; the test-only browser basket was discarded by closing its temporary tab, and browser viewport settings were restored.
- Added Upkeep subtask “Resolve interrupted Founders Hub saves” under the existing service-maintenance parent, with reproduction and acceptance criteria. It covers HTML-instead-of-JSON responses, interrupted writes, stale disabled editors after revision conflicts, original-request recovery and field-limit validation. No Hub application fix is claimed.

The initial attempt to add the capacity subtask description remained an unconfirmed original request. A fresh read showed it absent; the deployed settings, remaining acceptance and supporting link were instead saved as an activity on the existing task, whose In progress status was confirmed. Do not replay the older description request blindly. The separate refresh comment met a revision conflict and was reconciled against a fresh read before re-saving, preserving other chats’ Workspace email changes.
