# Collections and Design Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fulfil all existing collections and the four new practical collections through self-service templates or assisted design, with approval of final artwork before printing.

**Architecture:** Extend the existing basket, validated order snapshots and immutable private artwork store. Add versioned print manifests and order proof state, with narrow customer review access and server-enforced approval. Fix the independent existing rendering bugs separately.

**Tech Stack:** React 19, Vite 6, Node tests, Cloudflare Pages/Workers, D1 and private R2. Use a locally bundled open-source QR encoder and decoder for tests; no external QR service.

**Spec:** `docs/superpowers/specs/2026-10-17-collections-and-design-approval.md` (owner approved 17 October).

## Global Constraints

- Keep the approved CustomVibe visual style, 7.5 cm square format, existing website password gate, separate admin authentication, disabled payments, manual customer status emails, 14-day private artwork/request retention and free-tier limits.
- No em dashes, diagonal arrows or thick accent-stripe notices.
- Simple design work is included in the magnet price. All individual magnets, including pack contents and puzzle pieces, share existing quantity pricing.
- Original uploads and unsent drafts remain in memory. No secrets, Wi-Fi values or customer content in logs, analytics, public assets or Founders Hub.
- Preserve current work from other chats. No new arbitrary magnet/entry caps. Existing 60-file, 4 MB/file, 32 MB/request and global storage/operation quotas remain.
- Do not send real emails or create/change production customer orders from local fixtures or preview deployments. Existing provider investigations remain separately scoped.

## Review Focus

- Long names, punctuation and Unicode must remain readable or show specific field errors, never silently clip print artwork (tasks 1, 2).
- Wi-Fi values containing backslashes, semicolons or colons must decode correctly; URL protocols must be restricted (task 1).
- Mixed baskets and copied packs must use exact magnet counts and server-calculated totals, including basket edits (tasks 2, 3).
- Two admin tabs or a stale customer page must never approve or print replaced artwork (tasks 4, 5, 6).
- Uploading a later revision must not extend retention, bypass quotas or leave earlier files accessible after expiry (tasks 4, 7).

### Task 1: Printable designs and template contracts

**Files:** Create `src/designs/catalogue.mjs`, `src/designs/templates.mjs`, `src/designs/render.mjs`, `tests/design-artwork.test.mjs`; add QR dependencies and lockfile entries only when required.

**Interfaces:** `collectionDesigns(id) -> [{id,version,template,values}]`; `validateTemplate(id,values) -> normalizedValues`; `renderDesign(design,{size:1200}) -> Promise<{url,sha256}>`; `qrPayload(template,values) -> string`. Rendering returns flat 1200-square baseline JPEG print artwork without glossy UI overlays. Built-in pack IDs remain alphabet/counting/words/colours/reminders/thanks; new IDs business/qr/wifi/information.

- [ ] Write tests asserting alphabet has 26 unique A-Z designs, counting has 10 matching dot counts, remaining packs have their four specified designs, and QR payloads escape `;`, `:`, `\\` correctly. Assert unsupported URLs and overflowing fields are rejected.
- [ ] Run `node --test tests/design-artwork.test.mjs` and confirm these fail before implementation.
- [ ] Implement deterministic complete vector/text masters using current fonts/palette; render with loaded fonts to the existing 1200-square JPEG requirements. Create curated layout variants and safe text limits. Generate QR locally with a four-module clear border and dark-on-white modules; keep full payload out of logs.
- [ ] Decode rendered QR outputs in tests, verify 1200-square JPEG metadata, all pack contents and text fitting. Run focused tests and inspect a local contact sheet at print proportions.
- [ ] Commit only artwork/template modules, tests and required dependency files.

### Task 2: Catalogue schema and shared pricing

**Files:** Modify `src/content/model.mjs`, `src/commerce.mjs`, `src/content/Admin.jsx`, `data/site-content.json`, `src/CollectionPrice.jsx`, `tests/content.test.mjs`, `tests/commerce.test.mjs`; create `src/designs/products.mjs` and `tests/collection-products.test.mjs`.

**Interfaces:** `productMagnetCount(product) -> positiveInteger`; `isTemplateProduct(product) -> boolean`; `printManifest(product) -> {version,designs}` from task 1. Add `pricingMode:'per-magnet'` and `printVersion` to built-ins; preserve legacy custom fixed packs. `summarize()` returns the existing shape with all shared-price magnets included in `pricedQty` and no double-charging of packs.

- [ ] Test that one alphabet pack plus one four-magnet pack totals 30 magnets and R1,200 at current tiers; two alphabet packs total 52 magnets and R2,080. Verify changing quantity/removing a pack recalculates both browser and server consistently. Available built-ins require a complete matching print manifest.
- [ ] Run the focused tests and confirm the missing behaviour fails.
- [ ] Implement schema validation, shared counts/pricing, two new groups, product metadata and admin fields. Preserve existing product IDs and existing independently priced admin-created products. Keep final production availability changes until the whole ordering path is verified.
- [ ] Run focused content/commerce tests and check no backwards price boundary or unsafe integer acceptance.
- [ ] Commit the schema/pricing deliverable.

### Task 3: Both design paths through the existing basket

**Files:** Create `src/designs/DesignStudio.jsx`, `src/designs/design-studio.css`, `src/designs/state.mjs`; modify `src/App.jsx`, `src/ProductPage.jsx`, `src/storefront/ProductDetails.jsx`, `src/storefront/MagnetCollections.jsx`, `src/CollectionReview.jsx`, `src/Checkout.jsx`, `src/order-artwork.mjs`, `server/submission-model.mjs`, `server/order-record.mjs`, `server/email-order-summary.mjs`, `src/routing.mjs`, `src/seo.mjs`; tests `tests/design-submission.test.mjs` and related existing order tests.

**Interfaces:** Basket design items carry stable `id`, catalogue `kind`, `qty`, `designMode:'self'|'assisted'`, template/version, validated `values`, bounded `brief`, and in-memory normalized artwork. `prepareOrderItems()` and `validateOrder()` preserve these fields and file mapping. A self template contributes one magnet per copy; pack files match the complete manifest; assisted entries can have no final print file yet and remain awaiting design.

- [ ] Test that structured values, mode, brief and stable IDs survive validation/snapshot creation; invalid template versions and forged prices reject. Test retries preserve fingerprint and approved rendering bytes. Reference files are not mistaken for finished print masters.
- [ ] Run the focused tests and confirm failures.
- [ ] Build Personalise a template and Design it for me actions, forms, live previews, file normalization, editable basket items and shared checkout integration. Reuse existing upload/service error and retry handling. Do not persist browser drafts. Explicitly explain Wi-Fi sharing and simple design included. Present every pack design on product details.
- [ ] Verify mobile/keyboard flows, text overflow, blank/invalid fields, quantity editing, all pack artwork, one normalized logo and assisted briefs using local fixtures with sending disabled.
- [ ] Commit the end-to-end submission deliverable, still unpublished until approval controls are ready.

### Task 4: Immutable proof revisions and approval rules

**Files:** Create `security/proofs.mjs`, `security/migrations/0007_order_proofs.sql` (use actual existing migration directory and next available sequence if changed), `tests/order-proofs.test.mjs`; modify `security/index.mjs`, `security/orders.mjs`, `security/artwork.mjs`, `server/order-record.mjs`.

**Interfaces:** Internal proof actions `prepare`, `publish`, `detail`, `approve`, `changes`, `revoke` operate on `{orderId,expectedVersion,revision,digest}`. Store immutable revision manifests mapping stable item IDs, filenames and quantities; current state stores current/approved revisions and digest, capability hash, expiry and events. `approvalRequired` is pinned on new snapshots; existing legacy snapshots remain compatible. `canProduce(order,proof,now)` requires current unexpired approved digest and revision.

- [ ] Test approval of current complete revision, rejection of wrong/stale revisions, atomic invalidation on replacement, no production-stage transition before approval, legacy-order compatibility, duplicate approval, changes requested and optimistic concurrency.
- [ ] Run tests against local D1-compatible fixtures and confirm failures.
- [ ] Add schema and immutable revision operations. Cap proof uploads to original expiry, validate complete item manifest and final file hashes, aggregate all revision bytes/files within order/service quotas, and enforce `canProduce` in the server status mutation for in_progress and later fulfilment stages. Seed complete self/pack proofs from accepted private files without auto-approving them.
- [ ] Verify racing publish/approve/status mutations and stale snapshots. No UI-only production guard is accepted.
- [ ] Commit proof persistence and enforcement.

### Task 5: Private customer proof page

**Files:** Create `server/proof-api.mjs`, `src/ProofReview.jsx`, `tests/proof-access.test.mjs`; modify `functions/_middleware.js`, `server/auth.mjs`, `src/App.jsx`, routing/SEO and prerender exclusions.

**Interfaces:** `/proof` UI; `/api/proof/session` exchanges fragment capability for HttpOnly scope; `/api/proof`, `/api/proof/files/:slot`, `/api/proof/approve`, `/api/proof/changes` serve only that order/revision. Tokens are random capabilities stored hashed, bound to expiry and revocation generation; writes require scoped CSRF and same-origin validation.

- [ ] Test no access with only a site-password cookie, wrong-order tokens, stale/revoked tokens, expiry before cleanup, CSRF, forbidden file slots, no customer PII/admin history in payload and approval without an actual revision being viewed.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the review session and page with full proof set, revision, quantities, explicit approval checkbox/action and change request form. Keep the existing site gate and safely preserve `/proof` return location. Apply no-store/no-referrer/noindex to page, session and image responses; never place tokens in query strings or logs.
- [ ] Verify the gate-to-review journey, invalid/expired link recovery, accessibility and 320px layout against local data only.
- [ ] Commit customer review delivery.

### Task 6: Admin proof workflow and manual review emails

**Files:** Create `admin/OrderProof.jsx`, `admin/proof-api.mjs`; modify `admin/OrderDetail.jsx`, `admin/Orders.jsx`, `admin/orders-api.mjs`, `admin/order-mail.mjs`, `admin/order-archive.mjs`, `admin/worker.mjs`, `server/order-update-email.mjs`; tests `tests/admin-proofs.test.mjs` and existing email/archive tests.

**Interfaces:** Admin prepare/upload/publish binds a complete revision to the order. Detail includes current proof status/history. Existing Preview update and Send update render/send the review link for the exact revision with a dedicated idempotency key; sending is always an explicit action. Archive creation takes current manifest revision and labels working versus approved print files.

- [ ] Test invalid/unapproved uploads, pending/changes/approved states, duplicate send, preview/send revision mismatch, stale admin version, no automatic send on publish/status/approval and archive selection of the exact current approved version.
- [ ] Run failing tests, then implement proof management, preview, manual sending and status visibility with existing authentication/CSRF and quotas. Require finished artwork before assisted proof publication. Do not send a proof containing incomplete packs.
- [ ] Run admin/email/archive tests and local desktop/mobile workflow checks without live sends.
- [ ] Commit admin integration.

### Task 7: Retention, disclosures and deployment

**Files:** Modify cleanup tests, `security/orders.mjs`, `security/artwork.mjs`, `src/policies.mjs`, `src/HelpContent.jsx`, `AGENTS.md`, `docs/operating-mode.md`; create `docs/collections-and-approval-verification.md`. Update live catalogue only via revision-safe existing management flow.

- [ ] Test late revision expiry, quota release exactly once, revoked sessions, orphan uploads and cleanup of proof records/assets at original order deadline. Run tests before changing cleanup.
- [ ] Implement cleanup and the approved customer-access exception in disclosures. Keep publication and printing status truthful; preserve manual sends and disabled payments.
- [ ] Run `npm test`, `npm run build`, `npm run build:admin`, focused browser checks and independent security/correctness review. Fix all material findings.
- [ ] Commit verified implementation, deploy additive schema and required private Workers to the existing business account, then Pages through the protected workflow. Read the latest catalogue and merge only approved collection fields with revision checks. Never deploy from the stale personal-account checkout.
- [ ] Verify deployed versions, gates, disabled payments, current catalogue, both customer paths, approval protections and admin downloads. If provider availability blocks a live check, preserve the failure and track it rather than claiming success. Real email/order verification needs the user's specific test details when existing session authorisation does not cover it.
- [ ] Record saved Hub changes, published evidence and any remaining physical print/QR owner acceptance. Keep the parent open until every required subtask/check is complete.

### Independent repair: Existing magnet previews

**Files:** `src/MagnetPreview.jsx`, preview rules in `src/storefront/storefront.css` and dedicated local fixture/regression test.

- [ ] Reproduce puzzle card overflow and rotated-edge aliasing from the user's screenshots.
- [ ] Contain square puzzle previews inside their art areas without stretching and smooth the edge-lighting gradients while retaining the glossy magnet finish.
- [ ] Verify homepage/collection/puzzle/detail previews at phone and desktop widths; run full existing tests and public/admin builds.
- [ ] Review, commit and publish independently of the new feature if its implementation is still underway. Verify live screenshots and mark only the preview-repair subtask complete.
