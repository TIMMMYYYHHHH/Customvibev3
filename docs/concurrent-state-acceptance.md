# Concurrent catalogue and theme acceptance

This is a local TECH28 first tranche. It exercises two independent synthetic admin sessions against the actual Admin Worker, actual content/season storage functions and a disposable SQLite implementation of the existing D1 interface. It adds no production feature or runtime fix. Existing sequential storage and PR22 single-client refresh/focus tests remain intact.

Run from the repository root with Node22:

```sh
node --test tests/theme-concurrency.test.mjs tests/database.test.mjs tests/seasons-storage.test.mjs tests/season-editor-drafts.test.mjs
npm run build:admin
node tests/theme-concurrency.browser.mjs
```

The browser runner uses installed Chrome and an existing Playwright package. Set `PLAYWRIGHT_MODULE` to its absolute package.json path if the local default is unavailable; `PLAYWRIGHT_CHANNEL` may select a compatible installed channel. `TECH28_EVIDENCE` changes the local evidence output directory. No new package, test framework or service is installed.

`tests/fixtures/concurrent-state-harness.mjs` supplies only disposable storage, synthetic signed sessions and local built assets. Each actor has a different signed token, session identity and CSRF value. The real gate and Admin Worker validate them. The only synthetic AUTH response is the existing session-revocation lookup; every other AUTH operation is forbidden. No provider, customer record, mail service, production credential or external binding is configured.

The Node fixtures race both actual API handlers from the same observed revision. Both actor invocation orders are checked. For themes only, an opt-in one-shot barrier captures each actual seasonal row before returning either row to the save handler. It is armed after the initial snapshots, releases only when both writer reads arrive and fails within two seconds if one never arrives. No row, SQL statement or result is altered. The barrier is not armed by browser or ordinary fixtures. A separate short-timeout case verifies one-shot failure/recovery. The real storage SQL and atomic batch semantics choose the winner; neither actor's result is forced and no409 response is fabricated. Assertions require two real conditional SQL UPDATE attempts with changes sorted as `[0,1]`, exactly one200 and one409, one saved revision advance, the winning values, unchanged losing snapshots, a single new theme history record, preserved drafts and schedules off. Separate checks reject the other actor's CSRF and anonymous requests, isolate content from seasonal settings and verify reads do not replay rejected writes.

The browser runner launches two separate contexts with their own HttpOnly synthetic session cookies and separate browser storage. It loads the actual built Store content and Themes & seasons UI. Every request is intercepted before network access and dispatched to the actual Admin Worker/local asset binding; the same real Worker/SQLite paths produce all success/conflict responses. Requests outside the fixture origin, unexpected API paths, non-read/save methods or unexpected AUTH operations are blocked and reported. No requests continue to an external network.

Three observed journeys:

1. ActorA saves catalogue content; ActorB's stale save conflicts. Its text and session-memory draft remain visible. Explicit Reload saved content adopts the winner and disables Save changes, without another write.
2. ActorA renames Christmas; ActorB's stale rename conflicts. Its modal input and focus remain available, the stored winner remains authoritative and schedules stay off. Cancel and explicit Refresh saved themes adopt the current saved state without a write.
3. ActorB's unsent theme wording survives a conflict after ActorA's rename. The winner's name and no persisted losing draft remain authoritative until ActorB explicitly clicks Save draft a second time. That intentional save preserves the latest name and stores only the reviewed local wording; no schedule is enabled or theme applied.

The runner writes sanitized actor/method/path/status traces and synthetic screenshots. It records no cookies, tokens, CSRF values or request bodies. Screenshots are acceptance evidence, not a new visual baseline or redesign.

This is not Cloudflare D1 deployment/availability, transport/TLS, independent identity-provider or live authentication acceptance. SQLite cannot establish every distributed edge timing. The simultaneous API race and browser stale-save journeys are distinct evidence. Browser scope is installed desktop Chrome at1280x1000, not physical-device, cross-engine, measured performance or accessibility conformance.

Calendar/time-boundary activation, public rollout, complete expired-session recovery, manual email retry journeys, internal artwork replacement and production concurrency remain separate TECH28 work. Customer post-order proof approval is superseded by the 21 October [customer preview policy](customer-preview-policy.md). No clock, seeded setting, fixture session or database enters production. Root owns integration/current-head CI and any later publication or Hub acceptance; this tranche does not close TECH28/GAP-A06.

## Fixed-clock seasonal and preview acceptance

The separate timed tranche reuses the real Worker/SQLite harness with its default race behavior unchanged. Its storefront adapter is opt-in: `createConcurrencyHarness({storefront:true})` exposes `dispatchStorefront`. It serves matching built client assets and dispatches `/content.json` and `/season.json` to the actual internal Catalogue Worker with disposable D1 storage. The existing Admin preview forms response supplies disabled fixture forms; no sending service is configured. It does not exercise production middleware, password-gate routing, transport or edge caches.

Run from an isolated checkout with Node 22 and matching private dependencies:

```sh
node --test tests/season-boundaries.test.mjs tests/theme-concurrency.test.mjs tests/sast-time.test.mjs tests/christmas-theme.test.mjs tests/occasion-date-rules.test.mjs tests/seasons-storage.test.mjs tests/seasons.test.mjs tests/database.test.mjs tests/season-editor-drafts.test.mjs
npm run build
npm run build:admin
node tests/season-boundaries.browser.mjs
node tests/theme-concurrency.browser.mjs
```

The new Node cases use fresh signed fixtures and scoped `Date.now` mocks for each literal UTC instant. Actual Catalogue Worker responses must select the synthetic installed Christmas campaign at SAST 23:59 on 31 December 2027, keep the 2027 occurrence at SAST 00:00 on 1 January 2028, and remove it at 00:01. Leap-day cases cover just before/at the start, exact end, non-leap 2029 and recurrence in 2032. Off and not-ready saved states remain authoritative. Expected identities come from literal tables, never the resolver under test. Stored content/seasonal rows and SQLite change counts must remain unchanged after setup.

The browser runner uses one matching local public/SSR/Admin build, actual installed Chrome and the existing Playwright package. `TECH28_BOUNDARY_EVIDENCE` may select its evidence directory. Context-level interception is installed before any page is created, including the first navigation of `noopener` popups. Service workers are blocked, WebSockets and all external/write requests fail, and no route continues to a network. Clocks are confined to the runner process and disposable contexts; popup clocks are installed through context init scripts before runtime code. No clock is saved to seasonal records.

Public timer-clock setup installs the explicitly earlier UTC 20:58 instant, then pauses at the intended UTC 21:58 boundary before navigation and asserts the exact initial browser Date. Installing and pausing at the same instant would race elapsed real time. The paused-clock public navigation waits for DOMContentLoaded, then the actual seasonal API response, collections heading and rendered seasonal state. This avoids depending on the global load event while timers are paused; it retains the ten-second deadline and all response/DOM/counterfactual and immutable-state assertions. The original independently observed clock/navigation failures remain review evidence, not application defects.

Six journeys cover actual public 60-second polling across SAST New Year; selected-time versus identical-current-time collections previews in UTC and America/Los_Angeles; off authority under the same selected query; annual leap/non-leap preview output; and calendar midday selection, actual visitor popup, leap/non-leap cells and Return to today. The selected-time counterfactual requires actual Christmas appearance and switch state versus original appearance without `at`, as well as the correct collections page/query. A retained query or rendered heading alone cannot prove which clock was selected. Public polling uses actual service responses; preview uses the actual authenticated Admin seasonal API and client resolution. No canned campaign response or injected preview message selects the appearance.

After synthetic setup through the real Admin API, every journey checks immutable saved row/change-count snapshots and zero further writes. Sanitized evidence records controlled server/browser instants, selected query values, GET/status traces, actual response campaign identity, rendered appearance/switch results and snapshot digests. It contains no cookies, CSRF values, tokens, request bodies or customer data. A successful local run is boundary acceptance only. It does not approve live theme readiness, schedule activation, public launch, calendar changes, full expired-session/proof/email journeys, distributed D1 timing, cross-engine/device/assistive-technology acceptance or TECH28 completion. PR34 race and PR22 focus acceptance remain separate.

### Selected-date visitor navigation durability

Standalone selected-date previews retain one valid SAST-minute `at` while ordinary storefront links update `page`, including section hashes and history replacement. Unknown destination/current query fields and duplicate/invalid timestamps are not propagated. Explicit `/preview` URLs retain their own authoritative query, including an intentional current-clock URL with no `at`. The existing same-origin and preview-page safety rules stay unchanged.

The boundary browser runner now includes a seventh journey: under the identical fixed outside-current clock, open the real homepage with a selected eligible date, click View more designs, verify the real collections seasonal DOM and retained query, then reload and verify them again. Repeat without a selected date and require original appearance throughout. The journey performs no customer form requests or browser writes, retains the original Worker/SQLite snapshot assertions and has no external network fallback. This closes the reproduced local navigation/reload gap; it does not prove live sign-in expiry, deployed provenance or final seasonal acceptance.
