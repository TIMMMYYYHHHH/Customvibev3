# Occasion date planning, local review

Owner decision, 17 October 2026: replace advisory recommended dates with actual date fields and optional occasion-relative rules. The owner approved the local review and authorised publication, including filling empty known occasion dates with schedules off. This supersedes the earlier local-only restriction.

## Review checklist

- [x] Remove suggestion text from compact cards and Schedule.
- [x] Populate empty known dates in the isolated local fixture with every schedule off.
- [x] Preserve existing dates, repeat choices, wording, icons, removed occasions, progress and appearance settings.
- [x] Fixed dates and Follow the occasion; first, second, third, fourth or last weekday of a month, day/month, or Gregorian Easter Sunday.
- [x] Start days before, end days after, start/end times, occasion year and one-time/yearly repetition.
- [x] Calculate actual dates before saving. Annual rules calculate each year rather than copying moving dates.
- [x] Validate rule shape, calendar dates, time values, mismatched calculated dates and overlapping enabled schedules server-side.
- [x] Preserve existing readiness, manual activation, authentication and CSRF protections.
- [x] Final local desktop/mobile, calendar and persistence checks.
- [x] Owner review and deployment approval.
- [ ] Publish and verify the live controls and populated dates, preserving latest settings.

## Current scope

Production remains on the previously published advisory-date version. The production seed is unchanged: no dates, no installed themes, schedules off. Existing production settings remain authoritative.

The local review at http://127.0.0.1:5201/themes uses a disposable local database and owner-observed settings. It is not a production backup. It has no production bindings and cannot send customer email or write production records. Local edits persist to `output/occasion-date-rules/local-settings.json` outside the repository.

Local known windows: Christmas 1 to 27 December; Halloween 17 October to 1 November; Valentine’s Day 1 to 15 February; Easter two weeks before Sunday through Tuesday at 00:00; Mother’s/Father’s Day two weeks before through Monday at 00:00. Starts are 08:00. The next unfinished window is chosen for empty fields. Removed occasions stay removed and their dates are not populated. The birthday stays blank because its anniversary date is unknown. Repeat choices remain unchanged; selecting Every year does not enable a schedule.

All times are South African. End times are exclusive: 00:00 ends at the beginning of that day. Fixed leap-day recurrences skip years without that date. Rule years are explicit, including when the lead-in begins in the previous calendar year. Rules support the existing 2026 to 2100 range.

## Files

- `src/seasons/date-rules.mjs`: pure calendar arithmetic and known occasion rules.
- `src/seasons/model.mjs`: annual occurrences, clone-to-year, overlap and readiness integration.
- `server/seasons.mjs`: validated rule persistence with optimistic revision protection.
- `src/seasons/occasion-summary.mjs`: consistent card summaries.
- `admin/seasons/admin.mjs` and `admin/workroom.css`: controls, calculated fields, calendar labels and responsive flat styling.
- `tests/fixtures/occasion-date-planning.mjs`: explicit local-only filling and preservation.
- `tests/admin-review-server.mjs`: optional local review settings file.
- `tests/occasion-date-rules.test.mjs`: moving dates, recurrence, leap/year boundaries, conflict and preservation checks.

## Local run

From this checkout, use the bundled Node runtime to run `tests/admin-review-server.mjs --date-rules-review=/absolute/path/to/output/occasion-date-rules/local-settings.json`.

The server binds only 127.0.0.1:5201. On restart it prepares the local fixture with schedules off. Production seed, deployment settings and databases are untouched.

## Verification

259 tests passed. Public, SSR/prerender and admin builds passed. Browser checks confirmed draft save/reload, changing offsets and year, Last Sunday rules, Easter 2027/2028, fixed-date editability, and faded calendar planning icons with separate Schedule off / Theme not created labels. The shared original storefront preview remains functional. At a 390px phone viewport the page has no horizontal overflow and fields stack cleanly.

All temporary browser-test edits were removed. A field-by-field comparison against the pre-change local snapshot verified preserved icons, removed occasions, copy, progress, repeat choices, appearance settings and draft membership. No production requests that save settings, deployment, email or customer-record changes were made.

Screenshots: `output/occasion-date-rules/desktop-controls.png`, `mobile-controls.png` and `calendar-planning.png` in the project workspace. The development checkout is `research/customvibe-admin-consistency-release`; the older shared migration checkout was not used for source edits. Founders Hub reuses the existing date subtask as **Set occasion dates with repeat rules**, under **Review seasonal themes and admin controls**, remaining In progress for owner review and any subsequent approved deployment.

## Approved release

Publishing from the latest production source, preserving newer collection-card and flat-control changes. Populate only empty live date fields through the authenticated admin after deployment, never by replaying the local fixture. Keep all schedules off and preserve wording, icons, removals, progress, appearance and repeat choices. Birthday remains unset unless the owner has supplied its anniversary. Live verification and release identifiers will be recorded below.
