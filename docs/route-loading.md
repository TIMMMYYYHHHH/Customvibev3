# Route resources

TECH-11A loads Editor, HandyStudio, BusinessStudio, CollectionReview and Checkout through `src/routes/client-views.mjs`. App still owns the providers, photos, basket, personalisation drafts, checkout details, draft warning and Undo lifetime. The loader stores component code only.

`src/ssr.jsx` supplies `serverRouteViews` from an eager server-only registry. The existing synchronous SSR/prerender/live render APIs keep returning full markup. The browser continues using `createRoot`. Public and authenticated admin preview share the same App and client registry. Preview forms remain disabled by the existing form service.

The route hook ignores obsolete completions, reuses fulfilled/in-flight imports and evicts rejected promises. Loading/error UI stays inside the shell. Route focus and section scrolling wait for readiness, while existing dialog, Undo and security recovery focus guards still apply. An explicit retry loads only code. It never retries a form submission or reloads the tab. Browsers may cache a failed module response, so repeated failure keeps the error and navigation available rather than discarding drafts. Initial editor and locked-order errors offer home; other route errors offer the designer.

TECH11A kept all CSS eager; TECH11B1 now defers only Checkout's Leaflet and locker-picker styles. Handy, gallery finish/game, mixed/global, home, seasonal and button styles remain eager. The two duplicate eager App imports are removed; their unchanged stylesheets stay imported by LockerPicker/NearbyLockerMap beneath Checkout. No stylesheet rules, tokens or build configuration change. Compare CSS source hashes and the common-plus-checkout cascade with the matching baseline, including admin preview. No other route stylesheet partition belongs to B1.

## Verification

Use Node 22 and the locked local dependencies. Run the public/SSR/prerender build and admin build, then the required fixture suite, notice audit and Python checks. `tests/route-loading.test.mjs` covers importer reuse, failure retry, explicit resource names, real synchronous route markup and entry accounting.

`tests/route-loading.browser.mjs` builds a disconnected real-App fixture in a temporary directory. It holds/fails imports and tests focus, abandoned completions, memory-only drafts, Undo, error escape, submission locks and embedded preview. It also serves the actual `dist/client` output to test native checkout chunk 404/503 under the current CSP. All APIs are synthetic and external requests are blocked. It needs a local browser and loopback listener. Set `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` to available installations; optional `ROUTE_OUTPUT` and `ROUTE_RESULTS` select temporary output and evidence. `ROUTE_SKIP_BUILD=1` reuses an already matching fixture build. `ROUTE_CASE` limits diagnosis to a named case; omit it for full acceptance.

Also run the existing public focus and rich basket Undo browser suites against their local Vite fixtures. They cover photo/puzzle crops, quantities, exact mixed basket positions, personalisation/QR edits, shared object-URL release, expiry and new/completed/uncertain order boundaries.

## Asset accounting

`node scripts/measure-entry-assets.mjs dist/client/index.html dist/admin/preview.html` reports raw/gzip bytes, hashes and the initial closure, including static JS dependencies and HTML modulepreloads/stylesheets. It excludes demand imports and does not modify build output. Sum the closure rather than comparing renamed main files.

The provisional home budgets are 150000 gzip JS bytes and 35000 gzip CSS bytes. Before/after evidence must use matching builds and retain any display rounding. These are local asset estimates, not field transfer, speed, LCP or Core Web Vitals. CSS remains above budget until the later bounded CSS work. Keep measurements/evidence in the current audit handoff, not in application state.

## Release safety

No security or provider configuration changes are required. Existing gate/trusted-host/proof checks, independent admin authentication, private downloads, manual emails and disabled payments remain authoritative. Pair storefront/admin publication from the same reviewed revision when separately scheduled. Include every generated lazy chunk in their respective asset outputs. Revert the complete route boundary change against current main for rollback, preserving newer functional fixes and data. No state migration is involved.

## Checkout stylesheet resources

Client and Admin builds emit separate Vite manifests. The public manifest survives the SSR build. Shared pure composition derives Checkout's static CSS closure, removes eager entry CSS and rejects unsafe or empty route metadata. Prerender and synchronous live rendering link the selected stylesheet before common CSS and add a safely escaped inert catalogue meta element. New live products and root templates receive the same correct composition. Admin prepare adds its separate catalogue; authenticated preview GET/HEAD composition uses the existing preview path parser, preserves policy/status, removes stale body-length/ETag, and keeps HEAD bodyless. Every referenced route CSS asset must exist at build time.

The client registry awaits CSS before importing Checkout. This prevents Vite's preload helper appending a duplicate after common/button overrides. A stylesheet link's presence is not readiness: the adapter awaits load/error, checks its sheet and bounds missed failures to 15 seconds. Explicit retry removes failed links and retries the same resource URL. Successful links remain cached before common overrides across history and reverse visit order. Missing production catalogue fails checkout safely. Development retains normal Vite CSS/HMR behavior. No loading/retry action remounts App or replays a submit. An old deployed chunk that no longer exists can remain failed while work stays in the tab.

Conventional direct-route stylesheet links remain render-blocking. Slow CSS can delay first paint; this tranche adds no critical CSS, streaming or guaranteed pre-JS error UI. The browser's existing route status applies once client code runs. Test real SSR links and cold/slow/failing transitions; do not imply JavaScript-disabled retry support.

Run `node --test tests/route-styles.test.mjs tests/route-loading.test.mjs tests/live-render.test.mjs tests/admin-security.test.mjs tests/proof-preview-isolation.test.mjs tests/deployment-safety.test.mjs` after both builds. The local built `tests/route-styles.browser.mjs` uses the real Worker/SQLite fixture with blocked external/write/WebSocket requests, synthetic photos/lockers and a test-only complete Turnstile adapter. It checks cascade snapshots at desktop/mobile in public and selected Christmas preview, failure/retry/abandonment, memory/Undo/focus, selected-date reload and cold direct links. `CSS_BASELINE=1` captures pre-change evidence; candidate requires `CSS_BASELINE_DIR` and writes to `CSS_EVIDENCE`. Keep these outside the app source and use matching builds. Fixtures never send real email.

Measure nested output with `node scripts/measure-entry-assets.mjs --root=dist/client dist/client/products/photos.html`; selected route links are reported separately within the actual initial closure. The inert catalogue does not preload route CSS. Keep byte estimates separate from browser transfer observations and performance scores. Deploy matching manifest, lazy CSS/JS and public/Admin executable assets together only when separately authorized. Roll back B1 as a unit while retaining current backend schemas, preview-date fix and auth/settings.
