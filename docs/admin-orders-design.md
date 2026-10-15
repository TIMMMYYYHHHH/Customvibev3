# CustomVibe order dashboard design

Build the working order dashboard behind the existing admin sign-in while gated testing continues. Repair the standalone admin layout in the same change. This does not launch the store or enable payments.

## Owner workflow

Make Orders the admin landing page, with Store content and Request artwork available in navigation. Show four columns: New request, In progress, Ready to ship and Shipped. Cards show a short display reference, customer name, submission date, total magnets and unpaid status. Use a status control as well as any drag interaction so keyboard and mobile users can move orders.

Open a card directly to see customer contact details, preferred locker, submitted prices, items, status history and artwork. Each design shows its print quantity independently of file count. A photo ordered twice displays Print 2 copies; a 3x3 puzzle ordered once displays 1 set, 9 pieces. The proof is labelled Preview only. Provide individual downloads and a Download all ZIP with a print instructions file. Include each unique artwork file once and preserve print quantities in the instructions.

Show artwork previews only through authenticated endpoints. Expired artwork shows an explicit unavailable state. Keep existing reference links working; copying references is a fallback, not the main workflow. Old artwork-only requests remain available through that fallback without invented customer details or quantities.

## Manual customer updates

Offer Send update from each order. Show the recipient, subject and message for review before sending. Send only to that order's stored customer address, from orders@customvibe.co.za, with replies to orders@customvibe.co.za. Moving an order alone sends nothing. Keep automated messages deferred.

Record pending, sent, failed or uncertain delivery attempts and use durable deduplication. A timeout must not encourage a second message. Reuse the existing email budget across submissions and admin messages; decline sends when the budget is exhausted. During gated testing use owner-controlled recipients only. Local and preview environments must not send.

All requests remain visibly unpaid. Workflow stages must not imply payment, booking or accepted commercial terms. Production timelines and courier tracking are not fabricated. Before a real launch, agree the acceptance and delivery policies separately.

## Private order records

Capture validated order details in D1 alongside the existing private R2 artwork. Store only the customer name, email, phone, preferred locker, submitted item and price snapshot, artwork mapping, workflow state and minimal send/status history. Original photos and unsent drafts stay in browser memory. Do not put customer details in logs, analytics, local storage or Founders Hub.

Tim approved seven-day test order retention on 16 October 2026. Delete the new order details and history after seven days as well as the artwork. Block access at expiry and use hourly cleanup. Keep existing opaque retry records for their existing protection period. Production order-record retention remains a separate pre-launch decision.

Create one record per stable request ID before email dispatch and make retries reuse it. Separate receipt of a request from email-delivery state so a mail failure cannot hide a received request. Incomplete uploads do not become ordinary received orders. Reject changed payloads using the existing fingerprint safeguards.

The admin worker authenticates every list, detail, preview, download and mutation. Mutations require same-origin checks and CSRF protection; workflow changes use version checks to prevent conflicting edits. Keep internal service routes inaccessible from the public website. Use the existing business Cloudflare account, private bucket and free services, with bounded pagination and existing artwork/storage limits.

## Layout repair

The standalone admin entry currently has no shop-shell wrapper although shared resets, typography, section widths and several admin rules require that ancestor. Replace this accidental dependency with a deliberate admin shell and scoped styles. Preserve the CustomVibe fonts and palette, with readable neutral working surfaces and restrained colour.

Use clear navigation, consistent buttons and spacing, visible focus, legible forms and responsive order cards. At narrow widths, show one stage at a time or a stacked list instead of squeezing four columns. Keep Store content's catalogue, pricing, images, save and backup controls usable. No diagonal arrows or em dashes.

## Delivery and verification

1. Repair the shell and build the board/details locally using synthetic orders and non-personal artwork.
2. Add the additive D1 schema and submission capture, then authenticated list/detail/status APIs.
3. Add private previews and downloads with print instructions, then manual emails with budget and duplicate protection.
4. Verify authorization, CSRF, conflicts, upload failures, retries, email uncertainty, expiry, quotas and preservation of the existing content editor.
5. Check desktop and narrow layouts, keyboard navigation and expired sessions. Re-run single-photo, puzzle, multiple-photo and mixed-quantity examples through the board.
6. Publish only to the migrated gated environment after checks. Preserve preview sending off, payments unavailable and all migration rollback resources. Do not expose credentials or extend artwork retention.

Live runtime limits and physical print quality remain separate checks. The missing mixed-order crop/download confirmation is still pending; prior email/count checks passed.

## Approach choice

Recommended: extend the existing authenticated admin with D1 order records and the current private artwork service. This supports the requested board and manual updates without another platform.

A file-only board would be quicker but would still lack customer details and reliable print quantities. A separate commerce platform would add migration, integrations and possible costs, so it is outside this free-tier testing scope.
