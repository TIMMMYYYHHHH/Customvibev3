# Cross-surface wording alignment

17 October 2026. Implements the approved order terminology across checkout, confirmation, help, admin labels, print instructions and customer-facing order errors. The six existing email messages already use this terminology and were reviewed without changing or sending them.

## Scope

- Orders are orders. Payment status remains Unpaid while payments are disabled. Removed later owner-acceptance language, with artwork, timing and delivery cost still requiring confirmation.
- Checkout navigation and actions now say Continue to checkout, Place unpaid order and Start another order. Retry identity and duplicate protection are unchanged.
- Corrected the photo FAQ to describe private chosen artwork and associated order records retained for 14 days, with originals and unsent drafts in browser memory.
- Admin uses Open order, Move order, Unpaid orders and Customer order email; quantities correctly show 1 magnet. Print instructions and order-related errors match. Technical API paths, IDs, database names and status keys remain unchanged.
- Website footer now uses From our tribe to yours. Contact success uses plain customer wording. Brand remains CustomVibe.
- Updated factual workflow references in the policy pages. Outstanding legal/business facts and policy decisions remain TODOs; this is not a completed policy review.

## Verification

Public, SSR/prerender and admin builds passed. Existing suite: 159 tests passed, including email layouts, stage/manual-send separation, duplicate protection and validation. The existing navigation assertion now checks Checkout.

Local browser checks used synthetic fixtures with all form calls intercepted: checkout and confirmation, unpaid messaging, desktop order details, the manual-update entry point/history and the 390px admin layout. No real email or production order was created, and no stage/history was changed.

Publication and live verification are recorded below after deployment. Intermittent availability and phone email acceptance remain separately Blocked at the owner's request.
