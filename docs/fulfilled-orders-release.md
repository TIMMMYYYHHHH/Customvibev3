# Fulfilled orders and grouped table

Owner authorised building on 18 October 2026 after other admin work completed. Base: de40109, including retained-order search, proof confirmations, sign-in recovery and South African timestamps. Source reference: output/table-concepts/02-grouped-stages.png in the project workspace.

## Decisions and implementation

- Fulfilled means delivered or collected. Stage moves retain optimistic version checks and never send email or change payment status.
- Six calendar months from submission for unfinished order details. Fulfilled records expire six months from completion, clamped at month-end. Reopening retains the established deadline until fulfilled again.
- Artwork expires at the original 14-day deadline. Replacement uploads, review links and sessions cannot outlive it. Cleanup removes artwork manifests/personalised design values and proof capabilities, retaining minimal approval status/date with order details.
- Board and option 2 grouped Table share search, stage filtering, details and manual email access. Table is remembered locally. Latest three fulfilled orders are selected globally by completion date, with counted older history in bounded pages. Search reveals older matches.
- Fulfilled email thanks the customer, uses the current brand layout and truthful Unpaid wording. Google review CTA appears only when GOOGLE_REVIEW_URL is configured to an accepted HTTPS Google host. No URL is configured yet. Unique fulfilled-send reservation prevents repeat attempts after reopen, including uncertain sends.
- Runtime templates remain the sending source. The connected Resend account does not contain CustomVibe or its existing templates, so no draft was created in that unrelated account. A Resend dashboard copy is pending correct account access.

## Verification ledger

- Initial baseline failed only because fresh worktree lacked built assets; completed builds before full suite.
- Retention/stage/search tests were added failing, then passed. Month-end migration test caught and fixed invalid signed SQL date modifier.
- Proof cleanup test caught and fixed loss of ability to fulfil an already-approved order after deleting proof manifests.
- Fresh review found an active-page append resetting the fulfilled cursor. Fixed with tested mergeOrderPage; replacement refresh resets older disclosure.
- Full suite passed 283 tests before final merge-state regression; final run: 284/284 passed. Public build, SSR/prerender and admin build all passed.
- Browser synthetic history: 63 fulfilled, latest three shown, 50 older plus remaining page, older-reference search, expired artwork details, manual thank-you preview, remembered Table.
- Phone table uses an accessible horizontal scroll region. No production order mutations or email sends during verification.

## Remaining external checks

- Google Business Profile and real review link remain blocked under existing Hub task.
- Correct Resend account needed for dashboard template copy. Application template itself is implemented.
- Founders Hub interrupted-save modal persisted through recovery checks and refresh. Implementation-start comment remains unconfirmed; task status updates must not be claimed saved until reopened and verified.
- Actual Gmail phone rendering/owner recipient acceptance remains separate from browser preview.

## Deployment sequence

Apply migration 0008, publish security Worker, publish admin Worker, publish paired protected Pages revision. Preserve current bindings, gate, separate sign-in, manual send and disabled payments. Keep original local configs unchanged after temporary absolute-path staging. Never roll back to old runtime retention code after applying 0008 without a compatible forward fix.
