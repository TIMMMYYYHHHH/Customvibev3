# Shared admin styling, local review

Owner approved a consistency pass across Orders, Store content and Themes & seasons. Existing board, catalogue and calendar/editor layouts remain. The owner approved the local styling for publication on 17 October; the release follow-up below supersedes the earlier local-only restriction.

## Implementation

- AdminShell and the Themes entry use the same AdminChrome component for branding, navigation, private-store strip, skip link and Sign out.
- Existing CSRF-backed logout is shared through admin/logout.mjs, with its behaviour preserved.
- admin/workroom.css owns the common warm background, plum wordmark, 8px control corners, heading scale, page spacing, flat buttons, custom menu styling and keyboard focus.
- Removed Orders' header overrides. Themes no longer renders its separate demo header or Back to orders link.
- Store content now uses the direct Store content page heading.
- Order stage colours, board/card structure, catalogue editing, manual email controls, seasonal readiness/scheduling rules and the shared storefront preview are unchanged.

## Local review

Run `node tests/admin-review-server.mjs` from the repository with Node 24. It listens only on 127.0.0.1:5201. Open /orders, /content or /themes. The top banner distinguishes local review from production.

Orders use fictional fixtures. Content and seasons use an in-memory database and local authentication with the existing handlers. Local content edits are reflected in the seasonal storefront preview. Restarting the review server resets content and seasonal edits. No production bindings or email sending are available. Fixtures are not build entries.

## Checklist

- [x] Shared header, navigation, logo and account control.
- [x] Shared headings, page spacing, flat buttons and custom menu styling.
- [x] Existing page-specific layouts and workflow logic retained.
- [x] Local order filtering and a stage change verified; no email sent.
- [x] Content validation and successful save verified; sample price restored.
- [x] Theme draft save and shared original-site preview verified.
- [x] Ready to use remains disabled with no theme installed.
- [x] Desktop and 390px phone-width checks, including full 12-month calendar; no horizontal overflow.
- [x] Admin build and 21 existing UI, stage, security and seasonal tests passed.
- [x] Owner visual review and explicit publication approval.
- [ ] Production deployment and live verification.

Screenshots: project output/admin-consistency-review/local-*.png. Founders Hub tracking stays in Fix admin centre view > Match admin styling to the website, In progress until acceptance. No changes have been pushed or deployed.

## Follow-up: remaining Orders glow treatment

Owner reported additional glow-like boxes and text in the local Orders review. Corrected the darker stage-card outlines, tan/brown Unpaid badges, coloured Open order text, mint quantity labels, lilac Progress panel and remaining artwork-card shadow. The approved stage fills and page layouts remain. Unpaid is solid plum with white text; quantity labels and detail surfaces are neutral. Focus, selected, hover and disabled states remain visible. The lasting preference in .better-web-ui.md now explicitly covers badges and panels too.

Verification: admin build and preparation passed, all 21 existing admin UI/stage/security/seasonal checks passed, sample stage save and manual email preview worked, and board/detail layouts have no horizontal overflow at 390px. No email sent. Before/after screenshots are in output/admin-consistency-review/orders-*-flat.png in the parent project workspace.

## Owner's live seasonal changes observed 17 October

Read the signed-in live UI and change history without writing settings. Spring, Summer holidays and Heritage Day are removed but restorable. The seven retained occasions have uploaded 128px PNG icons: Christmas, CustomVibe birthday, Easter, Father's Day, Halloween, Mother's Day and Valentine's Day. All seven show Schedule off, Theme not created and Not started, with no dates. The original website is showing and nothing is scheduled. Christmas's observed wording editor contains the owner's test headline; history records draft saves and applied settings with scheduling off.

A local UI-observation file, output/admin-consistency-review/live-occasion-review.json, captures those removals, uploaded icon bytes and observed Christmas draft wording. It is not a full production backup. The review server accepts --occasion-review=/absolute/path/to/that/file to copy only those choices into its disposable in-memory database. Production seed defaults and storage have not changed. Future deployment must preserve the current production seasonal database, including any newer owner edits, and must never replay this local observation file into production.

Local verification confirmed seven visible occasions, three removed, all seven uploaded icons loaded, Schedule off/Not started, the observed Christmas headline in the editor and original storefront fallback. This follow-up remains local pending owner visual acceptance.

## Approved release follow-up

The owner approved publishing the local admin styling and requested recommended occasion dates. Recommendations appear as plain guidance on occasion cards and in Schedule; saved fields are never populated, no API writes occur and scheduling stays unchanged. An existing campaign start selects its year; undated occasions show the next unfinished display window. Custom occasions and the business birthday ask for the occasion/anniversary date instead of inventing it. Removed occasions are not restored.

Suggested display windows: Christmas 1 December to 27 December; Halloween 17 October to 1 November; Valentine's Day 1 February to 15 February; Easter two weeks before Easter Sunday to the Tuesday afterwards; Mother's/Father's Day two weeks before their South African date to the next Monday. Starts are 08:00, ends 00:00. Restored Heritage, Spring and Summer occasions also have guidance. These are design recommendations, not delivery promises or order cutoffs.

Calendar references checked: https://www.gov.za/about-sa/public-holidays and https://www.timeanddate.com/holidays/south-africa/2027. Gregorian Easter is calculated per year; Mother's Day is the second Sunday in May and Father's Day the third Sunday in June. Date tests cover 2026, 2027, 2028, past-window rollover and cross-year summer ranges.

Release source starts at 2f77d7b, retaining the already published five-style artwork work and excluding other unapproved local changes. No seasonal database migrations or writes are part of this release.

Pre-release verification: current-production release checkout passed public/SSR/admin builds and all 254 tests. Admin dry-run bundle succeeded. Existing CONTENT_DB binding, AUTH service, gate, manual sending flags and credential presence were checked before deployment. Mobile recommendations fit at 390px with seven visible occasions and no overflow.
