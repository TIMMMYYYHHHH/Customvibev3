# Route resources

TECH-11A loads Editor, HandyStudio, BusinessStudio, CollectionReview and Checkout through `src/routes/client-views.mjs`. App still owns the providers, photos, basket, personalisation drafts, checkout details, draft warning and Undo lifetime. The loader stores component code only.

`src/ssr.jsx` supplies `serverRouteViews` from an eager server-only registry. The existing synchronous SSR/prerender/live render APIs keep returning full markup. The browser continues using `createRoot`. Public and authenticated admin preview share the same App and client registry. Preview forms remain disabled by the existing form service.

The route hook ignores obsolete completions, reuses fulfilled/in-flight imports and evicts rejected promises. Loading/error UI stays inside the shell. Route focus and section scrolling wait for readiness, while existing dialog, Undo and security recovery focus guards still apply. An explicit retry loads only code. It never retries a form submission or reloads the tab. Browsers may cache a failed module response, so repeated failure keeps the error and navigation available rather than discarding drafts. Initial editor and locked-order errors offer home; other route errors offer the designer.

All existing CSS stays eager. App retains the former transitive style traversal for Handy, gallery finish/game styles and Leaflet/locker styles. No stylesheet rules, tokens or build configuration change. Compare all emitted CSS bytes with the matching baseline, including the admin preview. Route CSS partitioning is TECH-11B and is not included here.

## Verification

Use Node 22 and the locked local dependencies. Run the public/SSR/prerender build and admin build, then the required fixture suite, notice audit and Python checks. `tests/route-loading.test.mjs` covers importer reuse, failure retry, explicit resource names, real synchronous route markup and entry accounting.

`tests/route-loading.browser.mjs` builds a disconnected real-App fixture in a temporary directory. It holds/fails imports and tests focus, abandoned completions, memory-only drafts, Undo, error escape, submission locks and embedded preview. It also serves the actual `dist/client` output to test native checkout chunk 404/503 under the current CSP. All APIs are synthetic and external requests are blocked. It needs a local browser and loopback listener. Set `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` to available installations; optional `ROUTE_OUTPUT` and `ROUTE_RESULTS` select temporary output and evidence. `ROUTE_SKIP_BUILD=1` reuses an already matching fixture build. `ROUTE_CASE` limits diagnosis to a named case; omit it for full acceptance.

Also run the existing public focus and rich basket Undo browser suites against their local Vite fixtures. They cover photo/puzzle crops, quantities, exact mixed basket positions, personalisation/QR edits, shared object-URL release, expiry and new/completed/uncertain order boundaries.

## Asset accounting

`node scripts/measure-entry-assets.mjs dist/client/index.html dist/admin/preview.html` reports raw/gzip bytes, hashes and the initial closure, including static JS dependencies and HTML modulepreloads/stylesheets. It excludes demand imports and does not modify build output. Sum the closure rather than comparing renamed main files.

The provisional home budgets are 150000 gzip JS bytes and 35000 gzip CSS bytes. Before/after evidence must use matching builds and retain any display rounding. These are local asset estimates, not field transfer, speed, LCP or Core Web Vitals. CSS remains above budget until the later bounded CSS work. Keep measurements/evidence in the current audit handoff, not in application state.

## Release safety

No security or provider configuration changes are required. Existing gate/trusted-host/proof checks, independent admin authentication, private downloads, manual emails and disabled payments remain authoritative. Pair storefront/admin publication from the same reviewed revision when separately scheduled. Include every generated lazy chunk in their respective asset outputs. Revert the complete route boundary change against current main for rollback, preserving newer functional fixes and data. No state migration is involved.
