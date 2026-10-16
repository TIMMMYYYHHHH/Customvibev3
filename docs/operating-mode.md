# Production behaviour behind the site lock

Owner decision: 16 October 2026. This supersedes historical test-only restrictions in migration, artwork and admin plans.

## Required behaviour

- Keep the public website password gate on and separate server-side admin authentication active. This is not public-launch approval.
- Keep payments disabled. Show accurate unpaid status; do not fabricate a payment or courier booking.
- Run implemented contact, request, artwork, catalogue and customer-email flows normally on the live domain. Do not label them as gated tests or restrict customer emails to an owner allowlist.
- Keep status emails manual. Order details already provide Preview update and Send update for each saved stage. Stage changes never send automatically. A dashboard-card shortcut and a shared email-template review are follow-up work, not prerequisites for existing manual sending.
- Retain artwork and associated request records for 14 days. Requests with artwork expire from the upload start time. Hourly cleanup and the private R2 lifecycle must agree. The 0006 migration extends only active owner records and never revives expired records.
- Retain authentication, authorization, CSRF, validation, private downloads, duplicate prevention and existing free-tier service quotas. Local fixtures and preview deployments do not send real messages or modify production records.

## Deployment and verification

Target only business Cloudflare account `4f57d4e924674cb87b33d4c884745cf6`, Pages `customvibe-business`, and the existing admin/security Workers. The personal-account Wrangler login is not authorized for this deployment.

Deploy in this order: update the existing private bucket lifecycle to 14 days, apply migration 0006, publish security and admin Workers, then publish Pages through the protected GitHub workflow. Keep the site gate on and both environments fail-closed. Confirm encrypted provider credentials are present without reading their values.

Test customer sending without an owner allowlist, independent form readiness, duplicate/uncertain send protection, 14-day expiry and cleanup, unchanged stage/email separation, and signed-out protection. Build the public and admin applications. Verify deployed versions and live wording/expiry. A provider acceptance is not proof of inbox delivery.

## Instructions

The repository AGENTS.md holds the lasting working rules. The root project AGENTS.md is a read-only mirror of ChatGPT Project instructions; use [project-instructions-addition.md](project-instructions-addition.md) in that project's instruction settings. Keep the existing design and Founders Hub rules.

## Execution record

Implementation and deployment evidence will be recorded here after verification. Do not infer live publication from local files.
