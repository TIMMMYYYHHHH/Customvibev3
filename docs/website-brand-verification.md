# Website brand details, 17 October 2026

## Scope and owner decision

Reviewed the existing Founders Hub parent `Finish website brand details` and its favicon, real-photo and handmade/delivery subtasks, plus current Cloudflare, GitHub, PUDO and website-directory records. Existing real magnet photographs are already complete and remain unchanged.

Tim confirmed this manufacturing description on 17 October: “Handmade in Durban. We print your chosen photos, make your magnets and check each one by hand before it leaves us.” It now appears in the existing homepage story and a Help answer. The shared footer says “Handmade in Durban.” Existing type, colours, artwork and layout are retained.

Reviewed homepage pricing, Help, checkout/confirmation and shipping wording against the PUDO record. Locker selection remains a preference, not a booking; delivery costs, availability and arrangements require confirmation. No delivery times, prices, coverage or collection deadlines were invented. Final business and delivery approvals remain separately tracked under `Approve business and delivery details`.

## Verification

- Existing CustomVibe C mark inspected. Built PNGs are 32, 180, 192 and 512 pixels square. Apple touch and manifest declarations use the existing matching assets. Explicit sizes added to the public favicon and touch-icon links.
- Live homepage already declares favicon, touch icon and manifest. Authentication remains unchanged; private storefront assets still require site access. No work on the held availability investigation.
- Public client/SSR build and 21 prerendered pages passed. All 164 automated tests passed.
- Browser visual review at 390px and 1100px: new story paragraph wraps cleanly and the existing call to action remains reachable. Local review is static and cannot send messages or create orders.
- Tim confirmed the purple C icon looks right in his phone browser/tab or saved shortcut on 17 October.
- Published application `b3d65da` through protected Pages run [38978458625](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38978458625). Public/admin builds, 164 tests, destination guard and post-publish protection checks all passed. No supporting Worker redeployment was needed.
- Signed-in live homepage story, shared footer, Help manufacturing answer and unchanged locker-preference answer verified. Live favicon loads at 32px; touch icon loads at 180px; explicit size declarations verified in the page.
- One live touch-icon request encountered the known temporary-unavailability response; a single reload succeeded. The held investigation was not resumed.

No changes to email templates, sending, records, stages, payments, authentication, retention or resource plans.
