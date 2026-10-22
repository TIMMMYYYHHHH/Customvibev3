# PUDO locker delivery pricing, 22 October 2026

## Current owner decision

PUDO locker delivery costs R69 when the merchandise subtotal is below R1,000. It is free when the subtotal is R1,000 or more, including exactly R1,000. The subtotal is the price of the merchandise before delivery, including any separately priced catalogue products. At the approved R40 rate, 25 magnets cost R1,000 and qualify. See [quantity pricing](pricing-tiers-2026-10-22.md).

Choosing a preferred locker is not a booking, quote, payment or dispatch. Locker availability, production timing and collection arrangements may still need confirmation. The website password gate, separate admin sign-in and disabled payments stay in place. Orders remain Unpaid.

## Implementation scope

- One shared delivery calculation in `src/shipping.mjs` supplies the current basket and checkout. The basket summary shows merchandise subtotal, delivery and complete unpaid total. Unavailable items keep the final total unknown until reviewed.
- New checkout attempts explicitly disclose policy version 1 and their displayed delivery and total. Server validation independently calculates current fees and rejects stale or inconsistent disclosure. The accepted fields are saved as `deliveryCents` and `totalCents`.
- The shared public header includes a static, compact delivery banner within its existing measured height. It uses the established plum, ivory and Fredoka style and links to editable shipping policy text. Mobile wrapping and keyboard focus must be checked with the complete header.
- Initial customer and owner emails and the admin order detail display saved delivery and total. Historical records with missing fees or totals say To confirm. They are never repriced from the current policy, and no old receipts are resent.
- Customer status updates remain manual through Preview update and Send update. Stage and artwork changes never send automatically. Deferred artwork-revision controls are outside this change.

## Verification and release status

Implementation and independent application review are complete on `codex/shipping-rate-and-free-delivery`. The complete Node 22 application suite passed 840 tests, with seven Python supporting tests. Public and Admin builds and the bundled dependency-notice checks passed. The first sandboxed suite had eight localhost permission errors; the unchanged suite passed with localhost access. No production service was contacted by those runtime tests.

The local browser check covered the banner at 1440 and 375 pixels, mobile navigation and overflow, plus unsent synthetic collection baskets: 8 magnets R360 + R69 = R429; 24 R960 + R69 = R1029; 25 R1000 with free delivery; 26 R1040 with free delivery. Checkout retained the R1000/free total for 25 magnets. Local API connectivity was intentionally unavailable and no order or email was submitted.

The design detector's one warning was the existing designer navigation underline, unchanged from the released source. A file-scoped `border-accent-on-rounded` false-positive exception was recorded in `.impeccable/config.json`; no design was changed for that warning.

Release remains a separate step. Evidence is retained in the project audit directory `audit/fix-plan/shipping-20261022/`, including the independent review, build/test logs and local banner screenshots. This document does not claim live publication, courier booking, payment or physical print acceptance.
