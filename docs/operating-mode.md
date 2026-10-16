# Production behaviour behind the site lock

Owner decision: 16 October 2026. This supersedes historical test-only restrictions in migration, artwork and admin plans.

## Required behaviour

- Keep the public website password gate on and separate server-side admin authentication active. This is not public-launch approval.
- Keep payments disabled. Show accurate unpaid status; do not fabricate a payment or courier booking.
- Intended paid production checkout: complete the order and send its confirmation only after verified successful gateway payment. No later owner-acceptance step. Payment does not imply production or dispatch. The current payment-disabled live flow remains unchanged until gateway implementation is separately approved.
- Run implemented contact, order, artwork, catalogue and customer-email flows normally on the live domain. Do not label them as gated tests or restrict customer emails to an owner allowlist.
- Keep status emails manual. Order details already provide Preview update and Send update for each saved stage. Stage changes never send automatically. Orders cards provide an Email update shortcut to this same flow. The approved shared email layout is applied to the existing six Resend messages; inbox checks and remaining inventory are separately tracked. See [email-design-verification.md](email-design-verification.md).
- Retain artwork and associated request records for 14 days. Requests with artwork expire from the upload start time. Hourly cleanup and the private R2 lifecycle must agree. The 0006 migration extends only active owner records and never revives expired records.
- Retain authentication, authorization, CSRF, validation, private downloads, duplicate prevention and existing free-tier service quotas. Local fixtures and preview deployments do not send real messages or modify production records.

## Deployment and verification

Target only business Cloudflare account `4f57d4e924674cb87b33d4c884745cf6`, Pages `customvibe-business`, and the existing admin/security Workers. The personal-account Wrangler login is not authorized for this deployment.

Deploy in this order: update the existing private bucket lifecycle to 14 days, apply migration 0006, publish security and admin Workers, then publish Pages through the protected GitHub workflow. Keep the site gate on and both environments fail-closed. Confirm encrypted provider credentials are present without reading their values.

Test customer sending without an owner allowlist, independent form readiness, duplicate/uncertain send protection, 14-day expiry and cleanup, unchanged stage/email separation, and signed-out protection. Build the public and admin applications. Verify deployed versions and live wording/expiry. A provider acceptance is not proof of inbox delivery.

## Instructions

The repository AGENTS.md holds the lasting working rules. The root project AGENTS.md is a read-only mirror of ChatGPT Project instructions; use [project-instructions-addition.md](project-instructions-addition.md) in that project's instruction settings. Keep the existing design and Founders Hub rules.

## Execution record

16 October 2026 verification:

- 139 automated tests passed, including sending without an owner allowlist, duplicate/uncertain send handling, stage/email separation and 14-day migration expiry. Public and admin builds passed.
- Private R2 lifecycle changed to 14 days and confirmed after reload. Public bucket access remains disabled. Migration 0006 applied successfully to the business security database.
- Security Worker version: `67c59a0f-ba19-4d2f-a15b-187b75dd97c2`, hourly cleanup still scheduled. Admin Worker version after banner correction: `20c8f91f-957f-4d77-a666-cb28a24fe37f`.
- Website publication `5181281` passed workflow [38892851760](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38892851760), including build, tests and before/after gate protection checks.
- Signed-in live order CV-000001 shows normal unpaid wording and artwork expiry on 30 October, matching the 14-day policy. Its current stage and accepted email history were preserved. No extra email was sent for this deployment. Existing duplicate-send protection remains visible for an already attempted update.
- Repository instructions, setup/privacy copy and Founders Hub guidance updated. The owner confirmed in the continuation chat on 16 October that the Project instructions were updated. The supplied current instructions match the repository policy; Founders Hub rules alignment and its parent are complete.
- Automatic status emails remain deferred. The Orders dashboard shortcut reuses the existing order detail Preview update / Send update flow. See [manual-email-access-verification.md](manual-email-access-verification.md) for implementation and verification.

## Production checkout and order confirmation

Production checkout rule: only server-verified successful payment completes an order and triggers the order confirmation email. Pending, failed, cancelled or unverified payment must not complete an order or send its confirmation. A browser return to a success URL alone is not proof of payment. Payment callbacks and confirmation sends must remain idempotent. There is no separate owner-acceptance step; later status updates remain manual. Payments on the currently locked live site stay disabled until separately approved. Design previews may show clearly labelled fictional paid orders, but must never send or imply the live gateway exists.

This supersedes the earlier incomplete interpretation that submission alone completes an order. The local proposed emails show a fictional paid production order. The Current comparison remains the deployed payment-disabled copy. Live payment integration is not implemented or approved by this design decision. Founders Hub tracks the dependency in “Choose a payment provider and approve paid-checkout scope”; cross-surface copy remains in “Make wording consistent across website, admin and emails”.

## Wording alignment, 17 October 2026

The current payment-disabled flow calls placed records orders, with Unpaid shown separately and no later owner-acceptance step. Checkout, confirmation, help, admin, print instructions and order errors match the existing six email messages. Technical request IDs and stored stage keys remain unchanged. See [wording-verification.md](wording-verification.md). The future gateway rule above remains separately scoped.
