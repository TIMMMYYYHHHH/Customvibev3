# Email and unpaid request setup

Keep the site password gate ON. Production sending is approved for controlled owner testing; preview and local sending stay OFF. All Cloudflare and email services stay on free plans. Never paste API keys, passwords, cookies or secret values into chat.

The migration destination is Cloudflare account `4f57d4e924674cb87b33d4c884745cf6`, owned by customvibe03@gmail.com, and Pages project `customvibe-business`. The installers verify that account and resource before asking for credentials and again before writing. They refuse the personal account and never use a default Wrangler login. Both production and preview must retain the gate and `fail_open=false`. Only production may enable submissions, and only behind the gate.

## Current decisions

- Send unpaid order requests with cropped artwork to customvibe03@gmail.com.
- Send customers an acknowledgement, explicitly saying no payment was taken and the request is not yet accepted.
- Online payments: coming soon. No card form, payment link or implied paid status.
- Handmade magnets, intended delivery by PUDO lockers. Locker names entered by customers are preferences, not verified bookings.
- Contact through the website form to the same Gmail inbox.
- No customer photo storage in the site, D1, KV or R2. Email providers and Gmail necessarily process and retain attachments.
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

## 5. Test behind the gate

The owner explicitly approved gated testing on 15 October 2026. `wrangler.jsonc` keeps local defaults and preview sending disabled and explicitly enables production sending. Publishing verifies both environments before deployment, requires production provider credentials, and checks the actual production deployment and commit afterward. Credential maintenance follows the same gate, fail-closed and preview protections. Runtime form readiness also requires `SITE_GATE_ENABLED=true`.

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
