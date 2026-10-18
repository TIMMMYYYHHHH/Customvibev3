# Business studio and compact collection cards release

18 October 2026. Owner approved publishing the reviewed updates while preserving recent admin changes.

## Scope

- Nine editable business designs, with real configurable QR codes, exact print details, basket editing and private admin/download support.
- Shared home and Collections cards: F1 status tabs, compact spacing and descriptions, one primary action. Retain standalone product pages and crawlable links with normal modal clicks.
- Merge latest main 94d0eef before release, including current admin spacing, surfaces, seasonal controls and inactive Christmas refinements. Only admin/order-archive.mjs differs in admin source, adding business print instructions.
- Patch only five approved catalogue descriptions and business detail wording/status against latest authenticated content. Never import fallback catalogue.
- Preserve website gate, separate admin sign-in, disabled payments, manual email updates, retention and saved seasonal records. No customer submission or email in verification.

## Pre-publication checks

305 tests pass. Public, SSR, 27-page prerender and admin builds pass. Existing bundle-size warning remains. Updated outdated business inspiration-only render assertion to verify editable studio route, leaving retired QR/Wi-Fi coverage intact. Diff checks pass. Existing Cloudflare service bindings and protected Pages settings checked through the in-memory helper; no credential values saved.

## Publication

Pending deployment and signed-in verification. Physical 7.5 cm print readability and real-magnet QR scan checks remain separate owner acceptance. Magnet realism refinement remains deferred.
