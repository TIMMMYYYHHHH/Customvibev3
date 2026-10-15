# Email and unpaid request setup

Keep the site password gate ON. All Cloudflare and email services stay on free plans. Never paste API keys, passwords, cookies or secret values into chat.

## Current decisions

- Send unpaid order requests with cropped artwork to customvibe03@gmail.com.
- Send customers an acknowledgement, explicitly saying no payment was taken and the request is not yet accepted.
- Online payments: coming soon. No card form, payment link or implied paid status.
- Handmade magnets, intended delivery by PUDO lockers. Locker names entered by customers are preferences, not verified bookings.
- Contact through the website form to the same Gmail inbox.
- No customer photo storage in the site, D1, KV or R2. Email providers and Gmail necessarily process and retain attachments.
- Business details, complete policies, delivery charges and timelines remain owner to-dos before launch. Bing is intentionally skipped. Google ownership is owner-confirmed; check indexing after launch.

## 1. Separate free Resend account

The existing connected account is full at three domains. The owner will create a separate free account for CustomVibe. Do not remove any existing domain or upgrade a plan.

1. In the new account, add `customvibe.co.za` as a sending domain. Use the Europe region if available. Keep receiving disabled, because Cloudflare will handle inbound forwarding. Keep open and click tracking disabled.
2. Add the exact DNS records Resend supplies in Cloudflare. DKIM is a TXT record. Return-path SPF/TXT and MX normally use the `send` subdomain. Do not overwrite root MX or create a second SPF record at an existing name. Copy provider values exactly.
3. Verify the domain in Resend. Use `orders@customvibe.co.za` as the sender. Replies go to customvibe03@gmail.com until aliases are verified.
4. Create a sending-only API key restricted to this domain. Keep it in your password manager. Do not send it in chat.
5. Run the local hidden-input installer:

```sh
cd /Users/timothymorton/.codex/.chatgpt-projects/g-p-6acf844518448191a0201022d78e5e97/research/customvibev3
CV_NODE=/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$CV_NODE" scripts/set-email.mjs email
```

Paste the key only into the hidden terminal prompt. It is sent to the existing Pages project as `RESEND_API_KEY`, with no plaintext file or terminal output.

## 2. Free Turnstile widget

1. Cloudflare account > Turnstile > Add widget.
2. Name: CustomVibe public forms. Hostname: `customvibe.co.za`. Use Managed mode. No pre-clearance is required. Do not add an unrestricted hostname or use test keys in production.
3. Run `"$CV_NODE" scripts/set-email.mjs turnstile` from the same terminal. Enter the site key and secret key at their hidden prompts.
4. In Workers & Pages > customvibe-public > Deployments, retry the latest production deployment after both installers finish. Keep `SITE_GATE_ENABLED=true`.

The code checks Turnstile on the server, including the hostname and contact/order action. Until the provider keys and bindings are ready, forms remain unavailable instead of claiming success.

## 3. Incoming email aliases

Configured on 15 October 2026: free Cloudflare Email Routing is active for `privacy@customvibe.co.za`, `security@customvibe.co.za` and `orders@customvibe.co.za`, all forwarding to customvibe03@gmail.com. The owner verified the Gmail destination and all three rules show Active. Catch-all is disabled. Inbox delivery tests remain outstanding. Once aliases work, the public privacy/security contact can switch from the current confirmed Gmail to the aliases.

## 4. Test behind the gate

`SUBMISSIONS_ENABLED=false` remains committed until setup is complete and we can test the free runtime. Tell the assistant when the domain and keys are ready. The assistant will enable controlled testing behind the site gate, measure maximum-size requests on Cloudflare, and revert submissions to false if they exceed the free CPU allowance. Do not upgrade a plan. Installing keys alone will not activate the forms.

- Contact form: send a clearly labelled test to the owner inbox. Confirm actual delivery and Reply reaches the entered customer address.
- Unpaid order: use a non-personal sample photo, one crop, and a 3 x 3 puzzle. Confirm owner email has the correct quantity, catalogue subtotal, phone and preferred PUDO locker. Check all 1200 px pieces and proof match the browser design.
- Confirm customer acknowledgement arrives and says no payment was taken and no order was accepted.
- Check spam folders. Provider acceptance does not prove inbox delivery.
- Try interrupted/retried sending. The same reference must not create a second owner email.
- Check Turnstile failures, missing consent, large artwork and session expiry preserve a useful error without exposing internals.
- Check the site gate remains enabled, admin remains separate, robots disallows all and Pages fail_open stays false.

No email to a real customer should be used as a test without their permission. The code does not store photos for background retry. An uncertain failure must be retried in the same browser tab within 23 hours of its creation, using the same reference. New drafts must begin sending within one hour. After the retry window, contact CustomVibe with the reference instead of creating a duplicate.

## Limits and retention

Artwork per request is capped at about 1.5 MB raw / 2 MB Base64, 60 attachments and 100 magnets. Large collections must be split before submission. The owner receives chosen crops and puzzle pieces, not the original uncropped uploads or EXIF metadata. Acknowledge low-resolution source images before production; export resolution does not add source detail.

The app permits five new submissions per IP per 15 minutes, 80 reserved email messages per UTC day, and 2,400 per calendar month. Orders reserve two messages, contacts one. These conservative app limits stay below a dedicated Resend free account's 100/day and 3,000/month allowance. Reserved sends that later fail may consume slots. Requests rejected by the IP limiter do not consume the global budget. Other use of the same account also consumes its quota; do not enable paid overages.

Opaque retry records expire after 48 hours and are cleaned hourly. No photo, customer details or email body goes in those records. Resend documents 30-day email/log retention on the free plan. Gmail copies remain until deleted. Owner to-do: choose a photo deletion period and keep necessary order records separately. Do not claim photos are never processed by third parties or that email is zero-storage.

## Still blocks launch

Verified sending domain and keys; Turnstile; representative live request CPU measurements on the free Workers runtime; real inbox tests; owner business facts and policy review; PUDO costs/timing/collection rules; photo/email retention decision; mobile checks; separate explicit launch approval. Payment provider can remain pending only while the site clearly offers unpaid requests rather than paid checkout.

Sources: [Resend attachments](https://resend.com/docs/dashboard/emails/attachments), [Resend retention](https://resend.com/security), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Cloudflare email routing](https://developers.cloudflare.com/email-service/get-started/route-emails/).
