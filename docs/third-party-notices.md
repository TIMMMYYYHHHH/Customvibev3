# Distributed third-party notices

The public and admin applications both copy `public/third-party-notices.txt`. The public footer and shared admin chrome link to that same relative path. The admin preparation step retains the copied file. Normal site/admin authentication remains unchanged; the notices file is not added to an unauthenticated asset allowlist.

`third-party-notices.json` is the notice/provenance inventory for dependency maintenance. It records the pinned distribution version, exact licence-source SHA-256, the rendered browser module inventory measured from baseline `07702ec`, and font binary correspondence. Package versions come from the installed distributions and are checked against `package-lock.json`, not inferred from manifest ranges.

## Included

Both browser builds render React 19.2.0, React DOM 19.2.0, scheduler 0.27.0, Phosphor React 2.1.10, Leaflet 1.9.4, qrcode 1.5.4, dijkstrajs 1.0.3 and the Fredoka/DM Sans font distributions 5.3.0. The source licence text is copied verbatim, including Leaflet's BSD-2-Clause notice and the full font OFL texts. The qrcode core's embedded Ryan Day (2011), Kazuhiko Arase (2009) and QR Code trademark notice is also reproduced verbatim, in addition to its root licence. Patrick Hand's accompanying OFL and exact version 1.003 font metadata are also recorded.

The module inventory also includes Vite-generated module-preload/preload helpers and the CommonJS helper vendored in Vite 6.4.4. Their notices are copied from the relevant sections of that exact Vite distribution's `LICENSE.md`. Unrelated licences bundled with the Vite build tool are not presented as browser dependencies. The independently resolved upstream CommonJS plugin version is unknown; the exact containing Vite distribution and source hash are identified instead.

Dijkstrajs 1.0.3 supplies an MIT-labelled copyright/disclaimer and a licence URL rather than restating the permission grant. Its entire distributed notice is preserved. No upstream copyright or licence wording is invented; the artifact explicitly explains this source limitation and contains full MIT terms in its other MIT sections.

The five copied Fredoka/DM Sans source fonts byte-match the pinned Fontsource distribution files. The two coming-soon copies byte-match the corresponding Latin files. Admin sign-in copies those same source font bytes during preparation. The Patrick Hand TTF name table identifies Patrick Wagesreiter, version 1.003 and OFL 1.1, matching the accompanying OFL authorship. Font and product-image bytes were not changed.

Map data/service attribution stays on the active map. These dependency notices do not replace it or establish rights to customer artwork, product imagery or third-party services. No broader asset-rights audit is claimed.

## Excluded from browser notices

The rendered-module inventory excludes qrcode's pngjs and yargs server/CLI branches, the jsqr test dependency, Wrangler and other server/build tools. Vite's emitted helper code is the explicitly recorded exception. Ordinary development-only dependencies are not incorrectly described as shipped client code.

## Verification and updates

1. Run `node --test tests/dependency-notices.test.mjs` from a normal locked install. It checks verbatim notices, pinned provenance, unchanged font bytes and synthetic authenticated/unauthenticated access. It needs no pre-existing `dist` folder.
2. Build the public/SSR and admin applications with the existing commands.
3. Run `CV_CHECK_BUILT_NOTICES=1 node --test tests/dependency-notices.test.mjs` and `node scripts/check-dependency-notices.mjs --outputs --bundles`. The explicit output phase checks both prepared artifacts. The bundle phase performs read-only Vite builds in memory, checks every rendered third-party package and generated helper has a notice, and detects changed package coverage. It does not rewrite existing output files.
4. For a dependency/font change, inspect the new exact distribution and update the inventory, source hashes and verbatim notice sections together. The source hash checks intentionally fail on an unreviewed change. Re-measure the module inventory after bundle changes; its module paths are a dated evidence snapshot, while the release check compares current package/helper coverage.
5. Keyboard-open the text link from the public footer, an admin shell and Themes at phone/desktop widths. Confirm plain-text delivery, readable text, visible focus and no new horizontal overflow. `.txt` navigation bypasses the existing SPA click handler.

All browser checks use synthetic local content and block external requests. Local evidence is distinct from eventual protected-production verification. No dependency version, subscription, gate configuration or customer workflow changes are part of this task.
