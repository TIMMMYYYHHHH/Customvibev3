# Admin audit fixes local review

Branch: `codex/admin-audit-fixes-local`, based on `53299fb`.

Goal: fix the four confirmed findings from the 18 October audit, starting with current-proof artwork. Local review only. Do not deploy or write live customer/settings data.

## Checklist

- [x] Current proof drives individual previews, downloads and quantities; original files remain clearly labelled before a proof exists. Verify approved and unapproved replacements, mixed source IDs, legacy orders and expiry.
- [x] Editable collection Contents survives saving and reading for built-in collections. Preserve other collection upgrades and owner settings.
- [x] Unsaved occasion edits survive internal navigation or require an explicit discard decision. Warn before leaving/reloading. Successful saves clear the warning; failed saves keep it.
- [x] Theme tabs retain focus and support Arrow keys, Home and End with one tab stop. Verify edits survive tab changes.
- [x] Run regression tests, full test suite, paired public/admin builds and isolated browser review.
- [x] Update the existing four Founders Hub subtasks with local evidence and pending owner review/live verification.

Implementation uses the existing OrderDetail and seasonal editor, with no design overhaul, no new dependencies and no production seed/reset. Shared catalogue code remains shared by the public site and admin preview. Local sample data must be visibly labelled and never send emails.

## Local verification

- Full Node suite: 266 passed, 0 failed, 0 skipped. Includes authentication, CSRF, order proofs, private artwork, expiry, manual email safeguards, content persistence and occasion date rules.
- Public client/SSR builds, 26-page prerender and admin build/preparation passed. Final artwork-label follow-up also passed the focused OrderDetail/archive suite and rebuilt admin.
- Browser: replacement revision 2 preview and individual image point to the replacement request; unchanged puzzle files retain their original source request. The downloaded JPEG matches the corresponding ZIP entry byte for byte. The ZIP has 12 entries, valid CRCs and approved revision/copy instructions.
- Browser: Alphabet Contents persisted after save and reload.
- Browser: unsaved Christmas and Easter copy survived leaving/reopening; saving one did not clear the other. Leaving the page was blocked while unsaved and worked after saving. The browser did not expose the native warning text to automation.
- Browser: explicit Discard restored the applied wording and cleared the unsaved state. The native confirm text was not exposed to automation.
- Browser: a second admin tab received a rejected concurrent save. Its wording and Unsaved changes remained after internal navigation; a retry saved and survived reload. Apply changes cleared the draft while leaving the schedule off and original website active.
- Browser: clicking tabs retained focus; Arrow keys wrapped; Home/End selected first/last; Tab entered the selected panel. Only the selected tab is in the tab sequence.

## Review locally

- Artwork sample: http://127.0.0.1:5203/orders?scenario=replacement-proof&order=11111111-1111-4111-8111-000000000001
- Collection content: http://127.0.0.1:5203/content
- Occasion editor: http://127.0.0.1:5203/themes?view=occasions

These are synthetic orders and an in-memory local database. Restarting the review server resets its settings. No production customer data, email sending, deployments or pushes were used.

Review steps: open the artwork sample and compare its individual download with Download current proof; edit a collection Contents field and reload after saving; edit occasion wording, switch away and return; use Arrow keys, Home, End and Tab on Appearance/Wording/Schedule. Save draft is still required to retain changes across a reload.

## Remaining release gates

- Owner review of these local changes.
- Explicit permission to publish, followed by protected live verification. Do not deploy as part of this local task.

## Founders Hub save issue

The signed-in frontend intermittently reports "Save unconfirmed". "Check original save" returned an HTML response instead of JSON. A fresh board view confirmed that some affected writes did persist, so no duplicate activity comments were blindly submitted. The collection task has its verified results and local review link; the unsaved-edit task status and updated acceptance criteria were confirmed. After checking the saved state and retrying only missing updates, all four existing fix subtasks now have their local verification activity and remain In progress for owner review. No duplicate tasks were created. The save/recovery error itself remains a Founders Hub issue outside this CustomVibe fix scope.

Screenshot evidence: `output/admin-audit-fixes-local/artwork.png` and `wording.png` in the project workspace. Test/build logs are in the same folder.
