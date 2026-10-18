# Retained order search and collection helper

18 October 2026. Scope approved for live publication by Tim.

## Changes

- Order search runs over all unexpired retained records by name, current reference or older reference. Stage filters are applied before pagination. Matching results remain limited to 50 per response, with a load-more control.
- Search is debounced and ignores responses from earlier queries. Empty and failed results are distinguished, and the interface shows the number of results currently displayed.
- The collection preparation helper explains that it prepares built-in collection print setup and pricing, can change availability, keeps business examples connected to the studio, and requires review and saving.
- No data migrations, settings saves, order changes, retention changes or customer email sends are part of this release.

## Verification checklist

- [x] New authenticated integration test first failed against the previous implementation, then passed.
- [x] All 277 automated tests passed, including access protection, expiry, literal query matching, legacy references, stage filtering and matching-page pagination.
- [x] Public build, server-rendered pages, prerender and separate admin build passed.
- [x] Browser fixture uses the real order list service with 113 synthetic records. Verified older target beyond first 50, 55 matching results across two pages, no matches, clearing and stage filter.
- [x] Local collection helper changes remain unsaved until Save changes; saving succeeds. Wording verified visually.
- [x] Production guards verify the locked site, separate admin sign-in, disabled payments and retained service bindings before publication.
- [x] Publish security Worker before admin Worker; publish paired Pages build.
- [x] Verify live search and helper wording without modifying orders or catalogue.
- [x] Mark both Founders Hub subtasks Done and verify persistence.

Deployment evidence is stored locally in `output/admin-search-release/` at the project workspace root. The parent launch-check task remains In progress for unrelated requirements.

## Live evidence

- Code revision: `780fe7e270f88f749c3446de81263f7b4a9d897c`.
- Security Worker: `217e0039-e5e6-4f23-bc5c-bb8d20aa9be5`.
- Admin Worker: `bff11a75-ace2-46e3-9803-a1c0ff0e2c43`.
- [Paired Pages release](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39103852391) passed.
- Live search verified current reference, customer-name results, combined Shipped filter and no-match state. All seven original retained orders and their stage counts remained present after clearing the search.
- Live collection helper wording verified without invoking it or saving catalogue changes. No browser console errors. Post-deployment protection checks passed and both Workers retained identical bindings.
- Screenshots: `output/admin-search-release/live-search.png` and `live-helper.png` in the workspace.

Founders Hub: both distinct subtasks are Done with one verification activity each. Refreshed board confirmed both completion checkboxes and parent 14/18 complete, still In progress. Its intermittent interrupted-save/HTML-response issue required reloading the latest version and verifying original saves; no duplicate tasks were created.
