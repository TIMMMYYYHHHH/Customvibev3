# Seasonal admin production rollout

Goal: publish the approved admin with shared storefront preview and clean initial data.
Architecture: shared scheduling model, authenticated revision-controlled D1 settings, empty installed-theme registry. Admin preview imports the same App and ContentProvider as the storefront, with isolated navigation and no submission capability. Shared code changes require paired site/admin builds and publication; catalogue edits read the same D1 content immediately.
Spec: workspace christmas-preview/docs/ADMIN-THEMES-CONCEPT.md and owner approval in this chat.

- [x] Add clean production state, strict storage validation, conflict-safe authenticated API and server-owned audit history. Test missing data, invalid input, stale writes, missing artwork, dates and simulation isolation.
- [x] Port approved compact controls/calendar/editor, replacing browser storage with confirmed server persistence. Keep date simulation ephemeral. No sample artwork or schedules. Test save failures and empty dates.
- [x] Add authenticated same-code storefront preview, live catalogue reads, isolated routing, preview-only side-effect blocking and same-origin framing restricted to preview routes. Add empty theme renderer registry and runtime extension points.
- [x] Build/test exact committed source, check desktop/mobile and persistence, review diff, deploy protected services and verify live defaults and preview. Record verification in Founders Hub.

Constraints: no production customer writes during testing; no emails; gate, admin sign-in and payments unchanged. Preserve unrelated uncommitted work. No seasonal design installed by this rollout. All dates Africa/Johannesburg. No em dashes or diagonal arrows.

Review focus: initial data cannot silently import examples; readiness cannot install artwork; concurrent tabs cannot overwrite; preview date cannot alter activation clock; preview cannot submit orders or contact messages. Admin and storefront must share page implementation and content source.
