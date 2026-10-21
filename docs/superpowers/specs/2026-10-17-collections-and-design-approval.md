> Historical workflow note, 21 October 2026: any customer proof email, mandatory post-order artwork approval or approval-gated production requirement below is superseded by the current customer preview policy. Customers preview in the designer and checkout; no separate artwork approval follows the order. Retain useful artwork, quantity, privacy, expiry and physical print evidence. See [customer preview policy](../../customer-preview-policy.md).

# Magnet collections and customer design approval

> Superseded in part by the later owner decision on 17 October: practical collections are inspiration for the existing studio, with optional order notes. Separate template and Design it for me forms are removed. Proof approval and ready-made packs remain. See docs/collections-and-approval-verification.md for current scope and evidence.

Design for owner review, 17 October 2026. Implementation of the new flows follows review of this document. The separately authorised existing-preview bugfix can proceed independently.

## Outcome and agreed decisions

Customers can order business, QR, Wi-Fi and important-information magnets by personalising a template or asking CustomVibe to design it. Simple design work is included in the magnet price. Customers approve the exact final design before printing. Existing collections must have complete printable artwork and working ordering before their Coming soon labels are removed.

Keep the approved CustomVibe visual style, 7.5 cm square format, existing website password gate, separate admin authentication, disabled payments, manual customer status emails, 14-day private artwork/request retention and free-tier limits. No em dashes, diagonal arrows or thick accent-stripe notices.

## Customer experience

Add Business & work and Home & handy filters within Magnet collections. Start with Business magnets, Scan to connect, Wi-Fi made easy and Good to keep handy. Each product offers Personalise a template and Design it for me.

Personalise a template opens a simple form with a live square preview. Fields depend on the design: name, short text/contact information, optional logo, URL, or Wi-Fi network and password. QR codes are generated locally from validated details. Use a few curated colour/layout choices, bounded text and clear overflow feedback. Keep codes high contrast with a clear margin. Offer an eye control for password visibility while editing, and explain that a printed Wi-Fi password or QR code shares access with anyone who can read it. No password or QR payload enters analytics or logs.

Design it for me collects the customer's desired wording, style, quantity and contact details, with an optional normalised logo/reference attachment. Reuse the basket and unpaid checkout. Label the item as awaiting design, and retain submitted instructions privately for the same 14-day period. Do not turn a general contact email into an order, or imply an unfinished design is ready to print. Unsent drafts and original uploads remain in browser memory.

Simple design means arranging supplied wording, a supplied logo and a QR code in a supported layout. The website promises simple design included, without inventing a fee or promising logo creation. More involved requests are discussed before work or additional charges are agreed.

## Ready-made collections

Complete the existing six collections: alphabet A-Z (26), numbers 1-10 with matching dots (10), first words apple/tree/sun/cat (4), green/blue/pink/orange colours (4), the four existing encouragement messages (4), and the four existing thank-you/gift messages (4).

Create versioned print masters for every included magnet. Current promotional collages are not print masters and do not include the entire alphabet/counting range. Use clean artwork consistent with the current palette and type. The product page must show all included designs, exact magnet count and price. Pin a manifest version to every order so later catalogue edits cannot alter purchased artwork. Preview, basket, admin and downloads must agree. Make availability conditional on complete validated print assets and configured pricing.

Owner-confirmed pricing: use the existing quantity tiers across all individual magnets, counting every pack magnet and puzzle piece towards the total (currently R50 single, R250 for six, R400 for ten, then the existing quantity calculation). Display a pack's standalone price and explain that mixed-basket quantities can reduce the total. No separate simple-design fee or independent pack price applies.

## Approval before printing

Use one private customer review page with Approve for printing and Request changes. It shows the complete final design set, quantities and revision number. Approval is explicit, never inferred from opening the page, submitting a brief, placing an order or making payment.

Admin can prepare and upload a complete proof revision using the existing artwork validation/storage pipeline, preview it, and manually send its review link through the existing Preview update and Send update controls. Self-service and ready-made orders can seed a proof from their submitted/generated files, while assisted orders require finished artwork. Publishing a proof or moving a stage never sends email automatically.

Approval records the exact immutable artwork manifest digest, quantities, revision and timestamp. A replacement revision invalidates the previous approval atomically. Old links cannot approve a newer or expired version. Admin shows Awaiting design, Awaiting approval, Changes requested or Approved beside the order. For new orders covered by this feature, the server prevents entry to printing/production or later fulfilment stages without approval of the current revision. Historical orders retain their existing behaviour and must not be silently reclassified. Approval permits printing; it does not claim payment, printing, courier booking or dispatch has occurred.

The review link is a random, revocable capability stored only as a hash, scoped to one order and its current proof. Exchange a fragment token for a short-lived HttpOnly proof session. Require a separate CSRF token for approval/change requests. Preserve the site password gate and return customers to the review page after sign-in. Return only the relevant proof images and quantities, never private contact information or admin history. Use no-referrer, private/no-store and noindex; exclude review pages from sitemaps. Customer review access is a new explicitly scoped exception to admin-only artwork access, not public bucket access.

## Implementation boundaries

- Extend the current catalogue schema, content migration and admin editing with product kind, pricing mode and print-manifest version. Read and merge current production catalogue revisions before saving; preserve unrelated owner edits.
- Extend basket preparation and server submission validation together. Preserve stable item IDs, design mode, template version, bounded details/brief, artwork and quantities in the private order snapshot. Current non-photo items require zero files, so UI-only changes are insufficient.
- Add proof revision/state/event tables next to orders. Reuse private R2 and immutable artwork manifests; add trusted admin proof upload/publish routes and narrowly scoped customer review routes.
- Cap every revision to the original order expiry. Aggregate revisions against per-order and existing service quotas, rather than resetting a new 14-day window or bypassing file/byte limits. Hourly cleanup removes proof records, capabilities and files consistently. Expired reads fail immediately even before cleanup runs.
- Extend manual email preview/send with the exact proof revision. Preserve duplicate-send prevention and truthful unpaid wording. Do not change the current order acknowledgement/payment workflow as part of this work.
- Update help/privacy text, operating rules, repository instructions, service records and Founders Hub to reflect customer-scoped proof access and approval before printing.

## Verification and delivery

Verify complete A-Z and 1-10 assets, all four-item packs, template field validation and text fit, QR decode from exported 1200-pixel files, pricing consistency, basket edits, unchanged submitted artwork, private admin download, duplicate submissions, revision races, stale/revoked/expired tokens, CSRF, requested changes, approval and server-side production blocking. Test 320px, phone, tablet and desktop layouts, including no puzzle overflow and no dotted edge artefacts.

Run the repository tests and public/admin builds. Local and preview tests must not send real messages or change production customer records. Publish through the existing protected deployment process, retaining all gates and disabled payments. Verify deployed version and saved catalogue state. The existing D1 availability/hosted CPU issue remains separately tracked and must not be concealed by mock success.

Physical 7.5 cm print readability and QR scanning on an actual magnet remain an explicit owner acceptance step; browser decoding alone does not establish physical print quality. Keep the parent task open while required approval, physical checks or live acceptance remain unfinished.

Implementation review clarification: a complete revision can reuse unchanged immutable files from the same design position. Only replacements consume new file storage. Admin upload identity and completed slots remain in browser memory across retries; a lost publish response cannot create another revision. Custom fixed-price collections retain their per-pack face count and receive generic numbered final artwork. Wi-Fi captions preserve literal spacing inside quotation marks, and URL length validation also checks the normalized encoded address in the editor.
