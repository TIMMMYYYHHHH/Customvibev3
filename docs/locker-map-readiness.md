# Locker map readiness

17 October 2026. Owner requested the site map and visuals while the courier account/API are pending.

## Current position, 18 October 2026

The owner has completed courier account setup and authorised a dedicated CustomVibe API key, Cloudflare secret storage and live locker selection. The TCG Locker portal was inspected while signed in and its API Keys list was empty. Local integration is now implemented, with tests and visual checks recorded in [locker-integration.md](locker-integration.md). The dedicated CustomVibe key is now created and stored as an encrypted production-only Cloudflare secret. Authenticated production access returned 2,138 valid online lockers. Deployment/live checkout and free-tier CPU verification are pending. Provider API fees and refresh quotas were not stated in the reviewed portal/docs; no paid service was accepted. This replaces the account-registration dependency below.

## Published scope as of 17 October

Checkout uses a shared LockerPicker component with a direct link to the official The Courier Guy locker finder, an optional OpenStreetMap area map, required manual locker name/town fields and a preference summary. No locker locations, availability or shipping prices are invented. Manual entry does not create a map pin. This saves the same name/area preference as before; it does not reserve a locker or book delivery.

The map is loaded only after Show area map. It uses the existing allowed OpenStreetMap iframe origin and visible provider attribution. It does not request device location or send contact/order/artwork details. The external finder and manual fields remain usable without loading the map. Hide map removes the iframe. The privacy notice explains the optional provider request.

The local-only fixture at `tests/fixtures/locker-picker.html` exercises future town/name/code search, accessible result selection, a selected-location pin and manual fallback. Every location is labelled Sample and the page clearly states that the locations are fictional. The fixture is not a production build entry and has no order submission or sending actions. The production checkout passes no dataset and therefore exposes no sample search or pins.

## Original implementation plan, 17 October (historical)

- Tim completes the official courier account registration, tracked under Required business information in Founders Hub.
- Confirm the authorised live locker endpoint, permitted display/use, current-data refresh approach and free-tier limits. Do not scrape the public locator or reuse its client credentials.
- Add the server-side data adapter and protect any API credentials. Validate data and support unavailable/stale results with the existing manual fallback.
- Extend order validation/persistence for a verified locker ID, preserve readable name/area, and verify actual search/selection on desktop and mobile.
- Booking, shipping quotes and payments remain separate work and are not enabled here.

The full map parent remains incomplete while these required steps are open.

## Sources

- Official locker finder: https://locations.thecourierguy.co.za/
- Courier locker service: https://thecourierguy.co.za/locker-courier-services/
- Official account registration: https://customer.tcglocker.co.za/register
- API documentation: https://api-docs.tcglocker.co.za/
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/

The public courier locator cannot be relied on as a cross-site iframe, so the current site opens it as a direct link. The OpenStreetMap area map is geography only and is not a courier dataset.

## Verification

- 167 automated tests passed, including coordinates/URL safety and multiword locker search.
- Public build, SSR/prerender (21 pages) and admin build passed.
- Local checkout inspected at 320, 393, 768 and 1440 pixels with no horizontal page overflow; real map loaded at phone and desktop widths, with attribution visible.
- Manual fields updated both the preference panel and basket summary. Map show/hide works without changing the preference.
- Local future preview: town search, keyboard selection, pin/field updates, zero-results fallback, and manual edit clearing the selected ID/pin verified. No horizontal overflow at 320 or 393 pixels.
- No email, new order, order-stage change or courier booking used for verification.

Live publication and final deployed checks are recorded in Founders Hub activity after deployment.

### Published verification

Application commit `8f2b27e` published through [protected workflow 38983715542](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38983715542). Public/admin builds, 167 tests, business destination checks and post-publication protection checks passed. No admin Worker was deployed.

The signed-in live storefront loaded the matching `main-TnKJPSf0.js` bundle. At 393 px, checkout initially contained no map iframe; Show area map then loaded real OpenStreetMap geography with visible attribution. Manual locker entry updated both the new preference panel and existing basket summary. No sample search or pins appeared. The public brand icon was used only in an unsent browser draft, and a final reload cleared that draft to an empty basket. No contact details, order, email, stage change or courier booking was submitted.
