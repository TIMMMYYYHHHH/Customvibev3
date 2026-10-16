# Admin orders and customer updates

Current operating policy: [production behaviour behind the site lock](operating-mode.md).

The live admin is https://admin.customvibe.co.za/orders . The website remains password-protected and admin sign-in remains separate. Payments are disabled. Orders, artwork, contact forms and customer emails otherwise use the normal production workflow.

Intended production checkout: complete the order and send its confirmation only after verified successful gateway payment. There is no separate owner-acceptance step. Pending/failed payment does not create a completed order or send confirmation. Later stage emails remain manual. Current live payments stay disabled; the paid-order design preview does not change existing records, stages or send history.

## Customer email

The production admin Worker requires the existing `RESEND_API_KEY` secret and `ADMIN_SEND_ENABLED=true`. `scripts/set-admin-email.mjs` securely installs the sending key in the verified business Worker. No owner-address allowlist is required; updates go to the customer address stored on the order. The old `ADMIN_TEST_RECIPIENTS` secret is ignored and can be removed during routine credential cleanup.

Choose **Email update** on an Orders card to open and focus the existing Customer update section. The recipient and saved stage are visible before previewing. On mobile this section appears before artwork. You can also open the request normally. Save any intended stage change, click **Preview update**, review the recipient/message and click **Send update**. This is available at every stage. Saving or dragging a stage never sends automatically. One send attempt is recorded per order version to prevent duplicates. An accepted, failed or uncertain attempt stays in history. **View send history** jumps to Activity & send history; the shortcut does not bypass an attempted update or trigger a send. Check the provider before retrying an uncertain delivery; do not change stages merely to bypass duplicate protection.

Email availability is independent of the website gate. Local fixtures and preview deployments do not send. The admin send endpoint remains restricted to its production hostname, authenticated session and same-origin CSRF-checked requests. Shared free-tier message allowances remain in place. The six Resend templates use the approved shared design; the existing admin preview continues to show the matching plain-text message. See [email-design-verification.md](email-design-verification.md).

## Artwork and request records

Artwork, associated contact/request details, submitted prices, stages and update history expire after 14 days. For requests with artwork, the earlier artwork upload time controls expiry. Hourly cleanup deletes expired data; the private R2 bucket has a matching 14-day lifecycle rule. Stage changes do not extend retention. Original photos and unsent drafts remain in browser memory.

Migration 0006 extends still-active seven-day owner records to the new period without reviving expired data or altering order stages/history. Set the bucket lifecycle to 14 days before applying that migration and deploying the security Worker.

## Verification

Verify authenticated order access, previews, ZIP quantities, stage persistence, manual preview/send and visible send history. Confirm actual inbox delivery and Reply-To when a real send is requested. Store content save and reload are separate from email delivery. Physical print quality and maximum-size runtime checks remain separately tracked in Founders Hub. Migration-resource cleanup still needs its own approval.

## Publishing the existing admin

The protected GitHub workflow has an optional manual **publish_admin** checkbox, default off. On main, enabling it attempts to publish Pages and the existing business admin Worker using the configured publishing secret. As verified on 16 October 2026, `CUSTOMVIBE_PAGES_DEPLOY_TOKEN` is Pages-only and cannot pass the admin settings guard. Leave that checkbox off with the current credential; publish the existing admin through the private business deployment helper instead. A read-only guard verifies the admin target, gate, authentication service, manual-send availability and required credential presence before and after deployment. If that credential lacks Worker permissions, stop and arrange the existing business deployment access; do not use a personal-account Wrangler login or broaden permissions automatically. No migrations or record changes are part of this publication.

Previous recovery publication: `ed8ffa2a-b779-40bb-a636-97e97b966767`, application `d52dd90`, 16 October 2026, using `scripts/artwork-access.py` with privately restored existing business access. Security version: `ce899445-1dcd-4fec-b6e9-5fa06e8d7f4d`. 159 tests, builds and protection checks pass. Bounded SELECT recovery and two-at-a-time artwork previews are deployed. Sign-in, Orders, preview/history and targeted image recovery work, but live D1 internal errors still intermittently exhaust recovery. Availability remains unresolved and phone email acceptance is paused. See [admin-availability-verification.md](admin-availability-verification.md) for evidence and the unsent provider report.

Current wording publication, 17 October 2026: application `2c8472c`; admin `54dfff86-abd1-4c70-a6c4-70259f8658a8`; security `c3cbd143-0ce8-4cd2-91cf-918ffa1008ff`. Builds, 159 tests and protected publishing checks passed. Signed-in live Orders wording, preserved CV-000001 stage/history and duplicate block verified after Tim refreshed his session. See [wording-verification.md](wording-verification.md). Availability remains Blocked at Tim’s request; do not contact Cloudflare or resume diagnostics.
