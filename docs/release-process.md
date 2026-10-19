# Release process

## Validate before merging

The `Validate proposed CustomVibe changes` workflow in `.github/workflows/validate.yml` runs for pull requests targeting `main`. Its check is named `Node 22 build and fixture tests`. It checks the proposed merge revision on an Ubuntu runner using Node 22 and the committed dependency lockfile:

1. `npm ci`
2. `npm run build` for the storefront, SSR bundle and prerendered pages
3. `npm run build:admin` for the admin and shared storefront preview
4. `npm test` for the local fixture suite

Each command must succeed. A failing command stops the job; no step permits failure. The job has a 15-minute limit, and a newer revision cancels validation of an older revision on the same pull request. There are no path filters, so configuration, documentation and dependency changes also get validation.

This is a validation-only workflow. It uses `pull_request`, never `pull_request_target`, read-only repository contents permission and checkout without persisted credentials. It references no production secrets, deployment environment or customer service bindings, and does not deploy, send customer email or access production records. Tests use local fixtures. Keep any future validation steps credentials-free and do not run untrusted pull-request code with production credentials.

Before merging, review the diff and require a successful result for the latest revision, including both builds and the full suite. Fixture checks do not replace visual review, production protection checks or separately tracked physical print and QR acceptance. The validation workflow grants no publication access. The protected publish workflow described below still keeps both gates enabled and payments disabled.

### Repository enforcement and evidence

Read-only inspection on 19 October 2026 returned `Branch not protected` for `main` and no repository rulesets. Therefore successful validation is not currently enforced by a repository rule. Once this workflow has run in GitHub, configuring pull-request requirements and requiring `Node 22 build and fixture tests` remains a separate repository administration action. Confirm the exact check name in the run and inspect the latest settings before making any authorized change. Do not claim merge protection merely because the workflow exists, and do not buy a plan upgrade to enable it without owner approval.

Local Node 22 verification and an actual GitHub Actions run are separate evidence. Record the tested revision, exact runtime, install/build/test results and any warnings in the release or task activity. An actual pull-request run and required-check enforcement remain pending until independently verified. Do not mark those checks complete from local results.

To reproduce validation locally, use a clean disposable checkout with no production credentials, install Node 22 and run the four commands above in order. A negative control may add a deliberately failing fixture only in that disposable checkout and confirm `npm test` exits nonzero; remove the fixture afterwards and rerun the suite. Never commit the negative fixture or run it against live data.

If validation itself is broken, correct or revert only the new validation workflow through review. Preserve the protected publish workflow and its destination, compatibility and protection checks.

## Traceable paired production releases (TECH-20)

The publisher retains its main-only repository check, Node 22 builds/tests, destination account, 15-minute limit and shared `customvibe-production` concurrency group. It now produces `dist/release/build-manifest.json` and `dist/release/release-manifest.json`, outside both public asset roots. The workflow saves them as `release-manifest-<run ID>` for 90 days, including incomplete releases. Preserve verified evidence in `docs/releases/` before expiry using an ordinary reviewed documentation change, never an automatic commit that triggers another release.

A main push still attempts the Pages release. Shared storefront, asset, admin or authentication changes require the admin built from that same commit. `publish_admin=false` cannot override required pairing. Proof API changes require Pages only. Static transitive imports identify private service dependencies; configuration and toolchain changes are conservative. An unclassified runtime path stops planning. Update classifier fixtures when adding a new runtime boundary or computed import.

Manual dispatch requires `reviewed_sha`, exactly 40 lowercase hexadecimal characters, equal to the dispatch event's main commit. Checkout uses that event SHA. Before planning and each publication the script verifies checkout, event, reviewed revision and freshly read main all agree. A newer main aborts instead of switching source. Current Pages and all three Worker version IDs are also compared before each upload. This detects independent releases, but the interval between observation and provider upload is not a distributed lock: coordinate manual production releases with the workflow. The post-upload check catches observed drift and keeps the release incomplete.

### First baseline and private prerequisites

**Before enabling this changed workflow, prepare a real sanitized baseline.** Existing builds and historic free-text version tags are insufficient. Without a valid record it stops before uploading. This is an evidence requirement, not another owner approval. The first release needs observed Pages/admin/security/catalogue IDs, guarded source/upload records, current ledger visibility and the current reviewed SHA. Subsequent releases reuse the latest available valid artifact from this workflow, including a partial artifact's original classification base. Search is bounded to 20 runs. Missing/expired evidence requires the explicit `release_evidence_json` input, never `HEAD^` inference.

The baseline is a JSON release record with these fields:

- `schemaVersion: 1`, `repository: "TIMMMYYYHHHH/Customvibev3"`, `state: "verified"`, `sourceSha` and `baseSha` equal to the recorded complete source revision.
- `components` contains `pages`, `admin`, `security`, `catalogue`. Each has a `receipt` with `account`, `component`, actual provider `id`, actual `sourceSha`, `sourceDigest`, `origin: "guarded-upload"`, `evidenceUrl` and ISO `observedAt`.
- The account is `4f57d4e924674cb87b33d4c884745cf6`. Worker IDs identify the single current 100% version, not the deployment collection ID. Pages uses the canonical successful production deployment ID.
- Generate source fingerprints from the actual guarded checkout with `node scripts/release-manifest.mjs fingerprints <40-character SHA>`. This reads Git only. It does not establish that the source was deployed. The receipt must independently connect that checkout and uploaded build to the provider's returned ID and a subsequent current-version observation.
- `evidenceUrl` references this repository's workflow run or an immutable `blob/<40-character commit>/docs/releases/<record>.json` that records the manually guarded upload. The coordinator must review that source/upload chain before supplying the record. The script validates the receipt shape, source fingerprint and live version match; it cannot authenticate an operator-authored historical claim merely from its URL. Never invent a receipt to unblock a release.

A verified baseline's `sourceSha` becomes the comparison base. A partial or blocked record retains its earlier `baseSha`; failed work therefore remains in the next plan. If a newer private service has been manually deployed, provide the same baseline with the newly verified prerequisite receipts. Do not falsely advance `baseSha` or label a partial release verified.

Private service publication and schema application remain manual. The workflow only automates the existing Pages and admin uploads. Before either upload it requires current security/catalogue receipts whose source fingerprints match the reviewed dependency bundles. Unchanged services retain their actual earlier source SHA and version. A changed backend or dependency cannot be explained away by keeping its previous version tag.

The workflow reads **only migration names** using Wrangler's `SELECT name FROM d1_migrations ORDER BY id` against the configured security/content databases. It compares the complete applied-name set with reviewed migration filenames, rejecting missing or unexpectedly newer entries. Source SQL SHA-256 values are recorded; the remote ledger does not contain SQL checksums, so the record explicitly does not claim remote checksum verification. A missing ledger, legacy schema without that ledger, missing read permission or unknown schema compatibility blocks automatic publication until a reviewed schema observation resolves it. Never create ledger entries or run SQL merely to make the check green.

For TECH-02, review/apply the additive 0010 migration through the existing process, publish the matching private security Worker, capture its real receipt, then dispatch the paired clients. For TECH-04, shared `server/auth.mjs` requires Pages and admin. Security maps also imports its `boundedBody` helper, while the intended change concerns return-path parsing. The transitive classifier flags security, but identical emitted runtime and configuration permit reviewed reuse without an unnecessary backend publication. Preserve send-attempt history and the manual email controls.

### Publication evidence and remaining acceptance

`plan` runs the existing destination/protection guards plus read-only Worker binding/version checks, records before versions and ledger state, hashes both built asset trees and checks prerequisite receipts. `publish pages` and `publish admin` check that source, current versions and built bytes still match the plan. The Pages canonical commit must match the reviewed SHA. Admin requires both the ID returned by the guarded Wrangler upload and the current observed version. Provider output is not saved in manifests.

`finish` repeats current-version, receipt, ledger and protection checks. Only complete required publication with matching evidence produces `state: "verified"`. An upload attempt followed by a lost acknowledgement remains `partial`, with its component and start time; inspect provider metadata before retrying. The workflow does not automatically retry writes. Pages and admin uploads are sequential, not atomic. A partial artifact preserves before IDs and any confirmed uploaded IDs; a subsequent plan includes outstanding changes and may safely republish from its then-current reviewed revision. Do not claim a resumed upload was merely a read-only confirmation.

`verified` describes publication provenance and guard results, not end-user acceptance. Independently verify the gated customer site, separate admin sign-in, authenticated shared preview, disabled payments and manual Preview update/Send update. No fixture, rollout or metadata observer may send email or edit saved catalogue/seasonal data. Keep those records authoritative. Physical print/QR acceptance remains separate.

Required credentials remain the existing scoped Cloudflare deployment credential and read-only GitHub token. Additional **read visibility**, if absent, is needed for Worker settings/deployments and the D1 ledger. Record the exact permission gap rather than broadening credentials automatically. No billing, plan, quota or CPU-limit changes are part of this work.

### Rollback rehearsal and order

The synthetic `rollbackPlan` fixture verifies current versions still match the release being reversed, puts Pages/admin client rollback before a private backend rollback, and always retains additive schema and send-attempt history. It refuses backend rollback without explicit compatibility evidence. This is a planning check, not an automatic rollback command or proof that an old client is compatible with a new protocol.

Before a real rollback, inspect the recorded before versions and current provider state, choose a reviewed client revision compatible with the current schema, rerun its guard/build/acceptance checks and release both affected clients. A backend rollback requires its own reviewed compatibility proof after clients are safe. Never down-migrate, restore customer tables, clear send attempts, reseed catalogue/seasons or overwrite an independently newer deployment. If any earlier source/version linkage is unknown, use a forward repair instead of guessing a rollback ID.

### Proving that a private runtime is unchanged

The credentials-free `private-builds` step uses Wrangler `deploy --dry-run` to bundle security/catalogue without uploading either. It hashes emitted executable/assets bytes, excluding source maps and Wrangler's generated README, and separately hashes the complete Worker configuration. It never hashes or reads production secrets. The plan verifies those local bytes again before using the comparison.

A manually established guarded receipt may additionally record `runtimeDigest` and `configDigest` from that deployed checkout's `dist/release/private-build-manifest.json`. When both match the reviewed candidate, a source-file change with no emitted/runtime-config change may reuse the observed existing private version. The manifest records the compatibility reason and preserves the original receipt/source SHA. Either digest missing or mismatching cannot use this exception. This is a byte comparison, not a claim of semantic compatibility between different executables. Build the historical comparison with its own committed lockfile and configuration, and review the guarded receipt; a hash reconstructed from unknown source does not establish deployment provenance.
