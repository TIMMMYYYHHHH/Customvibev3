# Business studio and compact collection cards release

18 October 2026. Owner approved publishing the reviewed updates while preserving recent admin changes.

## Scope

- Nine editable business designs, with real configurable QR codes, exact print details, basket editing and private admin/download support.
- Shared home and Collections cards: F1 status tabs, compact spacing and descriptions, one primary action. Retain standalone product pages and crawlable links with normal modal clicks.
- Merge latest main c27622f before release, including current admin spacing, surfaces, seasonal controls and inactive Christmas refinements. Only admin/order-archive.mjs differs in admin source, adding business print instructions.
- Patch only five approved catalogue descriptions and business detail wording/status against latest authenticated content. Never import fallback catalogue.
- Preserve website gate, separate admin sign-in, disabled payments, manual email updates, retention and saved seasonal records. No customer submission or email in verification.

## Pre-publication checks

305 tests pass. Public, SSR, 27-page prerender and admin builds pass. Existing bundle-size warning remains. Updated outdated business inspiration-only render assertion to verify editable studio route, leaving retired QR/Wi-Fi coverage intact. Diff checks pass. Existing Cloudflare service bindings and protected Pages settings checked through the in-memory helper; no credential values saved.

## Publication

Published implementation 112e622e181e4883208088a3d7f75822ca3593a5 after rebasing onto c27622f. The first push was safely rejected when newer admin work arrived; no force push used. Preserved c329dbd date-preview cleanup and c27622f private full-screen preview. Rebuilt and republished matching admin.

Site workflow https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39133305346 succeeded. Admin version 66f26724-4e0d-4b76-b9f9-8834423d4a05; private security version e820b646-9773-4cb8-8237-ea2e9f954308; catalogue version 0aa7d797-7f99-419d-bc90-204c7acb87a5. Helper configurations restored byte-for-byte. Post-release checks confirm exact site revision, gate, fail-closed preview and unchanged private service bindings.

Authenticated live checks: 11 collection cards; five shorter descriptions persisted; business detail wording saved without replacing catalogue. Home and Collections use F1 tabs and one action. Alphabet opens modal with Watercolour selected. Business studio displays nine designs; Guest Wi-Fi supports Join Wi-Fi and Open a link with rendered editable preview. Orders retains Table/Fulfilled, unpaid states and manual Email update controls. Seasonal editor retains Full screen and current wording, with Christmas OFF/In progress and schedules off. No seasonal record changed; no customer record or email created. Screenshot: output/card-bottoms/review/live-home.png.

305 tests pass after merging latest admin changes. Physical acceptance remains separate.
 Physical 7.5 cm print readability and real-magnet QR scan checks remain separate owner acceptance. Magnet realism refinement remains deferred.
