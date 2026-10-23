# Simple stock alongside Admin costs

23 October 2026. **Owner approved: “Approve the stock design and build”.** The operating and storage rules below are approved for implementation. Parallel execution was already selected. This authorises the build, not a claim of completed verification or deployment. The combined branch also contains the reviewed removal of manual artwork controls at `3069523ce84786260e3f5929c653299835c5f54c`.

## Intent and approach

Keep material costs and physical stock together in Admin. Owner decisions: editable pack prices/quantities, order overrides, purchased batches, low-stock visibility, manual stocktake, no wastage, and deduction only after explicit **Materials used** confirmation during production. Order placement and stage changes never deduct stock.

Link optional stock records through existing cost-entry UUIDs. A separate catalogue duplicates materials; Excel-only stock splits the owner's chosen Admin workflow. Reuse costing, saved order snapshots, Admin styling, session recovery and private Security D1. No forecasting, FIFO, warehouses or automatic purchasing.

## What changes

- Add a **Stock** tab beside Monthly figures and Cost settings, listing tracked materials, physical unit, on-hand quantity and editable low-stock threshold. Show a plain low-stock summary when quantity is at or below that threshold. Stock tracking is optional per physical cost entry, including packaging; courier charges are not stock.
- **Record purchase** captures received quantity in the fixed stock unit and the purchase's pack quantity/price snapshot, without allocating orders to batches. An explicit option updates future cost defaults; earlier receipts and saved order costs keep their prices. Purchases are not consumed order expenses.
- **Stocktake** records a counted balance and a required short reason. Save the difference as a movement, preserving the earlier record. Starting stock is entered this way; starting quantities and thresholds can be supplied after implementation.
- In order Costs, **Materials used** previews editable physical quantities and resulting balances from linked, included saved cost lines. Confirm all lines once. Cost confirmation is separate; later edits do not change consumption. No email, stage or payment change follows.

## Approved operating rules

Use thousandths for quantities; sheets remain whole. Once movements exist, the stock record's physical unit is fixed. Finance cost units remain editable. Suggest consumption only when the saved cost-line unit matches the stock unit. Otherwise require an explicit quantity in the displayed fixed stock unit; never infer a conversion. Names, prices, pack quantities and yield remain editable prospectively.

Reject a confirmation that would create negative stock, identify the affected material and require a receipt or stocktake correction. Never reduce requested use silently. Require initial stock setup for included tracked lines.

**Reverse materials used** requires a reason and restores exact recorded quantities once, after which a corrected confirmation may follow. If any affected material has a later stocktake, block the whole automatic reversal: adding old usage back would inflate the counted stock. Explain that the owner must check physical stock and record a new stocktake correction. Preserve the original deduction and count. Retries, stage moves, archive/reopen and expiry never move stock; corrections never rewrite history.

## Storage, safety and limits

Add three tables: `stock_items` (linked ID, fixed unit, balance, threshold, version), `stock_movements` (operation/material IDs, signed quantity, type, price snapshot, bounded reason, timestamp, reversal identity), and `order_stock_use` (temporary private order-to-operation link/version). Index item IDs and movement time/operation identities. Each journal operation contains bounded material lines, keeping multi-material use atomic without introducing another table.

Initially retain stock movements without automatic deletion. Keep names/contact details, order notes and artwork out; reasons must contain no customer information. Private order links expire under the existing six-month order schedule without deleting balances or reversing movements. Preserve 14-day artwork expiry. Record stock-history retention as a later business-policy review, without claiming legal compliance.

Reuse authentication, CSRF, version conflicts and in-memory drafts. Multi-material confirmations/reversals are atomic with unique operation identities and duplicate prevention. After a lost response, read/reconcile before explicit retry; never replay after sign-in. Reject stale versions, invalid quantities, overflow and oversized input.

Bound entries to 100, history pages to 50 rows, reason length and CSV reads. Export business stock records without customer information. No polling, new provider/package or paid feature. Check indexed D1 reads/writes/storage headroom before release.

## Narrow implementation and acceptance

Touch small stock calculation/client/UI/API modules, `Finances`, `OrderCosts`, Admin/Security route dispatch and one additive migration. Keep finance units editable; preserve storefront, artwork and mail. Match Admin/Security releases; retain additive records on rollback.

Synthetic fixtures block production writes/email. Verify purchases, whole sheets, mismatched cost/stock units, stocktake reasons, thresholds, overrides, historical prices, duplicates/lost responses, concurrent tabs, shortages, reversal/reconfirmation, later-stocktake reversal blocking, stage/reopen independence, order-link expiry, CSV and keyboard/phone layout. Owner design approval is complete. Evidence local verification, deployment and live acceptance separately.
