# Inactive Christmas installation, 18 October 2026

## Owner decision

Owner request: “This is a good start can we add it to live acuatoin thats not activated”. This authorises installation on the existing Christmas occasion, not Ready to use, schedule enablement or manual activation. Final design refinements remain open. No new occasion, campaign or seasonal-settings write is needed.

## Release scope

Prepared from latest main 258d3bf, preserving Handy personalisation, current admin recovery and fulfilled-order work. Includes only the installed Christmas registry, scoped Christmas components/assets, shared runtime integration and relevant tests. Shared page structure, catalogue, prices and functionality remain live sources. The existing admin preview displays the same application. Local fixture servers and reference wording are excluded from production.

Santa World uses the approved soft Santa character holding a lit Christmas tree, photographic magnets, snowy sections, peeking cameos and the animated Santa slider. Assets are lossless WebP with exact decoded RGBA equality to the reviewed PNGs: 10,930,216 to 7,456,216 bytes. The approved older local draft remains preserved separately for comparison.

## Baseline and acceptance checklist

- [x] Site, SSR, prerender and admin builds pass on latest implementation.
- [x] All 300 automated tests pass; whitespace checks pass.
- [x] New release preview visually checked with Santa/tree and shared hero content.
- [x] Existing production targets, auth bindings, gate, credential presence and disabled preview sending pass read-only deployment guards.
- [x] Live Christmas baseline: Not started, Theme Not created, Schedule Off, manual activation off. Original website showing now, nothing scheduled.
- [x] Preserve saved headline “I am testing / What this preview looks like”; other wording fields blank and inheriting current website copy.
- [x] Preserve 1 Dec 2026 08:00 to 27 Dec 2026 00:00, one time only, South African time, schedule disabled.
- [x] Publish matching site, catalogue and admin.
- [x] Verify authenticated live draft, original/date preview, saved settings and public protections.
- [x] Record saved Founders Hub deployment result.
- [ ] Final owner design acceptance. Separate from installation.
- [ ] Ready to use / activation approval. Not authorised by this request.

No security Worker deployment, database migration, customer-record write or email sending is part of this release. No service upgrades. No seasonal-settings record was written. Existing draft decorations and motion remain disabled as saved; static Santa artwork is installed and visible.

## Verified production result

Implementation 2fe5e3077f65d53fd99a7849bbf60e9f4131c097. [Site workflow 39110287681](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39110287681) succeeded. Catalogue version 2c30a636-05eb-4a51-864a-67ee763e97e4. Admin version ff9732bd-6b96-4292-8000-055c4dcd84fa. Both temporary deployment-helper configurations were restored byte for byte. Security Worker unchanged.

Post-deployment guards confirm the exact production commit, site gate, private service bindings, admin authentication, credential presence and disabled preview sends. Live admin still shows Payments unavailable and current retention guidance. Reloaded live admin confirms Christmas installed, progress Not started, schedule off and manual toggle unavailable. Other occasion installation/progress states and three removed occasions are unchanged.

Authenticated This draft displays the Santa/tree artwork and slider on desktop and mobile. Switching the visitor control off returns original appearance and wording; switching on restores Santa. Saved test headline remains, and blank eyebrow/body/button fields inherit shared current copy. Website at selected date and refreshed live storefront both show original CustomVibe. Saved dates/repetition remain unchanged. No browser warning/error logs observed on the live admin preview. No live form submission or customer mutation was performed.

Screenshot: project workspace `output/christmas-live/installed-draft.jpg`. Full design evidence remains in the linked local reference notes. Final owner acceptance and any activation decision remain open.

Founders Hub: existing Deploy Christmas theme after owner approval subtask is Done with verified activity. Parent Review seasonal themes and admin controls remains In progress (6/8), retaining design/build review work. Parent scope and release links were updated to distinguish installed inactive draft from final design and activation approval.

## Motion follow-up, 18 October 2026

Owner reported the live draft lacked the local slider animation and effects. Root cause confirmed: existing saved Allow gentle motion and Seasonal decorations flags were both false, and installation preserved them. The installed runtime gates the slider and theme fade on campaign motion, while snow requires decorations. Owner request authorises enabling these two flags in the existing draft only. After the owner restored admin sign-in, saved the existing draft with both flags enabled using Save draft only. Reloaded the admin and reopened Christmas to confirm both flags persisted. Desktop and mobile checks observed the Santa handle moving between ends and whole-theme crossfade in both directions; Pause snow is available. Christmas remains OFF, original website showing now, nothing scheduled. Wording is preserved. No Apply changes, readiness, schedule, manual activation or code deployment was performed. Founders Hub records the resolved follow-up on the same deployment subtask. This supersedes the earlier disabled-draft-motion state; public applied settings remain unchanged.

## Owner-requested draft wording, 18 October 2026

The owner explicitly requested replacing the saved test wording with the current local preview copy while inactive. Saved only the existing Christmas draft through the authenticated admin:

- Intro: For your favourite people
- Headline: What do you get / someone who has / everything? (three lines)
- Body: A little piece of a memory you share.
- Button: Make your magnets

Reloaded the admin and reopened Christmas to verify all four fields persisted. The overview shows Original CustomVibe and Nothing scheduled to go live; Christmas remains OFF. Motion and decorations remain enabled in the draft. No Apply changes, readiness, schedule, dates, repetition or activation changes. This supersedes preserving the test headline in the draft; applied campaign wording remains unchanged. Evidence: project output/christmas-live/wording-saved.jpg. Recorded on the existing Review local themes and approve final direction subtask in Founders Hub.
