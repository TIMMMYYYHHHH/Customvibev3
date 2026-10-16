# Approved email design implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Steps use checkbox syntax for tracking.

**Goal:** Apply the approved CustomVibe design to the six existing Resend messages.
**Architecture:** Shared pure email layout and static inline brand images. Existing validated order data and send paths remain authoritative. Use the same rendered message for admin preview and sending.
**Tech Stack:** JavaScript, table-based HTML, PNG Content-ID attachments, existing React admin and Cloudflare Workers.
**Spec:** Approved local docs/email-template-review preview and current docs/operating-mode.md.

## Constraints and review focus
- Payments remain disabled. Never turn the fictional paid example into a live payment claim.
- Manual stage sends, recipients, Reply-To, retention, quotas, versions and idempotency stay intact.
- Escape all customer text; keep private artwork out of customer email.
- Count puzzle magnets rather than artwork files; preserve legacy print attachments.
- Email images cannot depend on the gated website. Images-off text and plain text retain all essential facts.
- Keep HTML below inbox clipping thresholds, check long data and narrow screens.

## Task 1: Shared renderer and brand assets
- [x] Add failing tests in tests/email-design.test.mjs for dynamic escaping, quantities, payment truthfulness, private links, inline assets and legacy attachment preservation.
- [x] Implement server/email-layout.mjs, server/email-assets.mjs and email PNG assets, reuse from server/submission-model.mjs and server/order-update-email.mjs.
- [x] Update existing tests only where approved terminology or decorative attachments change the contract. Run focused and full tests.

## Task 2: Preview, verification and publication
- [x] Keep the existing admin plain-text preview and send controls. Render actual HTML in a local verification gallery without broadening admin UI or CSP scope.
- [x] Run public/admin builds; inspect actual fixture rendering at desktop and mobile sizes.
- [x] Independent review, resolve findings, commit only scoped files, deploy business admin and protected Pages.
- [ ] Verify live preview without sending or changing stages. Update Hub task/service records and verify persistence.

## Execution notes
Owner already approved implementation and routine deployment. Continue inline without another approval gate. Inbox delivery requires a fresh authorised example, not resending an accepted order version. W3Forms styling, Gmail saved replies, embedded customer thumbnails and gateway integration remain separately tracked.

Implementation scope decision: keep the existing admin plain-text preview, which already uses the exact sender renderer and all message facts. A new HTML viewer would broaden this design task into an admin interaction/security change; the local gallery provides visual verification.

Final review: one catalogue-pack quantity finding corrected. Regression observed failing then passing. Full suite: 144/144. Public/admin builds passed. Browser actual-render checks: six variants and long data at 390px, no horizontal overflow, all inline images resolved. No unresolved code-review findings.

Publication succeeded: application0967af7, protected workflow38938316022, admin Worker61e7f598-90eb-431c-a07c-64551802731e. Live signed-in preview needs a fresh owner sign-in; inbox rendering remains open separately.
