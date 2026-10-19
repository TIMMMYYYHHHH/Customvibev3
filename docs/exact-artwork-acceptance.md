# Exact artwork acceptance

TECH-27 closes a local evidence gap. The reviewed starting revision is `07702ece8f3e28a623da61e9f1bbe3fe1b0ca71c`. No production application code changes are required by this preparation.

## Reproduce

Use Node 22 and a private dependency installation. From the checkout:

```sh
node scripts/verify-exact-artwork.mjs /absolute/path/to/playwright/index.mjs /absolute/path/to/evidence
node --test tests/artwork-preparation.test.mjs tests/artwork-storage.test.mjs tests/order-proofs.test.mjs tests/order-archive.test.mjs tests/proof-access.test.mjs tests/admin-recovery.test.mjs
```

The browser runner needs loopback permission and installed Chrome. It creates a local Vite server using its own configuration, not Wrangler or production environment files. All backend outbound `fetch` calls throw. Browser request interception blocks origins other than that server. Only generated synthetic photos, reserved example.invalid contact/QR data, existing collection artwork and local fonts are used. The original synthetic photo and unsent basket remain in tab memory. Closing the browser and SQLite database discards service state. No mail provider, courier, payment or Cloudflare API is connected.

## One mixed order

| Item | Copies | Print files | Magnets |
| --- | --- | --- | --- |
| Photo, 90 degree clockwise, 1.25 zoom, selected focus | 2 | 1 | 2 |
| 3 by 3 puzzle, changed horizontal focus | 2 sets | 1 layout plus 9 tiles | 18 |
| Alphabet, selected A twice and Z once per set | 2 sets | 2 | 6 |
| Counting, selected 2 three times and 10 twice | 1 set | 2 | 5 |
| Business, editable name and real QR for example.invalid | 3 | 1 | 3 |
| Handy family week, five submitted entries | 2 | 1 | 2 |
| Total | | 17 | 36 |

The fixture calls the existing `createDesignItems`, `renderPhoto`, collection/Business/Handy renderers, `preparePrivateArtwork`, server order validation, manifest and snapshot preparation, real security artwork/order/proof services and `downloadOrderArchive`. D1 and R2 are replaced only at their storage boundary by SQLite and a disposable object map. A fixture adapter supplies the already established review session to the unchanged `ProofReview` component. That adapter does not establish evidence for public cookie, HTTP authentication or CSRF behavior. The focused existing proof-access tests exercise those protections separately.

## Verified assertions

- A stale puzzle preview changes when studio items are regenerated for the current focus. This exercises the actual regeneration function. It does not claim a deliberately corrupted basket preview is repaired by the upload helper.
- Coordinate-encoded synthetic source pixels independently check clockwise crop orientation at four sample points and every row-major puzzle tile centre. Print photos and tiles decode to 1200 by 1200 pixels.
- Every independently rendered export hash matches its upload manifest, uploaded bytes in local storage, current approved proof references and a real browser-downloaded ZIP extracted with Python's independent ZIP reader.
- Only selected collection masters are uploaded; copies reuse files. Proof quantities, Business/Handy entries and final print instructions preserve the exact 36-magnet order. Instructions identify the puzzle layout as preview only and keep whole-order notes off artwork.
- The customer approves revision 1 in the actual review component. A changed photo is uploaded through real replacement preparation and publication. The new revision clears old approval, rejects the old link, old approval and old download session, and blocks entry into production until revision 2 is approved.
- A working archive before reapproval is explicitly labelled `WORKING ARTWORK ONLY. DO NOT PRINT.` The code intentionally permits download for workroom review; download availability is not print eligibility.
- Revision 2 is approved through the review component. Its manifest digest is recomputed, replaced bytes differ, unchanged hashes stay equal, and all archive files match current proof hashes. The approved stage move leaves payment unpaid and does not create an email update or mark any notification sent.
- Recovery tests verify expired admin sessions only check sign-in and never replay writes. No actual customer email is sent by this journey.

`--corrupt-local-download` deliberately flips one byte in the fixture object map before downloading. The runner must fail on the independent archive hash comparison. This negative control has no production bindings.

## Acceptance still outside this fixture

The local result is separate from locked-production acceptance. It does not verify deployed bindings, real email delivery, real customer authentication in a browser, provider durability or restore speed, a physical print, a phone camera scan, or owner approval. Keep the website gate, separate admin sign-in, payments off, original 14-day artwork expiry and manual Preview update / Send update policy. Physical print readability and QR scanning remain owner acceptance.
