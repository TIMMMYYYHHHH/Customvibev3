# CustomVibe local launch preparation

Approved scope: user brief dated 16 October 2026, all eight tasks. Work only in this migrated checkout at baseline fd15c55. No push, deploy, launch, real email, live order mutation, Cloudflare change or migration cleanup. Gate stays on; local and preview sending off; payments unavailable; free tiers; seven-day private test retention; originals and unsent drafts in memory. No secrets, em dashes or diagonal arrow icons.

Existing changes to preserve: docs/EMAIL_SETUP.md, docs/admin-orders-plan.md, docs/private-artwork-plan.md and untracked docs/private-artwork-deployment.json.

## Execution and evidence
- [x] Capture genuine baseline UI screenshots at 1440x1000 and 390x844 using synthetic local fixtures. Reuse fixtures and dimensions for after comparisons; add tablet 768x1024 checks.
- [x] Admin workflow: drag cards using existing versioned stage endpoint; touch/keyboard move menu; show save progress, retain prior position on failure, reload conflicts. Preserve history and no automatic mail. Remove normal artwork navigation, retain protected legacy routes.
- [x] Admin design: established Fredoka/DM Sans, cream/plum/berry/mint identity. Responsive board/detail/content; custom Store content controls with accessible keyboard behavior.
- [x] Repeat checkout: completion-only reset of submission, basket, checkout and studio memory. Failed or uncertain submissions remain retryable with the same internal identifier.
- [x] Language: Basket terminology, unpaid request versus accepted order, consistent contact/action labels across public/admin/email surfaces.
- [x] Checkout: clearer grouped fields, unpaid explanation, readable summary and confirmation at phone/tablet/desktop.
- [x] Contact: shared pre-footer section on public routes, no duplicate Contact page section; desktop/mobile link; accessible dismissible success modal, acceptance-only copy and no exposed contact references. Privacy information remains in policy.
- [x] Responsive pages and homepage line: inspect real layouts, repair decorative thread without obscuring content or removing intentional character.
- [x] Short references: deterministic readable reference separate from internal UUID; compatible existing references/retries and consistent confirmation/email/admin use.
- [x] Tests: meaningful regressions, security boundaries, duplicate/retry behavior, stage persistence/conflicts and reference compatibility. Full suite and public/admin builds. Browser keyboard, touch alternatives and visual comparisons.
- [x] Founders Hub: read existing board/services; update existing CustomVibe records at milestones and verify persistence. Release work remains open.
- [x] PDF and Markdown: eight outcomes, matched screenshots, tested behavior, limitations and morning checklist; render and visually inspect PDF.

## Review focus
Rapid stage changes and stale versions must not overwrite newer work. Lost responses must not duplicate requests or emails. Completion reset must not delete failed drafts. Short references must not replace internal storage keys. Modal dismissal must restore focus and keep navigation usable. No test fixture can send outside localhost.

## Progress
Baseline commit and existing edits inspected. Local browser fixtures are explicitly synthetic and cannot serve as evidence of live mail, physical print quality or live retention.

## Final verification

All eight areas implemented locally. Final suite: 136 passed, 0 failed. Public build, 21-page prerender and admin build passed. Browser retry/restart, stage drag/save/recovery, custom controls, modal/menu focus and responsive checks passed. 56 route checks at 320/390/768/1440px found no horizontal overflow. Founders Hub existing tasks/subtasks updated and verified after reload at revision 515; release work stays open.

Review pack: ../../../outputs/customvibe-overnight-review/CustomVibe - Overnight Review.pdf and Review summary.md. Genuine baseline evidence includes original pre-edit captures and replacement captures from the isolated original fd15c55 snapshot to correct capture dimensions/loading. No after image is used as a baseline.

No deployment, real sending, Cloudflare change, live order mutation, migration cleanup or commit. Physical printing, real delivery, live expiry, owner-only email setup and actual device checks remain pending. Independent review finding about removed-photo memory was fixed and regression-tested.
