# Admin stock

Stock tracking is optional for physical entries from Cost settings. It does not change a customer order, its stage, payment or email. This is the approved build scope; deployment and live acceptance are recorded separately in `admin-stock-verification.md`.

## First setup

1. Save a material or packaging entry in Cost settings with its pack price, pack quantity and yield. Courier charges are not stock.
2. In Stock, enable tracking, choose the physical unit and low-stock threshold.
3. Count what is physically available and record a Stocktake with a short business reason. Enter zero if none is available. A purchase adds quantity but cannot establish the previous balance, so an initial stocktake is still required.

Stock units become fixed after movements. Finance cost units remain editable. If an order cost uses a different unit, enter its physical use explicitly. Admin does not invent a conversion. Sheets use whole quantities; other units support thousandths.

## Routine work

- Record purchase adds the received physical quantity and stores the batch's pack price/quantity. Select the separate option only when the purchase should update future cost defaults. Saved order costs and earlier purchases keep their original values.
- Save an order's costs before preparing Materials used. Check and adjust the proposed physical quantities, then explicitly confirm during production. Order placement, cost confirmation, stage changes, archive/reopen and expiry never deduct stock.
- A shortage blocks the whole confirmation. Check the physical count, record a real receipt or a justified stocktake, then review the order again. Do not invent a receipt to bypass the warning.
- Reverse materials used restores the exact recorded quantities once and requires a reason. If a later stocktake affected any material, the automatic reversal is blocked. Check the actual stock and record a new stocktake correction instead. Earlier usage and counts remain in history.

## Interrupted saves

Keep the page open. After a session or network error, refresh the current view through the offered reconciliation controls before deciding whether to retry. A retry must keep the original operation identity. Do not repeat a transaction in a second tab because the first response was lost. Signing in never automatically resubmits a write.

## History and export

The stock journal contains business material movements, not customer names, contact details, notes or artwork. Keep reasons free of customer information. The temporary order link follows existing order expiry; expiry never replenishes stock or removes balances/history. Stock history has no automatic deletion in this first version. Its longer-term retention policy remains a business review, not a claim of legal compliance.

CSV export is bounded to 200 pages, 50 operations per page and 4 MiB. It requires a stable journal revision and discards a partial or cancelled export. Retry later if another stock operation changed the journal during export. Retain finance exports separately as appropriate for business records.

## Release and rollback

The stock schema is additive migration `0014_admin_stock.sql`. Publish matching Security and Admin with the reviewed website artifacts through the existing release method, after fresh checks, headroom evidence and the required concrete release authority. No live material or order save is part of a read-only release check.

Rollback to the recorded prior application versions hides stock controls/routes while retaining all additive stock records. Never reverse stock, delete history or rerun a receipt as part of application rollback. Reconcile the actual recorded operation before any later retry.
