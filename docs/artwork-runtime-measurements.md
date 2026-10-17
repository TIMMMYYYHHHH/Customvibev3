# Maximum artwork request measurements

17 October 2026. Application baseline: `be70842` (product change `da7c5d5`). Founders Hub: Artwork & email > Finish gated form and order testing > Measure maximum artwork requests on the free runtime.

## Current result

Local browser and storage boundary measurements pass. One approved hosted 60-file, 31.52 MB order also completed, including private download verification and accepted emails. **Reliable Free CPU headroom remains open:** time-correlated hosted CPU tails exceeded the nominal 10 ms allowance without a CPU-limit failure. Measurement is complete; the separate CPU follow-up must pass before free-runtime acceptance. Local wall time is not Cloudflare CPU time. The initial local measurements changed no production data. A separately approved single hosted test on 17 October is recorded below. That measurement changed no product code or service plan. The subsequent CPU optimization and its separate verification are recorded at the end.

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

The approved hosted maximum-file order and correlated dashboard measurement are now recorded below. Remaining acceptance: profile and address CPU headroom, with actual-device memory checks where relevant. Tim explicitly approved one controlled hosted order with synthetic artwork and normal owner/customer emails to the business test inbox. This exception does not reopen other live email testing. Do not mark this task or its parent complete from local results, historical average CPU or unrelated live requests. Do not resume the separate admin availability investigation as part of this task.

## Approved controlled hosted order

Tim approved one controlled order on 17 October. The local-only `tests/fixtures/artwork-controlled-order.html` generates a deterministic 1200px square PNG and calibrates the noisy region using the actual renderer and preparation code. The downloaded source is copied to 60 separately named local files. Each chosen crop is 525,371 bytes, for 31,522,260 bytes total (98.5% of the 32 MB ceiling). This is a real decodable synthetic image, not padded JPEG data. It exercises maximum file count and near-maximum total bytes, not the separate 4 MB per-file ceiling or different large camera originals.

Preflight read-only quota check: 26,323,327 retained/monthly bytes, 5,355,544 bytes and five requests in the previous UTC day, 10 monthly requests; the current UTC-day counters were absent (zero before this reservation), 580 monthly storage operations. Existing allowances were sufficient; none were raised.

The normal locked-site checkout was submitted once at 02:15:44 UTC (04:15:44 SAST). Customer and locker fields clearly identify a synthetic runtime test with no fulfilment or delivery. Payments remain disabled. The reservation was created at 02:15:48 UTC for exactly 31,522,260 bytes and 60 files, with expiry exactly 14 days later. A read-only progress check showed 37 uploaded files while the same submission was still running.

The single order completed as **CV-000006**, stored at 02:18:10 UTC, about 146 seconds after the click. Success was observed by 02:18:24.714 UTC (160 seconds); this is an observation bound, not precise browser instrumentation. All 60 files are ready and finalised, each with one upload attempt. Status remains new and unpaid. Owner and customer email stages both record accepted sending; actual inbox delivery was not independently verified. The available Resend connector belongs to the separate Founders Hub account, so it was not used as evidence for these messages.

After owner sign-in, the admin artwork page listed all 60 files and the expected 31 October 04:15:48 SAST expiry. The downloaded first file was 525,371 bytes; SHA-256 matched its stored manifest exactly. No stage change, manual update or second order was sent.

Cloudflare's delayed metrics were filtered to 04:15-04:19 SAST. The security Worker showed 139 invocations, zero CPU-limit failures, zero memory-limit failures and one uncaught exception. The metrics cover all Worker traffic in that window, not request-attributed traces; the exception cannot be assigned to this order. The successful order and one-attempt uploads are separately verified. The held admin availability investigation was not resumed.

The CPU chart legend showed P50 1.24 ms, P90 10.36 ms, P99/P999 16.79 ms. These are the dashboard legend summaries of minute-percentile series, not a reconstructed percentile of all individual requests. Minute P99 CPU points were 21.438, 15.196, 20.303 and 10.208 ms. The memory legend showed P50 5.60 MB and P99/P999 10.22 MB. Wall-time legend P50 was 204 ms and upper percentiles rounded to 2k ms. Detailed accessible chart series and verified outcome are in [hosted-order.json](artwork-runtime-results/hosted-order.json).

**Functional large-order acceptance passed; reliable Free CPU headroom is not established.** The observed CPU tails exceed the documented nominal 10 ms allowance. Cloudflare documents flexibility for occasional overruns, which explains why success alone is insufficient. Do not infer a paid upgrade, billable usage or a resource-limit failure from those tails. No plan, paid feature, logging setting, quota or product deployment was changed. Track CPU profiling and any necessary optimization separately under **Reduce and verify artwork upload CPU on the free tier**, with no arbitrary entry/magnet cap and no weakened validation. A further real-email order needs separate authorization; this one-test permission is consumed.

Post-test quota check: 31,522,260 current UTC-day bytes, 57,845,587 monthly/retained bytes, one current-day request, 11 monthly requests and 644 monthly operations. These are below the unchanged application ceilings. Retention cleanup remains automatic. Actual-phone memory, exact hosted 4 MB-per-file behaviour and endpoint-attributed CPU remain unverified.

## CPU optimization, 17 October

Inspection found that every fresh file upload fetched the entire order manifest and used six D1 binding calls. A local workerd sampling profile of the real handler with the same 525,371-byte synthetic JPEG showed substantial D1 transport/JSON work alongside JPEG validation and bounded body handling. Sampling weights include scheduling and waiting and are not hosted CPU measurements.

The storage Worker now selects only the requested manifest entry and readiness in one query, reserves the upload lease and monthly operation budget in one atomic batch, and publishes readiness with an expiry guard in one update. Fresh uploads use **three D1 calls / four SQL statements**, compared with six calls before. Ready-file retries use one query and no R2 write. The request owner, digest, JPEG structure, immutable retry, operation quota and concurrent-cleanup protections remain enforced. No schema, plan, file/byte/request quota, retention, magnet quantity or entry limit changed.

Fresh full-suite verification: **191 tests passed**. Added regressions cover maximum-manifest lookup payload/call count, concurrent uploads competing for the last monthly operation, and lease loss during object writing. Independent review found no actionable defects; 19 focused storage/API tests and two additional concurrency/expiry checks passed. The payload assertion measures fixture result size, not actual network bytes.

The real handler again passed exact 32 MB orders and 4 MB files in disposable local workerd. The 60-file run used 932.85 ms total upload wall time (median 14.51 ms, p95 20.33 ms); the eight-file run used 626.14 ms (median 79.66 ms, p95 88.70 ms). Invalid boundary inputs were rejected before database work, exhausted storage was rejected, ready-file retry wrote nothing, and private-download hashes matched. These individual local runs are indicative only and do not establish a hosted CPU improvement. Raw evidence: [local-worker-optimized.json](artwork-runtime-results/local-worker-optimized.json).

Reproduce a local sampling profile with `node scripts/profile-artwork-runtime.mjs path/to/synthetic.jpg /tmp/artwork-runtime.cpuprofile`. It uses only disposable local bindings, blocks external fetches, and chooses a file count within the unchanged 60-file/32 MB boundaries. Profile output can be inspected in a developer CPU-profile viewer. It is not a production endpoint and sends no email.

Implementation and local verification are complete. Commit `7646948` was deployed only to the existing security Worker at 02:32:30 UTC (04:32 SAST), version `e7ce60e4-3f11-4bce-b0f2-8f2af2cd63cb`, verified at 100% traffic. Post-deployment checks confirmed unchanged DB/R2/KV bindings, disabled public Worker/preview URLs and hourly cleanup schedule. Pages and admin were not redeployed. Hosted CPU acceptance remains pending a separately approved controlled test. The previous one-order email exception is consumed. Keep the CPU subtask and parent testing task open until representative hosted CPU is measured; do not infer adequate Free CPU headroom from fewer D1 calls or local wall time alone.

## Approved follow-up and native body-reader correction

Tim approved one further controlled order, then explicitly resumed the availability investigation when that same draft failed. Draft `62a8d010-96a3-4c1a-ab2a-bf9fef9f94aa` reserved the same 60 files / 31,522,260 bytes at 02:36:32 UTC. Initial submission at 02:36:27 and one same-order retry at 02:37:21 stopped with temporary service errors. A subsequent read confirmed one ready file, no finalisation/order number and exact 14-day expiry. A diagnostic retry after the hold was lifted reached index 2 successfully, then failed at index 3. No extra order was created or successful email delivery claimed.

Temporary live logs attributed the index-2 success to 11 ms CPU / 1,227 ms wall time and index-3 HTTP 503 to database_internal, 12 ms CPU / 2,453 ms wall time on version e7ce60e4. Thus the first CPU optimization is insufficient evidence of reliable 10 ms Free headroom. See [resumed availability evidence](admin-availability-verification.md) for direct provider-console failures and the unsent report.

The next narrow optimization uses workerd's native [FixedLengthStream](https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/#fixedlengthstream) for exact bounded body reading, avoiding the JavaScript chunk-copy loop. JPEG structure, SHA-256, manifest ownership, all quotas and retry/expiry protections are unchanged. Node-only tests retain the portable reader fallback. Actual workerd tests reject both one byte short and one byte over, before R2 writes. The full 192-test suite passes. Independent review verified native source-error propagation, oversize cancellation and released reader locks. [Native-reader local boundary evidence](artwork-runtime-results/local-worker-native.json) was collected while the test suite ran; its wall times must not be compared to idle runs. A separate idle local profile is diagnostic only, not hosted CPU proof.

The same deployment also makes caught service errors return safe JSON, correcting the raw parse error seen in checkout. This is separately tracked under availability and does not fix the provider fault. Resume only the retained approved draft after deployment and verification; no additional real-email order is authorized.


Native-reader release `376795e` is deployed as security version `38cdf928-a60d-449d-916f-b8815840ffe9` at 100% traffic. The 02:46:07 UTC same-draft retry failed on upload index 0 with database_internal (HTTP 503, 2 ms CPU, 2,332 ms wall). The readable error is verified live. Because this failed lookup did not exercise body reading, the native-reader CPU benefit remains unverified. CPU acceptance and the same approved order remain unfinished pending database availability. No extra order or successful email sending is claimed. The updated provider report is prepared but unsent in the availability evidence document.
