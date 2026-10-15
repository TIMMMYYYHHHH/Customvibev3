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

Existing Worker customvibe, custom domain customvibe.co.za, ASSETS binding, secret WEB3FORMS_KEY. No Pages projects exist. No CustomVibe D1 database exists. Existing Worker has no D1/KV/R2 binding. Existing worker routes list is empty; apex is a Worker custom domain. Current credentials cannot inspect DNS, SSL mode, KV or R2. Do not touch unrelated resources.

Create: customvibe-public Pages project; customvibe-admin Worker; customvibe-security Worker for atomic auth throttling; dedicated auth D1 and content D1 databases; two separate KV namespaces. Proposed private R2 storage is not needed while images remain browser memory or validated admin content. Do not invent bucket IDs or add public storage.
Move apex from Worker custom domain to Pages only after gated preview verification. Add www as redirect and admin custom domain, verify TLS. Existing customvibe Worker retained for rollback; disable its automatic deploy before replacing main. DNS/security settings require adequate access.

## Ordered work and verification

- [x] Phase 0: inspect repo and Cloudflare, fetch full history, publish backup branch/tag, write this plan.
- [ ] Phase 1: replace obsolete tracked files with current source; retain required prototype packaging; remove unused public assets and prompts; ignore secret/local/build files; scan history without printing matches; build/test; logical commits; push main; connect Pages GitHub builds. Do not publish an unguarded intermediate build.
- [ ] Phase 2: add shared crypto/auth, local hidden-input credential provisioning script, all-path middleware, session expiry, logout, CSRF and atomic/KV throttling. Test missing configuration, cookies, replay after logout, forged/expired/cross-scope sessions, lockout, API/static-path bypasses and public robots.
- [ ] Phase 3: separate admin entry/build/Worker, remove public admin imports/links/APIs, protect every admin asset and endpoint. Add D1 catalogue compare-and-swap, strict size/schema/image checks; public read only through service binding. Test unauthorized requests, origin/CSRF, stale revision, malformed images and paths.
- [ ] Phase 4: native-route legal/contact/404 pages in existing design. Mark unknown business details TODO. Research POPIA/CPA/ECTA from primary sources. Do not claim final compliance before details/review. Necessary cookies only.
- [ ] Phase 5: clean URLs, static crawlable page output, per-page metadata/canonicals/social cards/JSON-LD, favicon/manifest/security contact TODO, sitemap, gate-aware robots, cache/security headers and redirects. Verify HTML, HTTP statuses and responsive app flow. Search console DNS verification remains manual.
- [ ] Phase 6: full local/build/history/dependency and available live audit; fix defects, verify resource permissions/settings where authorized. Distinguish local test results from live verification.
- [ ] Phase 7: full report in chat covering changes, severity, SEO, secrets commands, manual steps, launch and rollback. Never include secret values.

## Rollback

Do not delete old Worker or databases during migration. Before domain cutover capture active deployment/version IDs and DNS target. Reattach customvibe.co.za to retained customvibe Worker if Pages migration fails; remove only new conflicting Pages domain binding. Keep the gate on during troubleshooting. To restore source without rewriting history: create a revert commit for migration commits or restore tracked files from pre-migration-2026-10-15 on a new rollback branch, verify, then merge/push main. Do not restore leaked credentials. Revoke/rotate any exposed values and retain their new secrets. Retain new D1 data and KV namespaces until rollback acceptance, then remove only confirmed unused migration resources.

## Progress ledger

Phase 0: backup refs verified on GitHub. Cloudflare OAuth refreshed using official Wrangler; missing access is an outstanding dependency. Phase 1 will keep production cutover pending until protected deployment passes checks.

Ruling: free tier only, explicitly required by the user. Two dedicated D1 databases created after the user freed capacity. Never upgrade, buy storage or enable paid rules.

- [ ] Owner to-do: replace both temporary passwords using scripts/set-password.mjs. Temporary credentials authorized by user on 15 October 2026; plaintext must never be stored or shown.
