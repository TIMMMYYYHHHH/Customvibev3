# CustomVibe Migration Implementation Plan

Date: 15 October 2026. Specification: the user's Migration, Auth, SEO, Security Audit request in this chat. Execution: sequential, inline, with verification before publishing. The user authorizes migration, commits and main pushes and asks that ambiguities be resolved with stated assumptions.

## Preserved state

GitHub: TIMMMYYYHHHH/Customvibev3. Original main: f907c8b.
Remote backup branch: backup/pre-migration. Annotated remote tag: pre-migration-2026-10-15.
The approved replacement source is ../../prototype, which is not a Git repository. Preserve that source separately and migrate a copy here. Never modify synced sources/ files.

## Architecture and assumptions

Public Cloudflare Pages project customvibe-public, GitHub main, root /, build npm run build, output dist/client. Pages Functions middleware covers ALL paths and assets, except public robots.txt. Gate fails closed unless SITE_GATE_ENABLED is exactly false. Admin is a separate Worker customvibe-admin with assets and run_worker_first, hostname admin.customvibe.co.za. It has separate credentials, session scope and binding permissions. The public Pages project never has a D1 or R2 binding. A narrow authenticated internal service publishes only validated catalogue data to public content.json. Customer photos stay in browser memory. No payment, order, courier booking or email sending is connected.

KV supplies failed-login lockouts, backed by atomic D1 attempt accounting because KV alone has eventual consistency and is unsuitable for an exact concurrent counter. Auth database contains only rate-limit keys/session revocations, not plaintext credentials. Sessions last 8 hours for the site and 30 minutes for admin. PBKDF2-SHA256 uses random salt and 100000 iterations. HMAC-SHA256 tokens use host-only __Host cookies. All writes require same-origin and CSRF tokens. Missing secrets/bindings return a generic 503.

## Cloudflare inventory and resources affected

Existing Worker customvibe, custom domain customvibe.co.za, ASSETS binding, secret WEB3FORMS_KEY. At the initial inspection, no Pages project or CustomVibe D1 database existed. Existing Worker has no D1/KV/R2 binding. Existing worker routes list is empty; apex is a Worker custom domain. Initial CLI credentials could not inspect DNS, SSL mode, KV or R2; the authenticated dashboard was subsequently used for DNS, SSL and KV. Do not touch unrelated resources.

Create: customvibe-public Pages project; customvibe-admin Worker; customvibe-security Worker for atomic auth throttling; dedicated auth D1 and content D1 databases; two separate KV namespaces. Proposed private R2 storage is not needed while images remain browser memory or validated admin content. Do not invent bucket IDs or add public storage.
Move apex from Worker custom domain to Pages only after gated preview verification. Add www as redirect and admin custom domain, verify TLS. Existing customvibe Worker retained for rollback; disable its automatic deploy before replacing main. DNS/security settings require adequate access.

## Ordered work and verification

- [x] Phase 0: inspect repo and Cloudflare, fetch full history, publish backup branch/tag, write this plan.
- [x] Phase 1: replace obsolete tracked files with current source; remove obsolete prototype hosting packaging; remove unused public assets and prompts; ignore secret/local/build files; scan history without printing matches; build/test; logical commits; push main; connect Pages GitHub builds. Do not publish an unguarded intermediate build.
- [x] Phase 2: add shared crypto/auth, local hidden-input credential provisioning script, all-path middleware, session expiry, logout, CSRF and atomic/KV throttling. Test missing configuration, cookies, replay after logout, forged/expired/cross-scope sessions, lockout, API/static-path bypasses and public robots.
- [x] Phase 3: separate admin entry/build/Worker, remove public admin imports/links/APIs, protect every admin asset and endpoint. Add D1 catalogue compare-and-swap, strict size/schema/image checks; public read only through service binding. Test unauthorized requests, origin/CSRF, stale revision, malformed images and paths.
- [x] Phase 4: native-route legal/contact/404 pages in existing design. Mark unknown business details TODO. Research POPIA/CPA/ECTA from primary sources. Do not claim final compliance before details/review. Necessary cookies only.
- [x] Phase 5: clean URLs, static crawlable page output, per-page metadata/canonicals/social cards/JSON-LD, favicon/manifest/security contact TODO, sitemap, gate-aware robots, cache/security headers and redirects. Verify HTML, HTTP statuses and responsive app flow. Search console DNS verification remains manual.
- [x] Phase 6: full local/build/history/dependency and available live audit; fix defects, verify resource permissions/settings where authorized. Distinguish local test results from live verification.
- [ ] Phase 7: full report in chat covering changes, severity, SEO, secrets commands, manual steps, launch and rollback. Never include secret values.

## Rollback

Do not delete old Worker or databases during migration. Before domain cutover capture active deployment/version IDs and DNS target. Reattach customvibe.co.za to retained customvibe Worker if Pages migration fails; remove only new conflicting Pages domain binding. Keep the gate on during troubleshooting. To restore source without rewriting history: create a revert commit for migration commits or restore tracked files from pre-migration-2026-10-15 on a new rollback branch, verify, then merge/push main. Do not restore leaked credentials. Revoke/rotate any exposed values and retain their new secrets. Retain new D1 data and KV namespaces until rollback acceptance, then remove only confirmed unused migration resources.

## Progress ledger

Phase 0: backup refs verified on GitHub. Cloudflare OAuth refreshed using official Wrangler; missing access is an outstanding dependency. Phase 1 will keep production cutover pending until protected deployment passes checks.

Ruling: free tier only, explicitly required by the user. Two dedicated D1 databases created after the user freed capacity. Never upgrade, buy storage or enable paid rules.

- [ ] Owner to-do: replace both temporary passwords using scripts/set-password.mjs. Temporary credentials authorized by user on 15 October 2026; plaintext must never be stored or shown.


## Verified deployment and audit outcomes

GitHub main automatically deployed through Pages on 15 October 2026. Public project: customvibe-public. Domains customvibe.co.za and www.customvibe.co.za are active. Both proxied CNAMEs point to customvibe-public.pages.dev. Admin custom domain admin.customvibe.co.za points to customvibe-admin. Public pages, content JSON and assets require a valid session; robots is public and disallows crawling. Authenticated unknown routes return 404; public admin APIs return 404. Admin login, session endpoint and protected catalogue reads were verified live.

Critical platform setting fixed: deployment_configs.production.fail_open and preview.fail_open are both false. Recheck these after configuration changes. Free-tier exhaustion must never fall back to unprotected static assets. No paid feature or upgrade was enabled. Security controls: SSL Full (strict), Always Use HTTPS, minimum TLS 1.2, TLS 1.3, existing Bot Fight Mode and browser integrity checks. Free edge rate rule CustomVibe login burst protection: URI path /auth/login, 20 requests per IP in 10 seconds, block 10 seconds. Application limiter additionally allows five attempts per IP per 15 minutes with separate site/admin KV lockouts and atomic D1 accounting.

Legacy customvibe Worker retained with automatic builds disabled and workers.dev plus version previews disabled. Its old custom-domain binding was removed. Rollback version: 5a21c533-53dc-437e-8dcb-02a323f51889. To restore that deployment, select this version in the Worker Deployments screen. Remove Pages apex custom-domain registration and its new CNAME, then add customvibe.co.za under the old Worker's Domains screen. This restores the old, un-gated website, so keep launch protection in mind and do not do it merely to troubleshoot the gate.

Gitleaks full reachable Git history and current source scans found no leaks. The earlier custom scanner reported only known example placeholders. npm audit after dependency updates reported zero vulnerabilities. Public images reduced from approximately 51 MB to 4.1 MB using WebP and removal of unused assets. Desktop and 390 px mobile layouts inspected. No claim of measured field Core Web Vitals or final legal compliance is made.

## Owner launch to-do

- [ ] Replace both temporary credentials with scripts/set-password.mjs and redeploy Pages. Passwords were generated in process memory, tested, then discarded; no recoverable plaintext copy exists.
- [ ] Complete policy TODOs: legal entity, registration, address, Information Officer, monitored contact, retention, operators/international transfers, VAT, delivery costs/times, cancellation/refunds and complaint details. Review POPIA, CPA and ECTA applicability before accepting orders.
- [ ] Add a monitored Contact field to public/.well-known/security.txt.
- [ ] Connect order/contact/payment/delivery services before describing them as operational. The current app is a browser-only designer and collection draft. Add free Turnstile with server-side token verification when enabling submission endpoints; it is not currently integrated.
- [ ] Verify Search Console and Bing ownership through their supplied DNS TXT/CNAME records; submit https://customvibe.co.za/sitemap.xml after launch.
- [ ] Measure mobile performance and field Core Web Vitals after launch. Product offer/merchant rich-result fields require confirmed sales terms and availability.
- [ ] Set SITE_GATE_ENABLED to the string false in wrangler.jsonc, commit and push only when ready. Keep admin authentication enabled. Verify robots, sitemap, metadata and 404 responses anonymously after deployment.

Exact local credential commands from this repository (Node.js installed):

    node scripts/set-password.mjs site customvibe-public
    node scripts/set-password.mjs admin customvibe-admin

Site secrets: SITE_PASSWORD_HASH, SITE_PASSWORD_SALT, SESSION_SECRET. Admin secrets: ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT, ADMIN_SESSION_SECRET. Script prompts invisibly and sends derived values directly to Cloudflare. It never writes plaintext or secret output to disk. No leaked credential requiring emergency rotation was found.

## Owner update: 15 October 2026, launch preparation

The owner confirms both passwords replaced and both logins working after the CSRF fix (65ba0c4). Keep SITE_GATE_ENABLED=true. This is not launch approval. Business identity, address, VAT, Information Officer/PAIA and full commercial terms remain an owner to-do, deferred for now. Google domain verification is owner-confirmed; Bing is explicitly out of scope. Sitemap submission is owner-reported, but indexing remains blocked while the gate is on and must be checked again after launch.

Agreed scope: unpaid order requests, not sales or payment acceptance. Show Payments coming soon. The owner receives design attachments and request details at customvibe03@gmail.com; the customer receives an acknowledgement stating no payment was taken and the request is not yet accepted. Handcrafted magnets; PUDO lockers are the delivery preference. Delivery prices, times, locker availability and bookings still require confirmation. Do not present demo locations as live lockers.

No customer photo storage in D1, KV, R2, localStorage, queues or application logs. Render the chosen crops in browser memory and pass bounded JPEG attachments through a server endpoint to the email provider. Email delivery necessarily involves Cloudflare, the sending provider and the recipient's mailbox, which retain/process data under their policies; never promise that no third party handles photos. Only opaque request digests, send-state flags and quota counters may be retained in the existing security database for retry protection, with expiry. Preserve the browser draft on errors. Email-provider acceptance is not proof of inbox delivery.

Implementation: a shared contact/order API behind the existing site gate, separate form CSRF cookie, server-side Turnstile with action/hostname validation, strict schemas and JPEG dimensions/signatures, trusted catalogue pricing, bounded payloads, per-IP and global quotas, and provider idempotency. Reuse the security service/database for counters and opaque retry state. No new database or paid resource. Render owner/receipt emails from validated fields; recipients and sender are server-controlled. Never accept card details. Contact remains a real form.

Resend account inspection confirms 3/3 domains in use, 100 emails/day and 3,000/month. CustomVibe is not a verified sender yet. No domain will be removed or plan upgraded without the owner's specific direction. Web3Forms free cannot support the requested server-side proxy/Turnstile combination; prepare Resend for contact and order email. Email activation remains fail-closed until sending credentials/domain and Turnstile are ready.

Planned forwarding aliases: privacy@customvibe.co.za, security@customvibe.co.za and orders@customvibe.co.za to customvibe03@gmail.com. Use the confirmed Gmail as the public contact until forwarding is verified. Never claim unverified aliases are operational.

Outstanding owner decisions: business details and policy review; actual payment provider; PUDO tariff, lead times and collection rules; mailbox photo/order retention and deletion procedure; free sender-domain capacity; final email/Turnstile tests; explicit launch approval.

### Email readiness update, 15 October 2026

- Cloudflare Email Routing enabled. Gmail destination verified by owner. The privacy, security and orders aliases all show Active, forwarding to customvibe03@gmail.com; catch-all disabled. Real inbox delivery tests remain.
- Unpaid request flow, owner JPEG attachments and customer acknowledgements implemented. Existing security D1 stores only opaque request fingerprints and send flags. No photo bucket or new database.
- Review fixes: preserve request state across navigation, prevent editing a reserved order, unlock initial validation errors, inspect complete baseline JPEG marker structure and reject metadata, atomically reserve quota, recover existing requests for 23 hours within Resend's 24-hour idempotency window.
- Artwork cap reduced to 2 MB encoded / about 1.5 MB JPEG to reduce free-runtime CPU pressure. Resolution remains 1200 pixels per print square. Real maximum-size CPU measurement remains mandatory before enabling normal submissions.
- `SITE_GATE_ENABLED=true`, `SUBMISSIONS_ENABLED=false`. Forms stay unavailable pending the separate free Resend account, verified sending domain, keys, Turnstile and controlled runtime/inbox tests. No approval to launch.
- Owner to-do retained: business identity and address, VAT, Information Officer/PAIA, delivery charges/timelines, cancellation and refunds, photo-email deletion period and final policy review. Bing skipped by owner; Google ownership owner-confirmed.
- Rollback for this update: disable submissions, revert the email feature commits and redeploy Pages. The additive submissions table may remain without affecting prior login logic. Do not remove or reset the working site/admin secrets or disable the site gate.


## Active launch checklist, 15 October 2026

This supersedes older readiness notes above. Maintain this checklist internally and work through one owner step at a time in chat. The owner no longer wants the HTML guide. Never disable the site gate without separate launch approval. Free plans only.

- [x] Owner confirms permanent site/admin passwords installed and both logins working.
- [x] Unpaid request scope agreed: owner artwork email, customer acknowledgement, payment coming soon.
- [x] CustomVibe Google account selected for services: customvibe03@gmail.com. Domain and Cloudflare stay in their current account.
- [x] Separate Resend account signed in, customvibe.co.za verified. Added the provider's exact DKIM TXT and two DNS-only CNAME records plus monitoring DMARC. Preserved existing Cloudflare forwarding MX/SPF and Google verification.
- [x] Privacy, security and orders aliases configured and destination verified. Actual inbox delivery remains to test.
- [x] Google Search Console confirms verified owner. Manual actions and security issues show no issues detected. Submitted sitemap shows Couldn't fetch and zero discovered pages while the gate blocks access. Recheck and resubmit after approved launch.
- [x] Google Business Profile eligibility checked. Owner confirms online orders and courier delivery only, so do not create an ineligible profile. No claim is made about any pre-existing profile.
- [x] Bing skipped at owner's request.
- [x] Owner confirms W3Forms sign-in and contact form creation in normal Chrome. Owner confirms notification recipient, domain and contact settings saved. Dashboard delivery verification remains pending.
- [x] Owner confirms W3Forms form key installed privately using scripts/set-email.mjs w3forms. Contact messages use W3Forms, not Web3Forms. Earlier Web3Forms assessment does not apply to W3Forms. Verify secret presence without reading its value before activation.
- [ ] Install a domain-restricted, sending-only Resend key privately using scripts/set-email.mjs email.
- [x] Owner confirms Turnstile widget created and both keys installed privately using scripts/set-email.mjs turnstile. Prepared settings were CustomVibe public forms, customvibe.co.za only, Managed, pre-clearance off. Verify secret presence without reading values, widget settings and live challenge flow before activation.
- [x] Resend free transactional plan confirmed: 100/day, 3,000/month, pay-as-you-go disabled. Tracking not configured.
- [ ] Review enforced TLS before real photo submissions; current Resend setting is Opportunistic.
- [ ] Test contact, order artwork, customer acknowledgement and incoming aliases with labelled non-personal test data. Check actual inboxes, duplicates, errors and free-runtime CPU.
- [ ] Finish owner business details, privacy/operator agreements, contact-message and photo-email deletion schedule, PUDO charges/timelines/collection rules, cancellation/refunds and final policies.
- [ ] Measure mobile performance. Confirm SEO/security and all routes again after final deployment.
- [ ] Obtain separate launch approval, then disable only the public gate and check public indexing/sitemap. Admin authentication stays on.

W3Forms implementation: provider-specific form readiness, server-only key, existing Turnstile/CSRF/quota checks, whitelisted text fields and a single dispatch claim in existing D1. Unknown provider outcomes are held for manual delivery review to avoid duplicate messages. Migration 0003 only adds a dispatch flag, no customer data. Orders retain Resend idempotency. Keep SITE_GATE_ENABLED=true and SUBMISSIONS_ENABLED=false until controlled testing is ready.

Rollback: disable submissions first, revert the W3Forms integration commit and redeploy Pages/security Worker if needed. The added contact_started column may safely remain. Do not undo working auth secrets, forwarding MX records, or the public gate. DNS verification records can remain while sending is disabled.


### W3Forms preparation verification

62 automated tests pass, including concurrent contacts, provider errors, lost claim acknowledgement, failed completion marking, and independent provider readiness. Public build and Pages Functions compilation pass. A local browser check confirms uncertain contact state and its reference survive navigation, with sending disabled and only one simulated dispatch. No live contact or order email has been sent yet.

Migration 0003 applied to existing security D1. Private security Worker version: 7dc7ad86-e0be-4f43-ab76-baf5ea2c5fa2. No new paid resource or plan change. Provider credentials and real inbox tests remain pending.

## Business-account migration update, 15 October 2026

This section supersedes earlier statements that CustomVibe hosting must remain in the personal Cloudflare account. The owner approved moving hosting to customvibe03@gmail.com while keeping GitHub and GoDaddy in their existing accounts. No public launch or real contact/order submission is approved.

Destination account: 4f57d4e924674cb87b33d4c884745cf6. Pages: customvibe-business (customvibe-business.pages.dev). Private Workers: customvibe-security, customvibe-catalogue and customvibe-admin. Destination D1 and KV IDs are recorded in the Worker configurations. Pages does not accept account_id in its configuration: the credential scripts and publishing workflow require the explicit destination environment value and verify the live account before writing.

The owner selected GitHub Actions publishing because Cloudflare does not permit one GitHub repository to be connected to Pages projects in two accounts. The original protected source Pages project must remain available for 48 hours after cutover. Destination Pages uses Direct Upload. Converting to Cloudflare's built-in Git builds would require a replacement project. Standard GitHub-hosted runner execution is free for this public repository. The workflow uses no paid larger runners, caches or artifact storage.

Automatic publishing targets main only. It builds, tests, verifies both environment protection settings and required credentials, deploys Pages Functions, then checks protection again. Its dedicated GitHub secret is CUSTOMVIBE_PAGES_DEPLOY_TOKEN, with business-account Pages Edit and Account Settings Read. Worker deployments remain separately controlled. The site gate remains true and submissions remain false; a future approved launch must explicitly revise these deployment guards.

Current preparation: both databases restored and verified, three private Workers deployed, both site environments and admin password credentials installed, first protected Pages deployment completed. The destination DNS zone is on Free with imported email/verification records. Source automatic builds are frozen. Nameservers and source domain bindings have not moved. Destination forwarding, security parity, provider credentials, live access tests and GitHub publishing verification are still required before cutover.

Rollback must restore the protected customvibe-public Pages deployment and its source account resources. Never restore the ungated legacy customvibe Worker. Start the 48-hour retention clock only after a successful domain cutover and record exact UTC and Johannesburg times. Deletion requires later acceptance; no automatic cleanup is authorized.
