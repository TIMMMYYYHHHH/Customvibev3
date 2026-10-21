# Workspace email migration

Historical authorisation, 19 October 2026: correct contact Reply-To, move old Gmail business notification/service contacts to hello@customvibe.co.za, retire unused Cloudflare routes, and reconcile Founders Hub. The automatic contact Reply-To requirement is superseded by the owner's accepted workflow below, dated 21 October.

## Application

Owner order notifications now target hello@customvibe.co.za through the existing Resend path. Customer messages keep orders@customvibe.co.za as Reply-To. No change to manual status triggers, unpaid status, gates, authentication, duplicate reservations or preview sending.

The W3Forms request supplies the validated customer email as `email`. Contact notification delivery and Workspace aliases have already been verified. Keep the provider Reply-To blank: the owner uses the customer email shown in the notification to reply manually. No provider correction, automatic template configuration or further Reply-To verification is required for this accepted workflow.

## Verified before change

Workspace aliases orders/privacy/security received external messages. hello round trip and Resend CV-000007 manual update passed SPF, DKIM and DMARC. Resend reply to orders arrived in Workspace. Owner enabled two-step verification.

## Forwarding retirement

Removed the four obsolete Cloudflare routing rules for hello, orders, privacy and security, previously forwarding to customvibe03@gmail.com. UI now shows only disabled catch-all. Google MX and authentication DNS records were not changed.

## Validation

Updated owner-address expectation failed against the old Gmail destination. After changing the destination, all 24 focused submission/API tests passed, including failed customer receipt retry without duplicate owner mail. Storefront and admin builds passed. Full suite: 328 tests passed, zero failures. The initial sandbox run could not bind the local Vite test port; the complete run with local-server access passed. Production publication and post-deployment protection verification succeeded in GitHub run 39243896685 for commit 73936b2.

## Accepted contact reply workflow, 21 October 2026

The owner explicitly accepted blank W3Forms Reply-To with manual replies to the customer email visible in each contact notification. This is the normal workflow. Automatic Reply-To templating, including `{{email}}`, is not a requirement. Do not reopen template verification, change the blank setting or contact the provider about it without a new explicit owner request. Earlier pending contact Reply-To/template instructions here and in dated handoffs are superseded, while their historical evidence remains intact.

No new provider query, email, settings change or implementation was used to record this decision. Separate contact-data retention and recovery checks remain open; this acceptance does not close them.

## Remaining service work

Separate contact-data retention and recovery checks; Google billing contact; any verified service notification contacts. Account login changes may need owner verification and must not be claimed from a contact edit. Founders Hub numeric cost currently rejects saves; EUR/ZAR estimates are in saved notes.

## Historical handoff correction, 19 October 2026

The handoff below is superseded for W3Forms Reply-To. Keep W3Forms and the later working blank Reply-To/manual-address workaround recorded in Founders Hub. Do not set `{{email}}` on the strength of the historical handoff. Reuse “Fix contact delivery, Reply-To and email aliases” and audit EXT-01 for current provider settings, the remaining legacy contact hop and an owner-controlled delivery/header check. Existing Workspace mailbox ownership, alias checks and the Resend transactional path above remain dated evidence; this correction does not claim fresh contact delivery or Reply-To verification.

The verification requests in this section describe that historical checkpoint. The 21 October acceptance above defines the current contact reply workflow and supersedes the pending automatic Reply-To requirement.

Historical privacy checkpoint, 20 October 2026: Public privacy wording distinguishes Workspace business mail from the retained legacy contact notification account. This was based on the dated mailbox/DNS records and existing application routes above, not a new provider, forwarding, delivery or header check. At that time, W3Forms contact delivery, Resend transactional mail and the blank Reply-To/manual-customer-address workaround remained unchanged, and EXT-01 retained further verification. The accepted workflow above supersedes the pending contact Reply-To/template portion.

## Historical owner handoff, superseded

19 October: owner explicitly chose to keep W3Forms. Do not migrate contact delivery to Resend. Provider edits were attempted in Chrome, but the first reload retained the old recipient and blank Reply-To; later saves were unconfirmed. Tim will manually save notification address hello@customvibe.co.za and documented Reply-To {{email}}, refresh, then request the live delivery test. Google billing/service contacts remain to verify. Cloudflare profile email is a sign-in identity and was not changed.
