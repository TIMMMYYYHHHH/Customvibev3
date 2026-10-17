# Seasonal admin production contract

Owner authorised the controls rollout with every occasion Not started, no dates, schedules off and no installed themes. The Christmas exploration designs and browser-local demo data are excluded. Existing named occasions are editable, removable and recoverable.

## Shared website preview
`admin/preview.jsx` imports the same `src/App.jsx`, storefront sections and styles as `src/main.jsx`. `/preview-content.json` reads the current D1 catalogue through the same validation/public filtering as the website. No cloned page markup or catalogue is maintained. Catalogue edits refresh on preview reload or window visibility. Code/layout changes must be built and published to both site and admin from the same revision. Do not publish only the public bundle after changing shared page implementation.

The authenticated `/preview` document permits only same-origin framing. Other admin documents retain DENY and frame-ancestors none. The public website cannot use this draft preview or obtain seasonal drafts. Preview navigation is confined to the preview route. Form services disable sends in the preview, and the admin has no customer contact/order submission endpoints. No production customer records are used by local verification.

This draft previews an installed occasion design even before approval. With no installed design, it shows the current original website design with the editor’s draft wording. All four wording fields update immediately; blank fields inherit the original component content. Draft wording is preview-only and cannot install or activate a theme. Website at selected date resolves eligible themes using the selected South African date; it does not retrieve a historical site snapshot. With schedules off or no eligible theme, it shows normal website wording, not draft changes. The preview clock is never stored or used for a live activation confirmation.

## Settings and activation
`server/seasons.mjs` stores a bounded record in `seasonal_settings` in the existing content D1 database. The table is created idempotently on the first authenticated settings save. Reading an uninitialised installation returns clean defaults without a write. Saves require admin authentication, same origin, CSRF, schema validation and matching revision. Stale writes return 409; audit records are generated on the server. Existing content and customer records are not changed.

Installed theme metadata lives in `src/seasons/registry.mjs`; components live in `src/seasons/runtime.jsx`. Both registries start empty. Admin progress, icon uploads and wording cannot install a theme. A future theme adds its own isolated components and scoped styles; the Hero slot receives the current shared original. Other slots may be added deliberately without duplicating business logic. Blank seasonal wording inherits live component copy. Additional designs require owner approval and their own visual checks.

Activation requires installed artwork and Ready to use, plus an enabled valid schedule or confirmed manual override. Missing artwork cannot be marked Ready to use. Downgrading readiness clears manual activation. Only the eligible current appearance is exposed by `/season.json`, never history, drafts or future wording. Public polling runs only when a theme is installed; updates resolve within one minute. Visitor opt-outs and motion preferences remain browser-local. Operating costs stay within existing free-tier resources.

## Verification and release
- Clean state, missing artwork, date validation, conflicts, moving dates, storage persistence, revision conflict, audit ownership, CSRF, authentication, preview framing and routing are covered by seasons test files.
- Browser verification uses `tests/season-admin-server.mjs`, an explicitly loopback-only server with in-memory SQLite and synthetic authentication. It cannot reach production data or send email.
- Build and test an exact tracked-source export to exclude unrelated local coming-soon and artwork work.
- Preserve website password gate, separate admin authentication, disabled payments and existing email/retention rules.
- Deploy catalogue, site and admin from the verified revision, then verify clean live defaults and preview. Record release evidence below and in Founders Hub.

## Release evidence, 17 October 2026
Implementation 82e7c6e; canonical asset-path correction 44a6c02. Public release workflow https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39067277348 completed successfully. Catalogue version 79e01057-1cc8-477c-9f50-0217649af0d4. Admin version 53c3e9f0-81a6-4ce4-a3cc-0b1f039a311c. Security Worker unchanged.

All 246 tests passed in the clean tracked-source export; 12 affected routing/security/storage checks passed again after the route correction. Public, SSR and admin builds passed. Independent review findings were addressed: calendar visitor preview carries its selected date and icon copy describes shared saving. Production asset URLs use canonical paths so Cloudflare HTML normalization does not redirect in a loop.

Live admin initial settings saved successfully and survived reload. All ten occasions were verified Not started, Schedule Off, Theme Not created, with no dates or active controls. Original website displayed in both draft and selected-date preview. Preview rendered current production catalogue availability (distinct from local fallback), mobile preview measured 375px with no overflow, and contact sending was disabled. Local admin phone-width fixture also measured 375px without overflow. Existing website/admin deployment protection guards passed after publishing. No customer records or emails were changed.

Screenshots are in project output/seasonal-production/: live-occasions.png, live-shared-preview.png and local-mobile-admin.png. The rollout task is maintained under Review seasonal themes and admin controls in Founders Hub. Actual occasion design approval and installation remain separate pending work.
