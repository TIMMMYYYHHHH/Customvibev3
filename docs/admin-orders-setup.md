# Gated admin order testing

Admin: https://admin.customvibe.co.za/orders

New submissions appear on the board. Earlier tests remain available under Artwork lookup. Test contact details, submitted item prices, stages and update history expire no later than seven days after capture; hourly cleanup deletes expired records. Artwork keeps its existing seven-day lifecycle.

## Manual updates

Run `node scripts/set-admin-email.mjs` in a local interactive Terminal. Enter the business Cloudflare token, existing CustomVibe Resend sending key, and owner-controlled test addresses at the hidden prompts. The script verifies the business account and admin Worker before storing RESEND_API_KEY and ADMIN_TEST_RECIPIENTS as Worker secrets. It does not save or print values locally.

Sending additionally requires the exact production admin hostname and ADMIN_SEND_ENABLED, SITE_GATE_ENABLED and SUBMISSIONS_ENABLED set to true. Missing configuration fails closed. Local fixtures never send. Preview/local public capture remains off, payments remain unavailable and the site password gate stays on.

Moving a stage sends nothing. Preview update then Send update dispatches one server-generated test message for that order version. Provider acceptance is not proof of inbox receipt. Failed or uncertain attempts are held for review, not blindly resent. Status changes do not extend retention. Shared email reservations remain capped at 80/day and 2,400/month.

## Owner check after publication

1. Send a fresh mixed test using an approved owner-controlled address.
2. Open its card without copying a reference. Verify photo quantity 2, one 3x3 set and 11 magnets.
3. Check previews and the ZIP instruction file. Confirm unique files and print quantities.
4. Move to In progress. Confirm no automatic email.
5. Preview then Send update once. Confirm inbox delivery and reply address.

Physical print quality, live seven-day expiry and production retention policy remain open. Do not remove retained migration resources without separate approval.
