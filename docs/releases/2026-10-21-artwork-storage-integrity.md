# Stored artwork integrity, local candidate, 21 October 2026

Source baseline: `dc8e9328e2d6ea3c5ef3718525d61115d3af63d4`. This candidate is local only. No publication, provider/customer writes, real email, migration, dependency installation or website rebuild was performed.

## Reproduction and fix

After uploading synthetic artwork through the real Security handler, removing only its object leaves `ready=1`. The baseline returns success for retry and completion, then 404 for download. The client already resends its retained blob, so neither init nor the client needs a change.

`security/artwork.mjs` now checks current R2 `head` metadata before a ready retry succeeds and before completion, including repeated completion of already-finalized requests. Size and the standard write-time SHA-256 checksum must match the immutable manifest. Missing or mismatched metadata cannot succeed. HEAD failures remain safe errors; they are never interpreted as confirmed absence.

Only a confirmed missing object can be repaired. The supplied bytes still pass exact size, SHA-256 and JPEG validation, then use the existing atomic lease, three-attempt limit and reserved write allowance. The claim compares the observed ready state and lease, so a stale missing-object result cannot overwrite a newer repair. Completion rechecks original expiry and pending upload state when publishing its result. The original expiry is never extended.

Metadata calls use the existing monthly operation allowance. Completion reserves the whole manifest allowance atomically before reading up to 60 bounded metadata records. It conservatively retains the reservation if verification stops early. Fresh upload keeps its existing three-round-trip D1 bound. No whole stored image is downloaded or hashed by the fix.

## Checksum compatibility

The original private artwork introduction, `f4fa32429660908a079ce389537579ad94f662ca` on 15 October 2026, already supplied `sha256:file.sha256` to R2 `put`. The file history through the baseline retains this option. This uses the existing provider checksum rather than a new custom field. [R2 Workers API checksum documentation](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#checksums) describes SHA-256 as an ArrayBuffer when available. An ETag is not substituted for SHA-256. Unknown or checksum-less objects fail safely without replacement. Real provider metadata and live behavior remain unverified at this local stage.

## Local verification

Runtime: bundled Node `v24.19.0`. Existing dependencies were reused through an ignored local `node_modules` link to the release checkout; package-lock SHA-256 is `0197fdc17d83f64db466b9e34a0f152ff821c08ba511c657fb4507561f106267` in both checkouts. Existing matching baseline `dist/admin`, `dist/client` and `dist/ssr` artifacts were copied locally for imports and unrelated tests. They are baseline artifacts, not a new build of this candidate.

- First focused baseline: 10 passed, four module-load failures because dependencies were absent. With existing dependencies linked: 36 passed, one module-load failure due absent generated admin manifest. This was an environment setup failure, not a behavior regression.
- Red regression run before product edits: `node --test tests/artwork-storage.test.mjs tests/submission-api.test.mjs`, 40 tests, 24 passed and 16 failed as expected. Missing objects produced false 200 responses and order submission advanced before valid repair.
- Final focused run: `node --test tests/artwork-storage.test.mjs tests/artwork-api.test.mjs tests/submission-api.test.mjs tests/submissions.test.mjs tests/retention-recovery.test.mjs tests/retention-migration.test.mjs`, 68 passed, zero failed or skipped. Coverage includes exact bytes after repair, original expiry, healthy idempotency, already-finalized requests, invalid body/hash/size/checksum metadata, foreign/expired requests, quotas, ambiguous reads/writes, stale leases and completion during repair.
- Existing application command, `node --test tests/*.test.mjs`, run once on Node 24: 747 tests, 668 passed, 78 failed, one skipped. The full suite is not green. Of those failures, 69 release CLI fixtures require exact Node 22 runtime provenance, eight isolated Worker tests cannot listen on local sockets in this sandbox (`EPERM`), and one fallback CLI permission test cannot resolve the external dependency symlink. The retained task report lists every failed test by name. This run preceded the additional already-finalized submission variant, which passed in the final focused run. No production/test assertions were relaxed.
- Targeted runtime confirmation using the existing Node `v22.23.3`: `node --test tests/release-cli.test.mjs`, 75 passed, zero failed or skipped, including nested cases. This confirms the 69 release fixture failures on Node 24 were runtime provenance limits rather than this source change.
- The additional public-submission case with `finalized=1` was independently replayed against the untouched baseline handler: one test, zero passed and one expected failure (200 instead of 409). The candidate then passed both finalized variants. `git diff --check` passed.
- Review correction ART-INT-R1: the offline bucket now exposes SHA-256 only after a supplied `put` checksum passes validation, and clears a prior checksum when a later write omits it. The same-size corrupted object supplies its own valid SHA-256, distinct from the immutable manifest; the wrong-size object also has a valid checksum. The existing unavailable-checksum case now uses an actual checksum-less overwrite, retains the misleading ETag check, and verifies retry/completion both reject without replacement. Before the fixture fix, that case failed as expected (one test, checksum unexpectedly present); afterward the same six-file focused command passed 68/68 with zero failed or skipped. No tests were added or assertions relaxed, and `security/artwork.mjs` is byte-identical to reviewed head `4d20914e78b5829a61f00f46cd0a84b9b2c1ee63`.

## Scope and limits

Website and separate admin locks, payments off, accurate unpaid status, manual Preview update and Send update controls, validation, ownership, retry limits, quotas and original 14-day retention remain unchanged. The submission regression verifies no order reservation or mail dispatch while required artwork is missing, then a normal unpaid request after validated repair, using only injected synthetic provider responses.

The trusted internal `/orders/create` handler still checks the finalized flag, expiry and manifest without independently checking R2. The verified no-reservation/no-send boundary is the public submissions handler, including a previously finalized artwork request, which calls completion again before proceeding.

This verifies current object truth and can repair absence from bytes still held in the client tab. It does not provide an independent backup, recovery after both tab and primary-object loss, a cross-store transaction, or protection against deletion after a successful metadata observation. A checksum mismatch or unavailable checksum is intentionally not overwritten. Normal independent review, exact Node 22 CI and release verification remain required before publication.
