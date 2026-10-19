# CustomVibe Cloudflare capacity and locker map review

19 October 2026. Recommendation: use **Workers Paid, US$5/month plus metered overages**, while keeping the customvibe.co.za website plan Free. This addresses the measured processing-time constraint without buying unrelated website features. No subscription, quota, payment, security or runtime change was made during this review. A paid plan and spending budget still need owner selection.

## Current account and usage

Signed-in business Cloudflare dashboard, approximately 10:56 to 11:10 SAST. Billing period shown: 15 October to 15 November. These are developing-period observations, not a traffic forecast. The secure deployment helper was unavailable; live inventory came from the dashboard. Source review includes current main through 4ef5879, preserving newer work from other chats.

| Service | Verified setup and usage | Useful next step |
| --- | --- | --- |
| Workers and Pages | Workers Free; one Pages project, customvibe-business; three Workers, customvibe-admin, customvibe-catalogue and customvibe-security. 65.04k period requests, 96.1k CPU ms, 2,393 requests today, $0 billable usage. | Workers Paid covers the account and Pages Functions. Keep existing architecture initially. |
| D1 | customvibe-security 282.62 kB; customvibe-content 237.57 kB. Total 520.19 kB; 21.24k rows read and 3.25k written in the displayed billing cycle; $0 billable usage. | Gain longer recovery and query headroom. Keep indexed queries and bounded batches. |
| R2 | One private artwork bucket, customvibe-test-artwork. 179 objects, 66.97 MB; 209 Class A and 862 Class B operations; $0 billable usage. Billing lists **R2 Paid**, renewing 15 November. | R2 usage billing already exists with free allowances. Workers Paid does not enlarge those allowances. Raise application storage budgets separately. |
| Workers KV | Separate site/admin lockout namespaces. 212 bytes; 127 reads, four writes, four lists, no deletes; $0 billable usage. | Existing authentication use is tiny. A separate compact locker cache could use the increased allowance. |
| Domain, DNS, HTTPS and security | customvibe.co.za Free; Bot Fight Mode active; one of one rate-limiting rules used by CustomVibe login burst protection on /auth/login. Last 24 hours: 79 visitors, 8.64k requests, 50.49% cached, 1 GB served. | Keep Free initially. Reconsider Pro if managed security rules and additional edge controls become necessary. These numbers include testing/bots and are not sales demand. |
| Monitoring and deployment | Period observability events and Workers build minutes show zero. GitHub Actions builds and directly uploads Pages. Private Worker publishing remains separate. | Add privacy-safe sampled diagnostics and spending alerts. Improve paired deployment verification; buying Workers build capacity does not speed the existing GitHub workflow. |
| Other existing services | Repository and service records show Turnstile, hourly private-artwork cleanup, email forwarding and Web Analytics. These were not individually re-audited in this pass. | Retain them. Their purpose does not require a website Pro upgrade. |

Billing lists Workers Free, R2 Paid and the domain Free Plan. This corrects any earlier shorthand suggesting that every product has billing disabled. R2 currently costs $0 within its allowance; it can charge above that allowance.

## Plan choice and limits

Workers Paid starts at $5 per account per month, including 10 million requests and 30 million CPU milliseconds. Overage rates are $0.30/million requests and $0.02/million CPU ms. Pages Functions use this same plan. Network waiting is different from CPU processing time. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

Website Pro costs $25/month on monthly billing, or $240/year. It adds website security/performance features but does not replace Workers Paid. Buying both on monthly billing starts at $30/month before overages and tax. Business starts at $250/month monthly or $2,400/year; the current measured workload does not justify it. [Website plans](https://www.cloudflare.com/plans/)

The paid developer platform scales by metered usage rather than by choosing a larger server. It is not unlimited capacity for $5. Workers memory stays 128 MB per isolate; the HTTP body limit on a Free or Pro zone stays 100 MB. CPU can be configured up to five minutes, with a 30-second default on Paid. We should use smaller measured limits for this app. [Runtime limits](https://developers.cloudflare.com/workers/platform/limits/)

D1 Paid includes 25 billion row reads/month, 50 million row writes/month and 5 GB total storage. Beyond that: $0.001/million reads, $1/million writes and $0.75/GB-month. Each database can grow to 10 GB versus 500 MB on Free; Time Travel expands from seven to 30 days. The longer restore window is immediately useful even though today's databases are tiny. Paid does not automatically fix intermittent D1 internal errors or make every query faster. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

KV Paid includes 10 million reads/month and one million each of writes, deletes and lists, plus 1 GB storage. Excess reads cost $0.50/million; each other operation type $5/million; excess storage $0.50/GB-month. [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/)

R2 Standard retains its separate free allowance: 10 GB-month storage, one million Class A and ten million Class B operations monthly. Above it, storage is $0.015/GB-month, Class A $4.50/million and Class B $0.36/million, with billing-unit rounding and no egress fee. Keep Standard for 14-day artwork, rather than Infrequent Access with a 30-day minimum. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

## Changes worth making after selection

1. **Processing headroom:** configure a conservative initial CPU ceiling, proposed 1,000 ms for the storefront/security/admin paths, then measure cold locker refresh, maximum supported artwork and admin downloads. The last measured locker refresh used 221 ms CPU and 1,478 ms elapsed time; a cached read used 3 ms CPU. Earlier artwork tails also exceeded Free's nominal 10 ms. Keep these launch checks open until the paid configuration is deployed and measured.
2. **Shared locker refresh:** move directory refresh off the customer's request path into a bounded scheduled refresh and a compact shared snapshot. The current six-hour cache is per data centre, so it does not mean four provider calls per day globally. A single refresh owner, backoff, timestamps and last-known-good handling can bound provider traffic. Agree freshness and caching rules with TCG first; never treat stale status as a reserved compartment.
3. **Artwork capacity:** propose raising retained artwork from 500 MB to 2 GB, daily upload budget from 100 MB to 500 MB, monthly uploads from 500 MB to 5 GB, and monthly storage-operation budget from 10,000 to 100,000. These are application controls, not Cloudflare subscription switches. At 32 MB per full-size order, the byte limits improve from three to 15 such orders/day and 15 to 156/month, assuming unused budgets. Other guards can still limit throughput. Keep 60 files, 4 MB/file, 32 MB/order, 14-day expiry and private downloads. Keep the 20 artwork requests/day and 400/month initially; revisions also consume allowance. Validate a combined email/order capacity budget before raising request throughput.
4. **Recovery:** verify D1's 30-day Time Travel after upgrade and rehearse restoration on disposable data. Preserve six-month order detail retention and 14-day artwork expiry, including after any restore. A database backup is not an artwork backup.
5. **Monitoring and spending:** add redacted error/latency/CPU diagnostics with sampling and short retention. Never log keys, photos, order bodies or private proof links. Propose usage-spend alerts at $1 and $5 above subscription charges, plus application resource ceilings. Cloudflare explicitly states budget alerts do not stop spending. [Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)
6. **Release reliability:** ensure matching public/admin builds and checks, and verify every private service affected by shared changes. Measure failures before adding queues or a new hosting architecture. Do not blindly retry customer emails or order writes.

At present volumes, the likely Cloudflare charge after this upgrade is the $5 base, subject to actual metered use. For illustration, 1 million requests averaging 10 ms consume 10 million CPU ms, within both included allowances. At 10 million requests averaging 10 ms, CPU usage reaches 100 million ms, giving $1.40 CPU overage and a $6.40 Workers total. These examples exclude separately metered products. USD pricing excludes applicable tax, exchange-rate conversion and card fees. A $10 monthly planning envelope is reasonable initially, but is not an enforceable account billing cap.

## Locker map design

The existing optional iframe shows a single selected locker. It is not the requested experience. The revised design should show a location input with Search; a searched-area marker; nearby selectable locker pins; clustering when zoomed out; and an accessible list ordered by approximate straight-line distance. Selecting a pin opens name, address/hours and Use this locker. That fills the existing verified locker ID and order summary. Moving the map offers Search this area. Keep manual fallback and never request device location automatically.

A proper map renderer and location-to-coordinate service are required. Cloudflare hosting does not include a map tile or geocoding subscription. A practical candidate is Geoapify's commercial-use Free plan with attribution: 3,000 credits/day, up to five requests/second, no card required. Map tiles and searches share the credit pool, so credits are not map views. Validate South African coverage, caching/privacy terms and actual credits per visit before selecting it. No account has been created. [Geoapify pricing](https://www.geoapify.com/pricing/), [credit accounting](https://www.geoapify.com/pricing-details/)

Public Nominatim is a constrained alternative, not a default unlimited search backend: at most one request/second across the whole app, no autocomplete, attribution/caching requirements, switchability and no confidential/personal data. Public OSM tiles are also best effort. A commercial-use provider with explicit quotas is a clearer launch choice. [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)

## Courier fees and remaining confirmation

The existing dedicated TCG Locker credential works with GET https://api-pudo.co.za/api/v1/lockers-data and remains server-side. The public production API reference was inspected again on 19 October, including its locker section. It does not publish a numeric rate limit or a fee schedule for directory access. The account billing view showed R0 balance and no visible API plan pricing. These observations do not establish free or unlimited entitlement. [Production API reference](https://api-pudo.co.za/)

The courier also publishes a different Shiplogic pickup-points API supporting radius, bounding-box and name searches. It may reduce payload work, but the existing TCG Locker key must not be assumed valid for it. [Courier locker API guide](https://thecourierguy.co.za/wp-content/uploads/2025/08/The-Courier-Guy-Locker-API-docs.pdf)

Before public launch obtain confirmation of: any setup/monthly/per-call charge for this account and endpoint; calls per second/minute/day and handling of 429 responses; permission to display/cache location data and the required freshness; whether a smaller nearby/bounds endpoint is available to this account; and any attribution or usage obligations. Support has not been contacted. Actual shipment charges are separate. Selecting a locker does not book, reserve, quote or pay for delivery.

## Email and optional products

Resend remains a separate limit: its public Free plan is 3,000 emails/month and 100/day. A higher Cloudflare plan does not increase that. The application also reserves form/email capacity, currently 80 weighted units/day and 2,400/month, with orders reserving two units. Review these together with manual updates before promising more daily orders. [Resend pricing](https://resend.com/pricing)

Workers Paid offers native Cloudflare Email Service access. Treat a future migration as a separate evaluation of current pricing, delivery, bounce handling, idempotency and templates, not an automatic switch during this upgrade. Preserve manual Preview update/Send update. [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)

No present workload justifies adding AI, vector databases, Containers, Stream, Argo or load balancing simply because a paid plan makes them available. Consider queues only for a measured asynchronous reliability need. Public marketing-image optimisation can be evaluated separately; never transform private print masters or bypass their authentication.

## Approval and verification boundary

The owner has authorised the review and revised map goal, but has not selected Workers Paid, a paid map provider or an overage budget. All proposed changes above remain unapplied. Site password gate, separate admin sign-in and customer payments-off remain required. After a plan decision: verify billing state, deploy scoped capacity/map changes, test cold and warm paths plus mobile/keyboard/fallback selection, and update the board with actual measurements. Do not close the existing D1 stability or courier-terms checks merely because a subscription changed.
