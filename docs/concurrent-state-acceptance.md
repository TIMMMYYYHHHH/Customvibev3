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

Calendar/time-boundary activation, public rollout, complete expired-session recovery, manual email retry journeys, proof replacement/approval and production concurrency remain separate TECH28 work. No clock, seeded setting, fixture session or database enters production. Root owns integration/current-head CI and any later publication or Hub acceptance; this tranche does not close TECH28/GAP-A06.
