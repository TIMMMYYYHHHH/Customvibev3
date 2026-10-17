# Sitewide notice consistency

## Scope and current design rule

17 October 2026: Tim requested a wider check after rejecting the crop-warning "nail cards". Use inline text for warnings, errors, success messages and explanatory notices, matching the surrounding typography and spacing. Do not add tinted notice boxes or thick decorative side stripes. Preserve the approved structural product cards, forms, order details, dialogs, pricing controls and admin navigation/status strip.

## Audit and changes

| Surface | Finding and action |
| --- | --- |
| Designer, basket and checkout errors | Removed the shared peach alert box and thick left stripe. Kept readable berry text, wrapping, alert semantics and retry actions. |
| Checkout unpaid/payment notices | Removed mint/amber notice boxes. Kept truthful unpaid copy and payment-disabled behaviour. |
| Checkout completion | Flattened the "What happens next?" guidance. Kept the order-reference/details panel and existing actions. |
| Designer and basket pricing | Flattened the best-rate status, including responsive and context overrides. Kept the interactive pricing progress panel. |
| Admin artwork | Removed the error notice's orange background and thick side stripe. |
| Admin Orders | Flattened shared errors, success feedback and informational notes. Preserved accessible announcements, focus and recovery buttons. |
| Admin Store content | Flattened session guidance, image/save errors and saved confirmation. Preserved success icon and semantic colours. |
| Contact and sign-in | Existing inline error styles already match. No change to confirmation dialogs or authentication. |
| Home, collections/products, Help and policies | Reviewed shared templates/styles and browsed main page families. No matching alert-card pattern found. Existing approved structure retained. |
| Crop quality and capacity | Already corrected in 794f8fd; remains inline. See crop-quality-and-order-limits.md. |

After the changes, the only border-left declaration in active customer/admin CSS is the thin structural price divider, removed at the mobile breakpoint. It is not a notice.

## Verification

- Read-only second review identified completion and best-rate notices; these were corrected, and final review found no remaining actionable issues.
- Existing isolated form-check fixture: checkout unpaid/payment notices, validation failure, uncertain retry and successful completion checked. 1280px desktop and 393px phone views inspected. Synthetic requests only, no email or production records.
- Existing isolated admin fixture: invalid artwork ID, content-save success, stage failure and recovery controls checked. 393px phone error remains readable with full-width recovery buttons.
- Browsed home, collections, Help, privacy, terms, returns, shipping and empty basket; shared product, contact and authentication templates reviewed.
- 174 tests passed. Final public/SSR/prerender and admin builds passed after the completion/pricing CSS refinements.
- Existing business admin destination, website gate, authentication binding, manual-send availability and credential presence verified before publication.

## Publication

Application dcc5734 published through [protected Pages run 38990638802](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38990638802). Tests, public/admin builds and before/after protection checks passed. The business admin was published separately using the existing business-only access helper: version d591e786-6718-4adb-aae7-0b9b89309c28. Admin protection checks passed before and after. No configuration, database or email workflow changes were made.

Live 393px customer checks verified the designer's best-rate text, basket and checkout, including inline unpaid/payment guidance, crop warnings and order limits. Only a synthetic photo was loaded into browser memory. No order or email was submitted.

The admin session initially expired and the separate sign-in screen appeared as expected. Tim restored sign-in. Live 393px checks then verified the inline invalid-artwork-ID error and Store content session guidance, with no content saves, customer changes or emails. The invalid ID is rejected locally before any artwork lookup. This visual check is complete and is distinct from the separate, owner-paused admin availability investigation.

This work does not establish physical print acceptance, phone email acceptance, resolved admin availability, public launch approval or live payment approval. Those remain in their existing tasks.
