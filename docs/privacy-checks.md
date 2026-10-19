# Cookie and privacy checks

17 October 2026. Scope: existing cookies, browser storage, optional map controls and factual service disclosures. Business/legal approval remains in Required business information. No emails, orders, production-record changes or provider settings changes are part of this work.

## Current implementation note, 19 October 2026

The 17 October inventory, provider-policy observations, test counts and live checks below are historical evidence, not fresh verification of the current implementation.

- The optional locker map now uses `src/LockerPicker.jsx`, `src/NearbyLockerMap.jsx` and `server/map-api.mjs`. See [the capacity and searchable-map rollout](paid-capacity-rollout.md). The old `DeliveryMap` iframe component had no runtime callers and was removed during the audit fixes. Its Show/Hide iframe counts below describe the earlier implementation only.
- Artwork, associated artwork request records and proof review access expire 14 days after the original upload. Reduced order details, including whole-order notes, are retained for six calendar months from submission or delivered/collected completion when Fulfilled. Reopening keeps the established order-detail expiry until fulfilled again and never restarts artwork expiry. This supersedes the combined “14-day artwork/order” wording below. See [current operating policy](operating-mode.md).
- Current contact-delivery evidence remains tracked separately under EXT-01. Remaining privacy schedules and disclosures remain under DEC-02 and the existing launch requirements. This annotation does not establish a fresh provider retention or live mail check.

20 October 2026: Public mailbox wording distinguishes the hello Google Workspace mailbox from the retained legacy W3Forms notification account. This corrects the technical route description only; it does not verify current contact forwarding or Reply-To, approve unresolved mailbox/contact/log periods, or complete the privacy notice for public launch. EXT-01 and DEC-02 remain separate.

## Historical inventory, 17 October 2026

| Item | Purpose and lifetime | Evidence |
| --- | --- | --- |
| `__Host-cv-site` | Essential website session, 8 hours | `server/auth.mjs` |
| `__Host-cv-admin` | Separate admin session, 30 minutes | `server/auth.mjs` |
| `__Host-cv-site-csrf`, `__Host-cv-admin-csrf` | Login protection, 15 minutes | `server/auth.mjs` |
| `__Host-cv-form` | Form session and CSRF, up to 1 hour, reused without extension | `server/submissions.mjs` |
| Admin catalogue draft | Tab session storage, removed on save/discard/sign-out | `src/content/Admin.jsx`, `admin/main.jsx` |
| Customer photos and shopping drafts | Browser memory only | Storefront state and photo code |
| Turnstile | Automatic form security, interaction-only UI | `src/FormService.jsx`; existing service record says pre-clearance off |
| OpenStreetMap iframe | Absent until Show area map; Hide map removes it | `src/DeliveryMap.jsx` |
| Cloudflare Web Analytics | Hosting-injected script present in the live privacy-page DOM | `static.cloudflareinsights.com/beacon.min.js` with public beacon configuration; no secret values recorded |

Application cookies are host-only, Secure, HttpOnly and SameSite=Lax. No customer localStorage, advertising pixel or advertising cookie configuration was found in application code. Hosting-injected Cloudflare measurement is separately disclosed; absence from application source is not proof of absence on the deployed site. Script presence is not evidence that every metric was delivered. Dashboard collection totals, provider-log retention and legal bases are not certified by this review. The application CSP was not broadened to enable analytics.

## Changes

- Privacy page lists cookie purposes, lifetimes, clearing/blocking consequences and browser draft storage.
- Turnstile disclosure explains automatic checks even when the challenge box is hidden.
- Map cover explains connection data shared before loading; Map privacy opens the relevant policy section in a new tab without losing checkout work.
- Optional-map notice explains manual entry, Show/Hide controls, external links and the limits of hiding a previously loaded map.
- Privacy topic navigation, footer cookie link, provider policies and privacy/security email links are clickable and use stable section anchors.
- Cloudflare cookie-free website measurement is disclosed separately from security and advertising.
- Founders Hub W3Forms retention note reconciled with its provider policy. Prior 30-day submission claim is unverified; any account override and contact/mailbox deletion schedule remain with owner privacy approval. The superseded seven-day wording in that task was corrected to the approved 14-day artwork/order rule.

## Provider references checked

- https://www.cloudflare.com/turnstile-privacy-policy/
- https://www.cloudflare.com/web-analytics/
- https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/
- https://osmfoundation.org/wiki/Privacy_Policy
- https://w3forms.com/privacy
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/legal/privacy-policy
- https://policies.google.com/privacy

W3Forms is not Web3Forms. Its policy, as checked on 17 October, retains submissions while the account is active unless deleted; backups roll off within 30 days after source deletion and technical logs within 90 days. Resend email/log retention is 30 days. Delivered mailbox copies require a separate deletion process. These periods do not extend the application’s 14-day artwork/order retention.

## Historical verification, 17 October 2026

- Local public build, SSR/prerender of 21 routes and admin build passed.
- 167 automated tests passed, including existing authentication, CSRF, form validation and retention checks.
- Local map iframe counts: 0 before Show, 1 after Show, 0 after Hide. Provider attribution remained visible when loaded. Manual fields remained available. No form submitted.
- Local privacy anchors resolve, move below the fixed header and have no horizontal overflow at 1280px and 390px. Provider links verified against their published policy pages.
- Published application `1838279` through protected business Pages run [38986605402](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38986605402). Public/admin builds, all 167 tests and before/after protection checks passed. Admin Worker publication was not requested.
- Signed-in live `/privacy` serves the new bundle `main-C_zcMUo0.js`. Topic anchors, provider/privacy email links, cookie lifetimes, automatic verification and map/measurement disclosures verified in the live DOM. Cookie section scrolls below the fixed header; no horizontal overflow at the live 600px view. Screenshot: `/tmp/customvibe-privacy-live.png` (local review evidence).
- W3Forms service correction and owner privacy task saved in Founders Hub. Existing launch parent remains open; no real order or email was sent.

## Remaining launch requirements

The privacy notice still has explicit business-information placeholders. The responsible legal entity, Information Officer/PAIA details, lawful grounds, operator arrangements, hosting-log retention, contact/mailbox schedules and overseas-processing safeguards require owner confirmation before public launch. Existing launch and business-approval tasks remain open. This technical review is not approval to launch or enable payments. Blocked availability, email-phone and courier-account work remains on hold.
