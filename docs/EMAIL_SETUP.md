# Email and unpaid request setup

Keep the site password gate ON. The live site uses normal production behaviour with payments disabled; preview and local sending stay OFF. See [operating-mode.md](operating-mode.md) for the latest policy. All Cloudflare and email services stay on free plans. Never paste API keys, passwords, cookies or secret values into chat.

The migration destination is Cloudflare account `4f57d4e924674cb87b33d4c884745cf6`, owned by customvibe03@gmail.com, and Pages project `customvibe-business`. The installers verify that account and resource before asking for credentials and again before writing. They refuse the personal account and never use a default Wrangler login. Both production and preview must retain the gate and `fail_open=false`. Only production enables submissions. The gate stays on until separately approved for public launch, but runtime sending does not depend on the gate flag.

## Current decisions

Status updates remain manual through Preview update and Send update in order details. No owner-recipient allowlist is used. Saving a stage does not send an email. The historical seven-day setup notes below are superseded by the 14-day policy in operating-mode.md.

- Send unpaid order requests with cropped artwork to customvibe03@gmail.com.
- Send customers an acknowledgement, explicitly saying no payment was taken and the request is not yet accepted.
- Online payments: coming soon. No card form, payment link or implied paid status.
- Handmade magnets, intended delivery by PUDO lockers. Locker names entered by customers are preferences, not verified bookings.
- Contact through the website form to the same Gmail inbox.
- Live artwork uses private R2 downloads and associated private D1 request records. Current retention is 14 days. Original photos and unsent drafts remain in browser memory. Email providers and Gmail retain their email copies.
- Business details, complete policies, delivery charges and timelines remain owner to-dos before launch. Bing is intentionally skipped. Google ownership is verified in Search Console; indexing is still blocked by the gate. Google Business Profile is not applicable because the owner confirmed online orders and courier delivery only.

## 1. Separate free Resend account

The old connected account is full at three domains. The separate CustomVibe account is signed in as customvibe03@gmail.com, and customvibe.co.za is now verified for sending. Do not use the old Resend connector to change this account. Do not remove unrelated domains or upgrade a plan.

1. In the new account, add `customvibe.co.za` as a sending domain. Use the Europe region if available. Keep receiving disabled, because Cloudflare will handle inbound forwarding. Keep open and click tracking disabled.
2. Add the exact DNS records Resend supplies in Cloudflare. DKIM is a TXT record. This account uses the Resend-managed CNAME records `send` and `rsend`, both DNS-only, plus a DKIM TXT record at `resend._domainkey`. A monitoring DMARC TXT record is present at `_dmarc`. Do not overwrite root MX or create a second SPF record at an existing name. Copy provider values exactly.
3. Verify the domain in Resend. Use `orders@customvibe.co.za` as the sender. Replies go to customvibe03@gmail.com until aliases are verified.
4. Create a sending-only API key restricted to this domain. Keep it in your password manager. Do not send it in chat.
5. From the migration checkout, with the temporary credential helper still running, run the local hidden-input installer:

```sh
export CLOUDFLARE_ACCOUNT_ID=4f57d4e924674cb87b33d4c884745cf6
export CUSTOMVIBE_MIGRATION_SOCKET=/private/tmp/customvibe-migration-01a13fb6.sock
CV_NODE=/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$CV_NODE" scripts/set-email.mjs email
```

Paste the key only into the hidden terminal prompt. It is sent to the destination Pages project as `RESEND_API_KEY` in both environments, with no plaintext file or terminal output. For later maintenance without the temporary helper, an explicitly supplied destination `CLOUDFLARE_API_TOKEN` is required. Enter it through a secure hidden prompt, never as a literal command or project file.

The owner approved Enforced TLS only if available on the dedicated account's free plan. Confirm that setting before real photo delivery. Do not upgrade or enable paid overages.

## 2. W3Forms contact form

The owner selected **w3forms.com**, a different service from web3forms.com. W3Forms is for text enquiries only. Photos and unpaid requests use Resend. Google sign-in currently fails in the interactive browser, so the owner can complete sign-in in normal Chrome.

1. Sign in with customvibe03@gmail.com and create a form named CustomVibe Contact on the free plan.
2. Set notify email to customvibe03@gmail.com, Reply-To to `{{email}}`, allowed domain to `customvibe.co.za`, and leave CC, auto-response and webhooks off. Keep file uploads off. The site verifies Cloudflare Turnstile server-side; do not enable a second provider CAPTCHA without integrating it.
3. Keep the access key private. W3Forms shows it only when created. Save it in a password manager, then run `"$CV_NODE" scripts/set-email.mjs w3forms` and paste into its hidden prompt. It installs `W3FORMS_ACCESS_KEY` in Pages without displaying or writing the value.
4. Confirm a labelled test appears in the W3Forms dashboard and owner inbox, and that Reply reaches the submitted test email. Provider acceptance alone does not prove inbox delivery.

W3Forms stores contact messages until deleted. Decide a deletion schedule before launch. It documents only short-window duplicate suppression, so our server claims each message once before dispatch. An uncertain result is held for a manual dashboard/inbox check rather than automatically resent. No message text or customer details are stored in our D1 retry records.

## 3. Free Turnstile widget

1. In the business Cloudflare account customvibe03@gmail.com, open Turnstile > Add widget. The source account's widget does not transfer.
2. Name: CustomVibe public forms. Hostname: `customvibe.co.za`. Use Managed mode. No pre-clearance is required. Do not add an unrestricted hostname or use test keys in production.
3. Run `"$CV_NODE" scripts/set-email.mjs turnstile` from the same terminal. Enter the site key and secret key at their hidden prompts.
4. In Workers & Pages > customvibe-business > Deployments, redeploy the approved migration version after the installers finish. Keep `SITE_GATE_ENABLED=true` and `SUBMISSIONS_ENABLED=false`. Do not enable automatic builds until the destination branch and bindings are verified.

The code checks Turnstile on the server, including the hostname and contact/order action. Until the provider keys and bindings are ready, forms remain unavailable instead of claiming success.

## 4. Incoming email aliases

Source configuration verified on 15 October 2026: free Cloudflare Email Routing is active for `privacy@customvibe.co.za`, `security@customvibe.co.za` and `orders@customvibe.co.za`, all forwarding to customvibe03@gmail.com. The owner verified the Gmail destination and all three rules show Active. Catch-all is disabled. These must be recreated and verified in the destination account during cutover; DNS export alone does not transfer forwarding rules. Inbox delivery tests remain outstanding. Once aliases work, the public privacy/security contact can switch from the current confirmed Gmail to the aliases.

## 5. Production behaviour behind the gate

The owner explicitly approved gated testing on 15 October 2026. `wrangler.jsonc` keeps local defaults and preview sending disabled and explicitly enables production sending. Publishing verifies both environments before deployment, requires production provider credentials, and checks the actual production deployment and commit afterward. Credential maintenance follows the same gate, fail-closed and preview protections. Runtime form readiness follows sending configuration and credentials independently of the site gate.

Keep the successful gated test mode available for the owner. No public launch, payments, real courier booking, paid resources or unrelated customer recipients are authorized. Use customvibe03@gmail.com for test contact details and acknowledgements and non-personal artwork. Measure maximum-size requests before considering normal submissions ready. Actual inbox delivery, provider dashboard delivery and free-runtime measurements remain pending.

To disable production sending, set `env.production.vars.SUBMISSIONS_ENABLED` to `false`, commit and publish through the same workflow. Leave the gate on and preview off. A dashboard flag change alone does not prove an existing deployment changed. Verify the deployed snapshot after publishing. Preserve all migration rollback resources.

- Contact form: send a clearly labelled test to the owner inbox. Confirm actual delivery and Reply reaches the entered customer address.
- Unpaid order: use a non-personal sample photo, one crop, and a 3 x 3 puzzle. Confirm owner email has the correct quantity, catalogue subtotal, phone and preferred PUDO locker. Check all 1200 px pieces and proof match the browser design.
- Confirm customer acknowledgement arrives and says no payment was taken and no order was accepted.
- Check spam folders. Provider acceptance does not prove inbox delivery.
- Try interrupted/retried sending. The same reference must not create a second owner email.
- Check Turnstile failures, missing consent, large artwork and session expiry preserve a useful error without exposing internals.
- Check the site gate remains enabled, admin remains separate, robots disallows all and Pages fail_open stays false.

No email to a real customer should be used as a test without their permission. The code does not store photos for background retry. An uncertain order failure must be retried in the same browser tab within 23 hours of its creation, using the same reference. An uncertain contact dispatch requires a W3Forms dashboard/inbox check; do not send a replacement until its outcome is established. New drafts must begin sending within one hour. After the retry window, contact CustomVibe with the reference instead of creating a duplicate.

## Limits and retention

Artwork per request is capped at about 1.5 MB raw / 2 MB Base64, 60 attachments and 100 magnets. Large collections must be split before submission. The owner receives chosen crops and puzzle pieces, not the original uncropped uploads or EXIF metadata. Acknowledge low-resolution source images before production; export resolution does not add source detail.

The app permits five new submissions per IP per 15 minutes, 80 reserved email messages per UTC day, and 2,400 per calendar month. Orders reserve two messages, contacts one. These conservative app limits stay below a dedicated Resend free account's 100/day and 3,000/month allowance. Reserved sends that later fail may consume slots. Requests rejected by the IP limiter do not consume the global budget. Other use of the same account also consumes its quota; do not enable paid overages.

Opaque retry records expire after 48 hours and are cleaned hourly. No photo, customer details or email body goes in those records. Resend documents 30-day email/log retention on the free plan. Gmail copies remain until deleted. Owner to-do: choose a photo deletion period and keep necessary order records separately. Do not claim photos are never processed by third parties or that email is zero-storage.

## Still blocks launch

Sending domain is verified. Resend, W3Forms and Turnstile credentials were verified present in both live environments. Still required: representative live request CPU measurements on the free Workers runtime; real inbox tests; owner business facts and policy review; PUDO costs/timing/collection rules; photo/email retention decision; mobile checks; separate explicit launch approval. Payment provider can remain pending only while the site clearly offers unpaid requests rather than paid checkout.

Sources: [W3Forms API](https://w3forms.com/docs/api), [W3Forms form settings](https://w3forms.com/docs/customization), [W3Forms privacy](https://w3forms.com/privacy), [Resend attachments](https://resend.com/docs/dashboard/emails/attachments), [Resend retention](https://resend.com/security), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Cloudflare email routing](https://developers.cloudflare.com/email-service/get-started/route-emails/).

## Contact routing and gated test evidence, 15 October 2026

- Owner confirmed the first contact form showed success and arrived in the business inbox.
- Cloudflare Email Routing now has active hello, privacy, security and orders aliases at customvibe.co.za, all forwarding to the existing verified owner inbox. Catch-all remains disabled.
- Public website text, fallback messages and security.txt use domain aliases. The owner notification recipient remains private and unchanged. Customer order acknowledgements reply to orders@customvibe.co.za.
- Owner confirmed direct mail to hello@customvibe.co.za arrived in the business Gmail inbox.
- TODO (deferred by owner): configure and test manual replies using hello@customvibe.co.za. Forwarding alone does not change Gmail's outgoing From address. Google currently states third-party Gmail Send as support ends in January 2027, so choose a sustainable free-tier reply method before launch: https://support.google.com/mail/answer/22370?hl=en. No sender setup was completed.
- Owner confirmed one live gated unpaid request (quantity 1) reached the success page and delivered the owner email with the photo attached. The first checkout used a fake customer address, so its customer delivery was not verified. The owner then refreshed and submitted a second request to a real owner-controlled address, confirmed customer acknowledgement receipt, and confirmed Reply targets orders@customvibe.co.za. The owner explicitly chose and authorised their own personal photo for this test. Do not copy the photo into project files or test fixtures.
- Passed by owner report: customer acknowledgement inbox delivery and Reply-To orders@customvibe.co.za on the second request; references match, quantity is 1 throughout, and wording confirms no payment taken and no order accepted. Owner subsequently confirmed the emailed square matches the chosen crop with nothing cut off. Do not treat provider acceptance alone as inbox delivery.
- TODO (functional bug, before launch): allow a fresh order after successful submission. Owner reports basket count remains 1 and creating more is blocked. Code evidence: successful submission sets result but leaves pending true; App derives orderLocked from pending alone and redirects designer/basket to checkout. Add an explicit start-new-request flow that clears completed basket, artwork and checkout state, preserves access to the completed reference, and retains duplicate/retry protection for genuinely pending or uncertain submissions. Verify second-order creation in the same tab and no accidental resending of the first request.
- TODO (navigation consistency): Basket and Review currently name the same destination. Choose one customer-facing name and apply it to the header, progress steps, page heading and navigation actions; review Make and Delivery labels alongside the unpaid-request flow.
- TODO: improve order email templates and include labelled previews of the selected designs in the customer email from orders@customvibe.co.za. Keep production artwork distinguishable from previews, show quantities and reference clearly, and coordinate image delivery with the artwork-size review.
- TODO: redesign checkout and request-confirmation pages to match the approved storefront. Owner flagged the confirmation page appearance during the successful test.
- TODO before launch: review artwork quality and delivery for high-resolution uploads and larger orders. Current export is 1200 x 1200 JPEG per magnet/tile at browser encoder quality 0.92; 2,000,000 base64 characters total (approximately 1.5 MB decoded) and 60 files maximum. Oversized exports are rejected, not progressively compressed to fit. Test detailed photos, large multi-design orders and 3 x 3 / 5 x 5 puzzles, with physical 7.5 cm print samples. Distinguish repeat quantity from distinct artwork files.
- TODO: decide a sustainable free-tier artwork handoff before implementing it, including print-quality requirements, source/crop resolution warnings, large-order limits, private owner access, retention/deletion and privacy policy. Any proposal to store artwork changes the current no-photo-storage design and must be reviewed explicitly. Do not silently reduce print quality to meet email limits.
- TODO: add an interactive PUDO locker map to checkout so customers can find and select a nearby locker instead of typing its name and area. Evaluate an authorised, current locker-data source and a free-tier map solution; support town/postcode search, optional customer-approved location access, an accessible list alternative, and saving the selected locker identity with the request. Verify availability/coverage and delivery rules before presenting a selection as bookable. No delivery booking is implied by an unpaid request.
- TODO: business telephone or WhatsApp, business hours and public business address. Legal identity and policy decisions remain launch blockers in the existing policy checklist.
- Keep the password gate on, production sending enabled only for gated testing, preview/local sending off, and payments unavailable. This is not a launch approval.
- Retain migration rollback resources through at least 17 October 2026 18:30:01 Africa/Johannesburg. No cleanup without separate approval. The existing reminder remains in the migration chat.

## Founders Hub checklist, 15 October 2026

Maintain [Custom Vibe in Founders Hub](https://foundershub.kznwebstudio.co.za/?project=b9ac1199-2497-4d7d-b8a1-227ecb2fd133&view=Board) through the signed-in frontend as the ongoing project reference, not a handover plan. Owner authorises updates to Custom Vibe tasks, subtasks, areas, milestones and Tools & services only when there is meaningful progress in plans, setup or verification, not every troubleshooting step. Check existing records first. Use Website & checkout, Artwork & email, Cloudflare, Business & delivery, Marketing & visibility or Upkeep; Later ideas holds optional experiments. Keep parent and subtask areas consistent. On 15 October the owner explicitly authorised reviewing, consolidating and renaming the former Timothy area, superseding the earlier restriction for that cleanup. Keep notes short, mark complete only when verified, flag unknowns and never store secrets. Ask before expanding scope further.

- Owner reorganised the initial Launch & handover work into the current areas listed above. Respect the current Hub structure.
- Added seven concise tasks: restart after checkout; Basket / Review naming; checkout and confirmation design; PUDO map; print quality for larger orders; order emails with design previews; replies from hello.
- Print quality has three subtasks: free private delivery method, crop-resolution warnings and order limits, and physical print/puzzle/many-design tests.
- Reused the five existing milestones, linking artwork, email and restart work to gated testing and the remaining website work to launch review. No new dates or launch approval.
- Recorded confirmed contact, hello forwarding, owner attachment, customer acknowledgement and orders Reply-To results in the existing gated testing task. Broader verification tasks remain open where checks are outstanding.
- Owner verified matching references, quantity 1, explicit no-payment/not-yet-accepted wording and matching square crop with nothing cut off. Updated the parent testing task and marked its artwork/acknowledgement subtask Done in Artwork & email. This verifies one magnet, not puzzles or larger orders.
- Updated the existing website-check subtask to **Fix mobile layout and verify all pages**, preserving its Website & checkout area and launch-check parent. Specific affected screens still need review. Added **Fix homepage line artwork** in Website & checkout; intended appearance needs confirmation before implementation.
- Added **Shorten customer request references** in Website & checkout (task `b80c0122-84a0-480b-9af3-4d39f0380e6d`, Planned), linked to website launch review. Use a short readable reference on confirmation and both emails while preserving unique lookup, duplicate protection and support for existing requests.
- **Record Google verification video** is in Marketing & visibility (task `769cb6cd-b2e9-4b7b-9722-caebf508b605`, Planned). Record magnet-making and follow Google's current prompts for location, equipment and proof of management; owner submits and checks the result. Business Profile eligibility remains unconfirmed because earlier online-only guidance conflicts with the offered video flow. Older Google setup records are preserved in the archive.

### Owner-authorised area cleanup, 15 October 2026

- Renamed Timothy to **Later ideas**, retaining one optional **Review free marketing tools** task. No paid plans or ad spend approved.
- Moved and clarified website brand work under Website & checkout and WhatsApp setup under Business & delivery. Retained website subtasks have matching areas; the original completed magnet-photo record remains Done.
- Merged business/policy specifics, cookie/admin checks and recurring renewal/security/search work into the existing checklist. Archived seven duplicate parent groups and two duplicate subtasks with history preserved. Active work reduced from 26 tasks and 44 subtasks to 19 tasks and 23 subtasks.
- Linked retained brand work to the website milestone and WhatsApp to business readiness. Updated the project-guide and Search Console service notes. No new completion claims, launch dates, deployments or migration cleanup.

### Failed checks confirmed by owner, 15 October 2026

- Contact notification Reply targets `noreply@w3forms.com`, not the submitted customer email. Existing subtask is now **Fix contact Reply-To and verify email aliases**. Source sends the validated `email` field; W3Forms documents dashboard Reply-To `{{email}}`. The actual saved provider setting is unverified, so inspect it before changing code. Fresh inbox retest required. W3Forms service notes now distinguish intended setup from failed live evidence.
- A 3x3 puzzle shows “These designs are too large for one email.” Source traces this to `prepareOrderItems`, before `useFormService` sends the order request. A 3x3 export has nine 1200px tiles plus proof. Limits are 1,400,000 base64 characters per file and 2,000,000 combined. This is a site-side limit, not evidence of a Resend rejection.
- Local reproduction on 15 Oct using `tests/fixtures/artwork-size-check.html`: the public coast sample produces approximately 0.368 MB for one photo (accepted), 2.169 MB for 3x3 (rejected), and 4.406 MB for 5x5 (rejected). Both sample puzzles exceed the combined limit, not the per-file limit. A generated high-detail stress pattern also exceeds the per-file limit for puzzles. Sizes are decoded estimates from canvas exports before metadata stripping. No personal photos, live emails or production changes were used. Free Worker CPU performance is still unverified.
- Tim selected private admin downloads for artwork on 15 Oct and approved deletion 7 days after submission for gated testing. Production retention remains TODO. Confirm a free-tier implementation and owner-only access before enabling uploads. R2 Standard includes 10 GB-month of storage, 1 million Class A operations and 10 million Class B operations free each month. Subscription activation is not a paid-plan upgrade; usage above the allowances is billable, so design usage controls. The migrated account's dashboard currently shows R2 activation is pending. Reference: https://developers.cloudflare.com/r2/get-started/ and https://developers.cloudflare.com/r2/pricing/. Existing no-photo-storage behavior remains in place until the replacement is implemented and approved for gated deployment.
- Updated **Protect print quality for larger orders** and marked its physical-print/puzzle/many-design test subtask Blocked with the artwork-delivery dependency. Single-magnet verification remains Done. Preserve print quality and agree the free private delivery approach before changing architecture.
- Reconciled existing W3Forms, Resend, forwarding, Gmail and Turnstile service notes with verified progress. Gate remains on, preview sending off and payments unavailable. W3Forms dynamic Reply-To remains unresolved and its Hub task is Deferred. Current work is private artwork delivery for puzzles and larger requests.

## Private artwork implementation, 15 October

- Approved: private admin downloads and seven-day test retention. Created `customvibe-test-artwork` in the migrated business account using Standard storage. Public development URL and custom domains remain disabled. Whole-bucket lifecycle `delete-test-artwork-after-7-days` is enabled. No artwork uploaded yet.
- Implemented locally: separate bounded JPEG uploads, verified immutable manifests, Turnstile/CSRF/session grants, tab-memory recovery tokens, protected admin request lookup/downloads, attachment-free owner request links and expiry cleanup. Original photos and customer contact fields are not stored in R2/D1.
- Limits: 4 MB/file, 32 MB/request, 60 files and 100 magnets; 500 MB retained, 100 MB uploaded/day, 500 MB/month, 20 requests/day, 400/month and 10,000 R2 operations/month. These application limits do not govern unrelated account usage.
- Verification: 100 automated tests pass; public and admin builds pass. Browser exports pass for 3x3 and 5x5 public coast and generated stress samples, up to 18.18 MB with unchanged JPEG quality. Independent review corrections cover invalid details, session renewal and late upload expiry. Physical print quality and live Worker CPU remain unverified.
- Deployment pending. `ARTWORK_STORAGE_ENABLED=false` in every local Pages environment until backend migration/bindings are deployed and checked. Site gate stays on, preview sending off, payments unavailable. Existing live attachment flow remains unchanged.
- Temporary migration helper is no longer running. `scripts/artwork-access.py` is a destination-only hidden-token helper for approved Worker deployment and D1 migration. It does not use personal-account Wrangler credentials or print/save the token. Owner must supply access privately in Terminal.
- Deploy database migration 0004, security Worker with private bucket binding, then admin Worker. Verify protected endpoints before enabling private storage in production and publishing Pages. Retest one gated 3x3 request, owner admin link, ten downloaded files, customer acknowledgement and expiry. Keep all rollback resources.

Deployment update: approved destination token verified privately. Migration 0004, private storage binding, hourly cleanup and protected admin downloads deployed. Production-only artwork enablement is prepared for the existing GitHub Pages publishing workflow. Gate remains on, preview sending and uploads off. Fresh tests: 100/100; both builds pass. Live 3x3 inbox/download and print checks remain pending. Earlier deployment-pending entries above describe the prior state.

Verified publication: f4fa324 / Pages ed298f30-6362-4fde-89b0-64cc21e3d2e8; GitHub run 38811478814 succeeded. Production private artwork enabled, gate on, preview sending off, both environments fail closed. Admin sign-in required in live browser. Seven-day private bucket lifecycle and hourly cleanup verified. No live puzzle or owner download pass yet; no rollback resources removed.
