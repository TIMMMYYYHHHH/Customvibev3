# Maximum artwork request measurements

17 October 2026. Application baseline: `be70842` (product change `da7c5d5`). Founders Hub: Artwork & email > Finish gated form and order testing > Measure maximum artwork requests on the free runtime.

## Current result

Local browser preparation and local Cloudflare runtime/storage measurements pass. **Hosted maximum-request CPU, memory and latency acceptance is still open.** Local wall time is not Cloudflare CPU time and does not prove that the Free plan's resource limits will be met. No product code, production setting, service plan, order, artwork object or email was changed by these measurements.

The existing protections remain: 60 files, 4,000,000 bytes/file, 32,000,000 artwork bytes/order, 150,000-byte private-order bodies, 40,000-character saved records, 500 MB retained artwork, 100 MB new artwork/day, 500 MB/month, 20 new requests/day, 400/month, 10,000 reserved R2 operations/month and 14-day retention. There is no fixed entry or magnet quantity cap. Copies reuse files.

## What already existed

- Browser rendering at 1200px per print tile, smaller preview proofs, metadata stripping and SHA-256 before submission. Original images stay in browser memory.
- Sequential per-file uploads with a 60-second timeout per upload. The 32 MB order is not sent as one body to the storage Worker.
- Atomic storage/quota reservation, immutable verified uploads, upload leases, bounded reads, finalisation after all files are ready, private downloads and retry protection.
- Unit/integration boundary tests and a local artwork-size diagnostic. Earlier evidence did not establish maximum-size hosted runtime performance.

## Browser measurement

Actual `renderPhoto`, `preparePrivateArtwork` and `validateOrder` ran in Chrome 155 on this Mac. These are single measured runs, not performance guarantees or actual-phone acceptance. Photo variants share the sample source; this does not measure the memory required to decode 60 different maximum-resolution originals.

| Scenario | Files | Prepared artwork | Preparation + validation | Result |
| --- | ---: | ---: | ---: | --- |
| 60 photo designs | 60 | 22,056,000 bytes | 2.064 s | Accepted |
| Six 3x3 puzzles | 60 | 12,974,086 bytes | 2.025 s | Accepted |
| Two 5x5 puzzles + eight photos | 60 | 11,804,836 bytes | 2.144 s | Accepted |
| 60 high-detail synthetic photos | Stopped at design 30 | Exceeds 32 MB | 2.116 s | Rejected before upload |
| 61 photo designs | 61 requested | None prepared | 0.0004 s | Rejected before rendering |

Puzzle preview preparation separately took 0.287 and 0.306 seconds. Largest prepared file in the accepted cases: 1,045,809 bytes. Raw evidence: [browser.json](artwork-runtime-results/browser.json). A second run after the fixture's explicit boolean validation argument produced the same byte counts and outcomes, with accepted preparation times of 2.111, 2.330 and 2.810 seconds. See [browser-repeat.json](artwork-runtime-results/browser-repeat.json). The two runs demonstrate variation, not a statistical latency distribution.

Memory is not measured. In particular, a 5x5 export builds a 6120px square proof canvas, about 149.8 MB of raw RGBA pixels alone, plus source/tile buffers. This is browser memory, not Worker memory. Actual-phone memory testing remains useful; do not describe the desktop result as phone-safe.

## Local Worker measurement

The real `artworkService` ran in local workerd with disposable D1 and R2 bindings. External fetches were blocked by the fixture. Synthetic JPEG entropy padding exercises byte handling and structural validation, not decoding or print quality. Padded zero bytes are not a worst-case JPEG marker-density CPU test. The fixture calls the private storage handler directly; it does not benchmark the public Pages authentication, Turnstile, saved-order or email pipeline.

| Scenario | Reservation | Upload total | Upload median / p95 | Finalisation |
| --- | ---: | ---: | ---: | ---: |
| 60 files, exactly 32 MB | 24.61 ms | 1,215.99 ms | 16.61 / 33.80 ms | 2.79 ms |
| Eight files, exactly 4 MB each | 7.18 ms | 705.57 ms | 85.22 / 139.81 ms | 3.69 ms |

All uploads and finalisation returned 200. A downloaded file's SHA-256 matched the manifest. Retrying a ready file performed zero R2 writes. 61 files, 4 MB + 1 byte and 32 MB + 1 byte returned 400 before database work. Exhausting the disposable retained-storage budget returned 429 without an R2 write. The full 60-file run used 60 R2 writes and one verification read.

Reservation used 69 SQL statements but only three D1 binding calls: initial lookup, one atomic batch, final lookup. Each fresh upload used six D1 calls and one R2 write. Do not confuse statement count with transport/subrequest count. Cloudflare documents a 50-query Free invocation limit tied to subrequest limits, while the D1 binding sends a batch in a single request. Maximum hosted admission still needs explicit verification; local success does not establish how the hosted service accounts for this batch.

Raw per-phase evidence: [local-worker.json](artwork-runtime-results/local-worker.json). Timing includes local IPC, local disk and response consumption. It is not CPU time. Local Miniflare does not establish hosted enforcement of CPU/memory/subrequest limits.

The first harness attempt failed at module startup when loading the temporary bundled file. A minimal Worker and its D1/R2 bindings started successfully; passing the same compiled bundle in memory resolved the harness startup failure. This was local test infrastructure, not evidence about the held production D1 availability investigation.

## Free-tier review

Read-only business-account dashboard check around 04:07 SAST: 1,159 / 100,000 daily requests, $0 billable usage for the displayed period. The security Worker metrics showed zero exceeded-CPU events in the displayed last-24-hours view. These historical requests are not correlated to the maximum-size fixtures and do not establish their acceptance. No upgrade, paid feature or logging setting was enabled. Existing Worker logs/traces were disabled. Subscription listing through the limited deployment helper returned 403; no billing permission was expanded. Dashboard usage is a point-in-time observation, not a guarantee about unrelated account usage.

The application's 500 MB retained artwork and 10,000 monthly R2-operation ceilings are well below Standard R2's free allowances. The byte ceiling permits three 32 MB orders in an otherwise unused 100 MB daily allowance and fifteen in a 500 MB monthly allowance. A fourth full-size daily reservation would exceed the existing quota. No quota was raised for testing.

Primary references checked on 17 October:

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): 10 ms CPU per HTTP invocation on Free, 128 MB isolate memory, 100,000 requests/day. Network/database waiting does not count as CPU.
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/): Free query/subrequest limits and per-statement constraints.
- [D1 binding batch implementation](https://github.com/cloudflare/workerd/blob/main/src/cloudflare/internal/d1-api.ts): batch transport groups statements.
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/): Standard free storage and operation allowances.

## Reproduction and remaining acceptance

Run `node scripts/measure-artwork-runtime.mjs /tmp/customvibe-runtime-results.json` from the repository root. This uses the installed Miniflare/esbuild dependencies, loopback-only local workerd and disposable local bindings. No Cloudflare login or remote resource is required.

Start the existing Vite server on loopback, open `/tests/fixtures/artwork-runtime-check.html`, and choose **Run bounded measurements**. The fixture refuses non-local hostnames. It uses a generated pattern and the existing public sample; no submission endpoint is called.

Fresh targeted verification: 24 artwork storage/API/preparation/capacity tests passed. No production source changes were needed for the measurement fixtures.

Remaining: one bounded hosted maximum-file order with sufficient existing allowance, correlated CPU/wall-time evidence and outcome checks, followed by actual-device memory checks where relevant. The prior real-email hold remains in effect unless the owner expressly lifts it for a controlled order. Do not mark this task or its parent complete from local results, historical average CPU or unrelated live requests. Do not resume the separate admin availability investigation as part of this task.
