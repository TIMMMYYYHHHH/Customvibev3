> Historical implementation plan. The latest owner policy is [operating-mode.md](operating-mode.md): normal live behaviour behind the lock, payments off, manual customer updates without a test-address allowlist, and 14-day artwork/request retention.

# Private test artwork

Approved scope: R2 private bucket, authenticated admin downloads, seven-day testing retention, free allowances only. No launch, payments, preview sending or rollback cleanup.

## Design

Keep 1200px print crops and the existing JPEG quality. Send each file separately to the gated API after Turnstile verifies an upload manifest. Bind a short-lived signed upload grant to the form session and immutable manifest. Store opaque request/file metadata in the existing security D1 database and images in private Standard R2, accessible only through the security service binding. No public bucket URL, customer originals, personal filenames or customer contact fields in object metadata.

Admin sign-in gates request lookup and file downloads. Owner emails contain an admin request link instead of attachments; customer acknowledgements retain unpaid wording. Access expires seven days after initialization. Hourly cleanup removes expired objects and metadata; an R2 seven-day lifecycle is a backup (Cloudflare physical lifecycle deletion can lag). Downloads never extend retention.

Limits: 4,000,000 bytes/file, 32,000,000/request, 60 files/request and 30 design or collection entries. No fixed magnet quantity cap (owner decision, 17 October 2026); quantities and totals must remain valid safe integers. Atomically reserve at most 500,000,000 retained bytes, 100,000,000 new bytes/day and 500,000,000/month; 20 new requests/day, 400/month, five/IP/15min. Reserve at most 10,000 R2 read/write operations/month before use, with three write attempts/file. Cleanup uses free delete operations. Admission stops when quotas or dependencies are unavailable. Existing unrelated account use is outside these application quotas.

## Implementation plan

- [x] Write failing lifecycle, isolation, concurrent-quota, expiry and immutable-upload tests using SQLite and an in-memory R2 adapter. Implement policy, database migration and service-only storage handlers.
- [x] Add gated init/upload endpoints, session-bound grants and manifest-only order sending. Test wrong session, preview off, incomplete files, replay, corruption, expiry and partial email failures.
- [x] Update browser artwork preparation and resumable upload flow without reducing quality. Add owner-only admin request/download UI and accurate testing privacy copy. Test 3x3 and 5x5 public sample exports.
- [ ] Run full tests/builds, independent review, and private/gated runtime checks. Configure only the migrated account, verify lifecycle and access, then deploy through existing authorized mechanism if credentials permit. Never expose credentials or broaden access silently.
- [x] Update Founders Hub with verified setup and remaining live inbox/download checks.

## Execution notes

User explicitly requested implementation in the migrated checkout. Continue inline, preserving existing uncommitted email notes and diagnostic fixture. No repeated design permission round is needed for the approved flow. Any credential grant or new security-sensitive permission still requires action-time approval.

Verified locally: private 3x3 coast export 2.16 MB, 5x5 4.39 MB; generated high-detail 5x5 18.18 MB. Original email path rejects those puzzles; private path accepts without changing JPEG quality. Bucket created in migrated account, private Standard, enabled seven-day whole-bucket lifecycle. No deployed storage binding or production enablement yet. Migration helper is offline; destination-only hidden-input helper is scripts/artwork-access.py.

Retry review: definitive validation errors unlock the form. Signed resume tokens remain in tab memory, allowing fresh Turnstile and CSRF verification after form-session renewal; tokens bind the complete request and cannot read artwork. Live runtime CPU, inbox link and downloaded-print checks remain pending.

Final local checks: 100 automated tests pass; public and admin builds pass. Review findings fixed. Founders Hub parent and Cloudflare storage service updated; method-agreement subtask complete. Deployment is awaiting destination-only credential access. No live storage binding or sending-mode change applied.

Deployment progress: destination-only helper verified. Migration 0004 applied; security Worker deployed as 2ec50d7e-a1d2-427a-bbe1-36eb095913c9 with private R2 binding and hourly cleanup; admin Worker deployed as 8d67bc5e-5d91-46d7-843f-db6c85644c15. Fresh 100/100 tests and both builds pass. Production artwork flag prepared true; local/preview false. Pages publication and live owner request/download checks remain pending.

Verified deployment: GitHub run 38811478814 succeeded for f4fa324. Pages ed298f30-6362-4fde-89b0-64cc21e3d2e8 has gate on, sending on and artwork on. Both live environments fail closed; preview sending false and artwork unset (disabled), with explicit false in source. R2 public development URL and custom domains disabled; lifecycle remains 604800 seconds. Live admin browser shows sign-in. Direct API probes were blocked by the browsing/network layer, so do not claim those as origin authorization tests. Owner sign-in, real puzzle upload, inbox/download, CPU and print verification remain pending. See private-artwork-deployment.json.

Founders Hub: deployment recorded in existing Artwork & email parent and Cloudflare data service. Puzzle/print test subtask changed from Blocked to In progress, with live 3x3 verification still pending. Next owner step: sign in to https://admin.customvibe.co.za/artwork with the existing admin password, then open Artwork if login returns to the catalogue. No live emails or artwork uploads performed during this deployment turn.
