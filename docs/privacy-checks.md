# Cookie and privacy checks

17 October 2026. Scope: existing cookies, browser storage, optional map controls and factual service disclosures. Business/legal approval remains in Required business information. No emails, orders, production-record changes or provider settings changes are part of this work.

## Inventory

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

W3Forms is not Web3Forms. Its policy currently retains submissions while the account is active unless deleted; backups roll off within 30 days after source deletion and technical logs within 90 days. Resend email/log retention is 30 days. Delivered mailbox copies require a separate deletion process. These periods do not extend the application’s 14-day artwork/order retention.

## Verification

- Local public build, SSR/prerender of 21 routes and admin build passed.
- 167 automated tests passed, including existing authentication, CSRF, form validation and retention checks.
- Local map iframe counts: 0 before Show, 1 after Show, 0 after Hide. Provider attribution remained visible when loaded. Manual fields remained available. No form submitted.
- Local privacy anchors resolve, move below the fixed header and have no horizontal overflow at 1280px and 390px. Provider links verified against their published policy pages.
- Publication and live verification recorded below after deployment.

## Remaining launch requirements

The privacy notice still has explicit business-information placeholders. The responsible legal entity, Information Officer/PAIA details, lawful grounds, operator arrangements, hosting-log retention, contact/mailbox schedules and overseas-processing safeguards require owner confirmation before public launch. Existing launch and business-approval tasks remain open. This technical review is not approval to launch or enable payments. Blocked availability, email-phone and courier-account work remains on hold.
