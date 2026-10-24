# Manual Admin privacy controls

## Owner decision and purpose

On 24 October Tim approved adding the two proposed controls before public launch: correct saved customer name/email/phone and preview then confirm early erasure of the selected order and linked artwork/application records. This extends the already approved manual request procedure. Business particulars remain Deferred. It does not approve a real customer correction, deletion, message, payment or public launch.

The controls belong inside the existing order detail. Tim checks the request against existing order details and correspondence, uses the known contact address and resolves any continuing record purpose before acting. A checkbox records an acknowledgement, not automated identity or legal verification.

## Selected approach

Use narrow manually operated controls in the existing Admin, as selected by Tim. A case-specific off-application operation was the alternative discussed; a general privacy portal or automatic subject export is unnecessary. Reuse the current application, signed-in Admin protection and shared workroom styles. No new service, account or paid feature.

## Correction

- Edit only name, email and phone. Validate and normalise using the existing production contact rules. Keep an unsaved edit in tab memory and show saved/proposed values before confirmation.
- Persist a separate current-contact overlay. Do not rewrite the original snapshot, fingerprint, initial recipient evidence, accepted provider history, prices, payment status or expiry.
- Project current contact consistently into Admin detail, list/name search, newly generated print information and fresh manual-email previews. Advance a separate contact revision so an old email/privacy preview cannot silently use the previous contact. Preserve stage version/history and its existing once-attempt send identities.
- Do not reset the once-attempt Fulfilled policy or create an automatic email. Do not retarget an unaccepted initial receipt under its original provider idempotency key. Refuse correction while relevant initial/manual sends or upload/erasure activity remain unresolved.
- Return a fixed safe conflict/error and retain the draft when a stage/contact version changes or the response is lost. Re-read authoritative state before another write.

## Early erasure

- Operate on one selected order UUID and its proven linked records, never email/name matches across customers. Preview server-derived counts and original deadlines before any customer-record mutation.
- Scope includes order/contact/notes/history, order costs and private stock links, manual attempts/delivery associations, proof/revision/session/events, linked artwork requests/files and exact R2 object keys. Preserve stock balances and immutable non-customer business movement history. Treat legacy unlinked submission associations explicitly; do not guess their ownership.
- Display what will be removed, preserved and handled separately. Mailbox/provider records, backups/logs and downloaded copies are outside this control. Minimal opaque anti-replay state may remain only within existing original retention/replay bounds and must contain no contact, notes or artwork.
- Require manual entitlement/retention acknowledgement and typing the selected order reference. Bind a short-lived preview capability to the current Admin session, action, order/version, normalised correction or erasure graph, operation identity and expiry.
- Claim deletion atomically against the exact current graph. Refuse pending/uncertain sends and unfinished/in-flight artwork uploads. Fence new reads, writes, sends, resumptions and stale retries once deletion begins.
- R2 and D1 cannot be one transaction. Keep a durable operation with exact opaque object keys and counts; delete R2 first, then release retained quota once and remove linked D1 data. A partial failure stays visibly incomplete and resumable. Never force expiry or fake fulfilment to perform deletion.
- Reconcile the same operation after a lost response. Repeated identical confirmation returns its existing result; changed request/scope conflicts. Completed erasure must prevent a saved checkout or artwork resume from recreating the order during the original replay window.
- In-progress erasure must expose only a minimal resumable state in Admin, with no customer contact, artwork or stale download controls. Completion returns to orders with a clear result. No automatic retry of an irreversible action.

## Security and presentation

Preserve the existing server-side Admin session, external MFA configuration, origin/CSRF checks, bounded JSON, private no-store responses, safe errors and quota limits. New endpoints use only the private service binding. Never log supplied details, preview capabilities or object manifests. Existing customer Preview update and Send update remain accessible during normal operation and never run from a privacy action.

Use ordinary headings, labelled fields, flat existing buttons, readable mobile stacking, visible focus and safe dialog cancellation. No em dashes, diagonal arrows, tinted notice boxes or decorative alert borders. Technical operation IDs stay internal.

## Acceptance and release

Prove correction, preview binding, stale conflicts, full graph isolation, partial R2 failure/resume, quota-once behaviour, anti-replay, active-send/upload races, retained stock and zero email using disposable local SQLite/R2 and the real routed application. Check actual component interactions at desktop and narrow widths. Run the full application suite, Python checks, paired builds and notices. Independent reviewers assess the entire diff before release.

Publish only through a fresh reviewed release/schema packet; never replay consumed helper packets. Read-only live UI/config verification is distinct from a real correction or erasure, which is not approved by this feature request. The existing W3Forms factual qualification may join the normal shared-policy publication, while provider control gaps remain open. Business facts, public launch and payments stay separately outstanding.
