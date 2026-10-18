# Admin confirmations, sign-in recovery and South African time

Owner approved implementation, testing and live publication on 18 October 2026. No order, catalogue or occasion data migration is required.

## Changes

- First-proof preparation, replacement publication and review-link revocation require an accessible confirmation. Copy distinguishes clearing approval on replacement from retaining recorded approval on revocation. Cancel and Escape leave records untouched; Cancel receives initial focus and closing restores focus.
- Shared admin sign-in recovery warns before expiry and handles expired sessions without unmounting loaded orders or discarding edits. Sign in in a new tab, return and check sign-in, then explicitly retry the intended action. No write or customer email is automatically replayed. Selected artwork remains only in the open tab's memory, with a leave-page warning; closing the tab cannot recover those files.
- Orders, history and artwork expiry use Africa/Johannesburg in 24-hour time regardless of the device timezone. Themes already used South African time.

## Verification before publication

- 276 automated tests passed, including 401 recovery with no replay, deadline warnings, connection failure distinction, proof consequences, authentication preflight and timezone boundaries under UTC, Los Angeles and Auckland.
- Public build, SSR build, 27-page prerender, admin build and prepared assets passed.
- Local browser: proof cancel/Escape/focus, expired publication blocked with revision retained, sign-in recovery without publication, explicit retry succeeds; catalogue and occasion wording survive expiry and save successfully after recovery. Catalogue reload preserved the saved field.
- Existing production authentication, gate, manual-send setting, credentials and bindings verified through the approved access helper. Payments remain disabled. No auth policy or retention changes.
- Local fixture controls never ship with the production admin bundle. No production emails, proof revisions or stage changes are needed for release verification.

## Publication

Pending release and authenticated smoke checks. Evidence is in output/admin-recovery-release in the project workspace. Founders Hub tracks three separate subtasks under Pass final website launch checks. The parent remains open for unrelated launch work.
