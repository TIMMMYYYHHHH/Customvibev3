# Manual customer privacy actions

Tim approved these two Admin controls on 24 October 2026. Their availability, publication and verification are separate from approval to act on a particular customer's records. See the feature spec and implementation plan under `docs/superpowers/` for engineering acceptance. This runbook does not certify legal compliance or fill the Deferred business particulars.

## Before either action

1. Check the request against the existing order and correspondence. Reply through the customer's known contact address if clarification is needed. A supplied reference or a matching email string alone is insufficient authority.
2. Identify the exact selected order and request. These controls do not search for or change every order belonging to a person.
3. Review what still needs keeping for an active order, support, dispute or an applicable record requirement. Resolve that purpose before confirming erasure. Admin does not make that decision for you.
4. Keep customer data, messages, screenshots, capabilities and case details out of Founders Hub. Record only a non-identifying category/date/outcome there if needed.

No routine identity-document collection, automatic export or automatic deletion is introduced. Requests are assessed when received, separately from the monthly correspondence housekeeping review.

## Correct customer details

Open the selected order and choose the customer-detail correction control. Edit only the saved name, email or phone, then review the old and proposed values. Saving does not send a message, change stage, reprice the order or extend artwork/order expiry.

The current contact is stored separately from the original submitted record. Admin reads and newly prepared manual messages use the corrected contact. Historical acceptance/recipient evidence remains an accurate record of what was submitted or sent at the time. Correcting an address does not send an old receipt again or unlock a duplicate stage email.

If Admin reports unfinished email activity, a changed record or another operation in progress, resolve that condition and read the current order before proceeding. After an uncertain response, check the current details rather than repeatedly pressing Save. Keep the tab open if sign-in expires so the unsaved correction stays available.

## Review early erasure

Use the selected order's privacy action to obtain a fresh preview. Review the exact application records, linked artwork files and original deadlines. The scope includes only proven associations. An ambiguous historical association requires review rather than guessing from customer names or addresses.

The application action removes the selected linked private records and artwork. It preserves stock balances and immutable business movement history. Minimal opaque anti-replay/outcome metadata can remain within the original bounds so an old checkout/resume cannot recreate the erased data. It contains no customer contact, notes or artwork after completion.

Mailbox copies, W3Forms submissions, Resend/provider records, backups/logs and files already downloaded need separate handling. A successful application erasure is not evidence that those copies were removed. The existing W3Forms Free dashboard displays a 30-day retention setting and an individual Delete control; actual deletion/purge semantics remain separately unverified.

Confirm the manual request/retention assessment and type the selected order reference only after checking the preview. The final action is irreversible for the selected application data. Building or publishing the controls does not authorise an assistant to press it on real customer records; obtain the actual record/action confirmation.

## Interrupted or uncertain erasure

An in-progress result is not completed deletion. Private records and artwork access are fenced while the operation is unfinished. Admin keeps the same operation identity so an interrupted response can be checked safely.

Use the status/reconciliation action first. Continue the same incomplete deletion only after reviewing its current state; do not start another operation or run SQL/storage deletion manually. Storage failure must not release retained quota or remove the remaining cleanup manifest prematurely. A completed result is repeatable as a status read and must not deduct/release stock or storage quota twice.

An unfinished upload or pending/uncertain email can prevent a privacy action. An expired upload lease alone is not proof its external write finished. Do not fake fulfilment, force expiry, reset a send attempt or change service settings to bypass a blocker.

An initial-email execution with an uncertain outcome retains an opaque outstanding authorization. Time alone does not clear it. Admin has no force-clear button: reconcile the original execution and provider facts through separately reviewed maintenance before changing that state. This conservatively blocks the privacy action, while the normal order workflow remains available.

## Release recovery

The added database schema does not by itself make older application versions safe after a privacy action. Older Security code does not understand the corrected-contact overlay or an in-progress erasure fence. After either control has been used, keep a privacy-compatible Security version and repair forward. Do not automatically restore the previous Security version or attempt to reverse the migration.

A pre-action compatibility check applies only before any correction or erasure has occurred. Release records must distinguish that bounded check from recovery after real privacy actions. An older Admin tab must not be treated as proof that an incomplete deletion has finished; use the current Admin and its explicit status check.

The updated initial-order caller and Security must be published together before the controls are used. An already-running older caller cannot gain the new dispatch authorization retroactively. Release verification must account for old in-flight submissions, then confirm the current Admin has been published and reloaded. Deployment acknowledgements alone do not prove that coordination or authorise an actual privacy action.

## Existing operating rules

The website gate, separate Admin authentication/external MFA, payment lock, manual Preview update/Send update and original retention schedules remain. A privacy action never books delivery, confirms payment, sends an email or changes physical stock. Tim's monthly received/sent and legacy-mail review remains the separate correspondence process.
