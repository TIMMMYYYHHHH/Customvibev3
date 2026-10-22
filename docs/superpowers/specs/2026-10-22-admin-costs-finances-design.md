# Admin costs and finances: first-stage design

Date: 22 October 2026. Status: proposed design for owner review, not implemented.

## Purpose and delivery order

Give Tim one simple place in Admin to maintain material prices, see the direct cost and expected margin of each order, review monthly figures and export them to Excel. This is an operational costing tool, not a replacement for statutory accounting records.

Owner decisions: editable pack prices and quantities; calculate unit costs; allow per-order changes; omit wastage. Deliver costs and finances first. Simple stock tracking follows later, with deductions only on explicit **Materials used** confirmation during production. Archive and reopen remain separate agreed follow-ups. Do not change the deferred artwork buttons.

Compared with keeping Excel as the only costing tool or building full batch inventory immediately, this first stage places routine costing alongside orders while keeping inventory, purchasing and accounting complexity out of the initial release.

## What Tim sees

Add one **Finances** navigation entry using the existing Admin shell, brand and controls. It contains a monthly order summary and a **Cost settings** tab. Add a **Costs** section to the existing order detail, without changing artwork preparation, printing or email controls.

### Cost settings

Tim can add, edit and deactivate named cost entries in four categories: materials, printing, packaging and courier. Nothing is prefilled with invented business prices.

Each entry records its name, category, pack price in rand, quantity per pack and unit, and a simple usage rule: per magnet, per sheet or per order. For a sheet-based entry, Tim enters magnets per sheet; suggested sheet use rounds up to whole sheets. Usage may be overridden on an individual order. A unit price can be represented as a pack of one.

Examples are illustrative, not seeded defaults: blanks per magnet; paper per sheet; printing charge per sheet; a box per order; courier charge per order. Paper must not be counted twice if the printing charge already includes it. One category may have several entries. Deactivation stops future suggestions without breaking past records.

There is no waste allowance, stock count, batch allocation, purchase register, supplier directory or restock alert in this stage.

### Per-order costs

Until Tim first opens and explicitly saves an order's Costs section, show an **Unsaved estimate** from current settings and the saved order quantity. Do not quietly backfill old orders, mutate records on a read, or suggest historical costs are known.

Saving copies the entry names, categories, pack prices, pack quantities, yield, suggested usage and calculated amounts into the order's own versioned cost record. Later settings changes never recalculate this snapshot. Tim can change usage or cost, omit an inapplicable entry, or add an order-only expense. Clearly distinguish **Estimated** from **Confirmed costs**, with explicit confirmation after review. Later edits return the record to Estimated until confirmed again.

Do not change customer prices, accepted order totals, payment status, artwork, expiry, stage or emails when saving costs. Existing orders retain their historical prices and unknown delivery charges. Customer delivery revenue is separate from actual courier expense, including when customer delivery is free.

Money is stored and validated in integer cents. Pack division retains its ratio until a complete cost line is rounded to the nearest cent, half up; totals add those rounded lines. Positive whole pack quantities and sheet yields are required. Usage supports up to three decimal places in the chosen unit, with whole sheets where applicable. Validate all calculations for non-finite values, overflow and negative amounts. Zero cost is allowed only when explicitly entered; missing is never treated as zero.

### Monthly figures and CSV

Default to the current calendar month in Africa/Johannesburg, with a month picker and one row per retained order created during that month. Show order reference, date, total magnet quantity, order stage, saved merchandise subtotal, saved customer shipping, order total, recorded direct costs, cost completeness and estimated margin.

For this first stage, these are **order-month figures**, not a cash-flow or tax report. Costs remain allocated to their order's creation month. Summarise order count, magnets, known order value and recorded direct costs; report missing/estimated costs and unknown historical shipping separately. Show margin only where customer total and a saved cost record are complete, and identify how many orders that subtotal covers. Mark estimated margins as estimates even when costs have been confirmed. Do not call direct-cost margin net profit or count purchases of an entire material pack as expenses consumed by one order.

Current orders remain Unpaid. Do not add a Mark paid control, infer receipt from delivery, or invent received revenue. The summary explicitly says that order value is not money received and payment recording is outside this stage. Show a projected margin, never realised profit, for unpaid orders.

CSV exports the selected month with matching numeric values, separate status/completeness columns and a cost-line detail export when needed. Default exports contain order references and figures, not customer names, email, phone, notes, locker details or artwork. Protect text cells against spreadsheet formula injection and quote CSV safely. Preserve missing values as blank, not zero. No automated email or external accounting connection.

## Storage, security and lifetime

Use the existing private Admin and Security service boundary and D1 persistence. Keep business cost defaults in dedicated versioned records, separate from the public catalogue. Keep per-order costs separate from accepted customer snapshots. Expose bounded, paginated authenticated reads and CSRF-protected saves. Reuse existing session recovery: preserve unsaved edits in memory, require an explicit retry after sign-in, and never silently retry a write. Reject stale versions rather than overwriting another tab's changes. Treat names and notes as untrusted text, never HTML.

Record changed amounts, timestamp and the authenticated actor identity available from the current system, without collecting new identity fields. Cost records must not enter customer responses, public content, emails or print files. Verify this separation in tests.

No new subscription, periodic polling, image storage or provider integration. Check existing account/database usage and estimate bounded reads, writes and storage before release. Existing allowances are a constraint, not a promise of unlimited free use.

**Retention boundary:** this stage does not approve a new finance retention schedule or privacy purge. Operational cost records follow the existing associated order expiry and are deleted with that order; defaults remain until edited/deactivated. Monthly reports therefore cover retained orders only and must state their available date range. Do not promise permanent historical reporting or use this as the sole tax record. A durable finance ledger, legal evidence retention, personal-data removal and offshore recordkeeping requirements require a separate approved design before extending storage beyond current order retention. Archive/reopen must not be used to bypass expiry.

## Integration and release

Keep logic small and separate: pure costing calculations; private settings/order persistence; Admin cost editor; monthly reporting/export. Reuse AdminChrome, workroom styles, session recovery and authenticated internal calls. Add migrations for dedicated records only after implementation planning and normal production approval. Preserve current orders and settings, original 14-day artwork expiry, six-calendar-month order history, website gate, Admin authentication, disabled payments and manual customer updates.

Use additive schema and a release order that leaves existing Admin operational during deployment. Confirm current source/dependencies and matched release validation before publication. Rollback hides the new interface/routes while retaining additive records; never delete financial or customer records as a rollback shortcut.

## Acceptance checks

- Pack-to-unit and whole-sheet calculations, fractional costs and rounding are correct. Missing, zero, invalid and overflow values behave distinctly.
- Per-order overrides affect only that order. Changing/deactivating settings preserves prior snapshots. Historical orders stay uncosted until explicitly saved.
- Free shipping still allows a courier expense. Unknown historical shipping remains unknown. Unpaid is never presented as received income.
- Monthly boundaries use Johannesburg time. Partial/missing costs are visible; summary and Excel-compatible CSV reconcile with individual records and resist formula injection.
- Unauthenticated access, CSRF failures, stale writes, expired sessions and oversized inputs fail safely. Private costs do not leak into public or customer outputs.
- Deleting an expired order also removes its operational costs. New records do not extend artwork or customer-detail lifetimes.
- Desktop and phone keyboard/layout checks pass in the existing Admin design. No test emails, production orders or paid upgrades are required for local verification.
- Live acceptance uses existing authorised records read-only unless a separate, explicit costing-settings/save test is approved for this feature. No claim of owner-entered costs or confirmed margins before that check.

## Later stages, deliberately excluded

1. Archive/reopen and clearer delivered/collected wording, with no automatic email, payment change or expiry extension.
2. Simple stock receipts and stocktake, low-stock banner and CSV. Record production usage once on explicit **Materials used** confirmation; neither stage moves nor archive/reopen deduct or replenish stock. Reversals require their own recorded action.
3. Longer-term finance retention and any manual payment recording, only after their separate decisions. No waste model, full accounting suite, FIFO/batch valuation engine, invoice generation or automatic purchasing in this design.

This document is ready for owner review. Implementation planning and code changes follow that review.
