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

## Owner colour reference and studio consistency, 19 October 2026

The supplied CustomVibe screenshot has an embedded Display colour profile. Its dominant lettering converts to sRGB #C02258 (raw unconverted pixels are #B03359). Brand lettering now uses that web colour across shared storefront wordmarks, the homepage slogan, the footer slogan, coming-soon branding and login, admin branding/sign-in, and email header/signoff. The icon, ordinary prose, button palette and artwork stay unchanged. Email dark mode uses #ED8EAF to retain readable live text; this is a browser palette preview, not a claim about actual Gmail phone rendering.

All three studio routes use the same 1400px/94% container, 92% at phone widths, matching heading typography, and a 28px navigation-to-heading gap (24px at widths up to 600px). Handy and Business no longer inherit the generic section top padding. Local browser checks covered all three routes on desktop and at 390px without horizontal overflow. Client/admin/SSR builds, prerender and all 319 tests passed. Changes do not send emails or alter customer records. Publication and live verification are recorded in Founders Hub.

Publication result: implementation `4ef5879` reached the protected storefront in workflow [39227339862](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39227339862). Both attempts passed site publication and post-publication protection checks, but failed before admin deployment when the existing credential could not complete the Cloudflare admin-settings request. The prior local deployment helper socket was unavailable. Signed-in Chrome visually confirmed the updated Handy and Business layouts and berry header wordmark. Admin branding/sign-in, embedded admin previews and manual status-email template publication remain pending restoration of the existing deployment connection. Site-generated order acknowledgement templates are included in the published storefront; no real emails were sent during verification. The colour task stays open while the spacing task is complete.


### Admin publication completed, 19 October 2026

After Tim restored the scoped local deployment connection, the admin destination guard passed, a fresh admin build passed, and all 319 tests passed. Admin version `59eebb6e-83bc-435c-8dff-8b31f0ab2ba0` was deployed to `admin.customvibe.co.za`, including nine changed assets. Before/after binding and compatibility comparisons were identical. This publishes the admin branding, embedded preview and manual status-email templates and supersedes the publication blocker above.

The live admin sign-in CustomVibe lettering was verified through computed browser styling as `rgb(192, 34, 88)` (#C02258). Authenticated workroom visual inspection remains outstanding because native Chrome capture failed. Local visual/build/test verification and successful publication do not substitute for that final signed-in visual check. No real email was sent and no customer record was changed. Password gating, separate admin authentication and disabled payments remain in place. Founders Hub records publication as complete with the final authenticated visual check outstanding.

## Approved purple-and-orange wordmark, 19 October 2026

Tim selected the final generated wordmark and supplied the exact reference, then explicitly approved applying it across the website, admin and emails. This supersedes the earlier berry-lettering decision. The approved design has chunky rounded purple letters and an orange rounded-square i dot. The original icon/favicons and action palette remain unchanged.

The transparent image-tool derivative is delivered at 1200 x 200 as `/coming-soon/wordmark-v1.png`. The shared React wordmark supplies meaningful alternative text and intrinsic dimensions. Storefront header/footer, homepage/footer slogans, coming-soon/login, admin workroom and admin/proof sign-in now use the artwork. Old square-icon sizing selectors explicitly exclude the wordmark, including the seasonal header. Only the named static graphic is added to the existing pre-authentication presentation allowlists.

Email header/signoff embed a 720px rendition of the exact lavender-backed owner reference via CID, keeping the purple design readable against dark backgrounds. This supersedes the live-text-only wordmark rule, while message headings, order details, signoff sentence and plain-text email content remain live text. Images include CustomVibe alternative text. No remote image dependency or sending behaviour change is introduced.

Verification: 320 tests passed, including the new embedded-wordmark regression check. Storefront, SSR/prerender and admin builds passed. Browser review covered desktop and 390px storefront/coming-soon, with image sizing corrected after finding legacy square-icon rules. Local email dark-palette review confirms contrast; actual Gmail phone rendering is not claimed. No real email was sent and no production customer records were changed. Publication evidence follows in Founders Hub.
