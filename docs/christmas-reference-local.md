# Christmas reference build, 18 October 2026

Current decision: the owner subsequently authorised installing this build in the live existing Christmas occasion while inactive. Earlier local-only and deployment-pending notes below are historical. See [inactive release](christmas-inactive-release.md) for current approval, release and verification status.

## Decision and scope

Tim rejected the five new concepts, supplied a dark plum photo-tree reference, then explicitly said to build locally and refine the working version together. This authorizes implementation, not final acceptance, deployment, Ready to use status or activation.

Worktree: `research/customvibe-christmas-local`, branch `codex/christmas-reference-local`, based on `53299fb`. Concurrent uncommitted catalogue work in `customvibe-style-release` is excluded. Before any eventual deployment, reconcile with the latest shared implementation and build site and admin from the same revision.

Reference: `output/christmas-concepts/2026-10-18/owner-selected-reference.png` in the project workspace. Prior five images are rejected historical material. Existing Christmas occasion is `christmas`; no occasion or campaign is created in production.

## Implementation checklist

- [x] Scope components, styles, asset and effects to Christmas.
- [x] Plum background, large cream heading, lavender final line, berry action, warm tree lights/star/pine/bow and subtle snow.
- [x] Recompose original shared hero children, preserving exact MagnetPhoto components, current prices, copy fields and links.
- [x] Keep current navigation, section order, collections, product controls and workflows.
- [x] Desktop photo tree and stacked mobile composition.
- [x] Keep admin chrome unthemed; existing preview runs the actual shared application.
- [x] Preserve saved production wording. Reference copy exists only in the local fixture draft. Blank fields use original content.
- [x] Retain readiness, schedule/manual confirmation, SAST timing and visitor preferences.
- [x] Animation is paused by visitor choice and disabled by reduced-motion media query. Snow overlay is pointer-events:none and aria-hidden.
- [x] No production writes, email services, payments or deployment.
- [ ] Final owner review and further refinements.
- [ ] Separate explicit production deployment approval.
- [ ] Separate explicit Ready/schedule/manual activation approval.

## Local review

Build the site and admin with the existing scripts. Run `node scripts/christmas-preview-server.mjs`. The script prints a local access link which sets a short-lived browser session for its in-memory fixture. The review is at `http://127.0.0.1:5199/christmas-review`; wording and authentic draft/date controls are at `/themes?view=occasions`.

The review shell frames `/preview`, the actual shared application. It is not a second storefront or catalogue. It provides desktop/mobile and page choices for visual inspection. All routes, assets and data require the local session. The server binds only 127.0.0.1, checks the Host header, supplies synthetic local admin auth to the actual admin worker, has no production bindings, and rejects customer-service APIs. State resets when stopped. None of these review fixture files are imported into production builds.

Local saved campaign retains the live observed test headline and 1 Dec 08:00 to 27 Dec 00:00 one-time dates, with schedules off. The local draft separately contains the reference wording, decorations and motion. Installing code does not mark it Ready.

## Verification

Baseline before changes: site build plus 261 tests passed. Updated site/SSR/prerender and admin builds passed; 263 tests passed, including new Christmas installation/readiness/date-boundary and draft-isolation checks. Additional visual evidence and final checks are recorded below as completed.

Public gating, authentication, password protection, preview form restrictions, payment state and server code are unchanged. Existing suite covers customer/admin services and seasonal storage. No claim of production verification for this un-deployed theme.

### Browser evidence

Saved under the project workspace `output/christmas-local/`:

- `desktop-home.png`, `desktop-home-full.png`, `mobile-home.png`: reference composition and preserved section order.
- `desktop-collections.png`, `mobile-collections.png`: existing catalogue and filters.
- `desktop-studio.png`, `mobile-studio.png`: existing photo workflow and controls.
- `desktop-basket.png`, `mobile-basket.png`, `populated-basket.png`: existing basket; selected A in Watercolour storybook, added locally, total R50 with delivery additional.
- `desktop-contact.png`, `mobile-contact.png`: current contact page; preview submission disabled.
- `theme-off-desktop.png`: original page and original wording return; snow disappears. Mobile theme-off also visually checked.

Admin preview checks: emptied all four wording fields and confirmed original heading/body/button with Christmas appearance; switched to Website at selected date and confirmed original appearance with no Christmas toggle, then restored reference draft fields without changing saved settings. Pause snow changes to Resume snow. Reduced-motion behavior was checked in the existing runtime and the scoped CSS media rule; OS-level emulation was not available in this browser session. Final cross-device owner acceptance remains open.

Final paired builds and whitespace checks passed after contrast and mobile-spacing refinements. The last full test run passed 263/263; the seven focused seasonal checks also passed after the build. Unauthenticated HTTP request to local `/preview` returned 401. Production source/server routes, deployment configuration and customer service code are unmodified.

Founders Hub: existing seasonal parent remains In progress. Added and verified `Build and verify selected Christmas theme locally` in Website & checkout, In progress, with scope and progress. Added and verified `Deploy Christmas theme after owner approval`, Planned, with explicit readiness and activation separation. Existing final-direction review retains owner acceptance. Intermittent Unconfirmed save/HTML response errors were encountered; a failed long progress comment was absent on reopening and was replaced by a shorter persisted update. No duplicate task was created for that retry.

### Christmas toggle refinement

Tim requested a small 3D Christmas hat with an animation when switched on and off. Reused the existing transparent Santa hat asset in the Christmas asset folder. A Christmas-only control component adds a short bounce on and a gentle tilt off. Its animation uses the existing campaign motion flag, visitor motion preference and reduced-motion preference. The small control remains available when the theme is off so it can be enabled again; page decorations and theme styles still disappear. Other occasion icons use their existing rendering.

Paired site/SSR/prerender and admin builds passed, as did all seven focused seasonal tests and the whitespace check. Browser checks confirmed desktop/mobile appearance, Christmas on/off, restoration of original content, and toggling with seasonal motion paused. Reduced motion is covered by runtime and CSS guards; OS-level emulation was not available. Saved visual evidence: `output/christmas-local/christmas-hat-preview.png`. Local preview restored to Christmas on with motion available. Final owner acceptance and deployment remain pending.

### Slider correction

Tim clarified that the Christmas control must be a slider. The 3D hat is now the thumb on a flat rounded track: left/off, right/on, with a short spring slide and tilt. It retains the existing persisted visitor choice and motion guards. Christmas uses accessible switch semantics; all other occasions retain their controls. Site/SSR/prerender and admin builds, seven seasonal tests and whitespace checks passed. Desktop/mobile, mouse on/off and keyboard activation verified in the local browser. Evidence: `output/christmas-local/christmas-slider-preview.png`. This supersedes the earlier static-position bounce control. No deployment or activation.

### Festive slider refinement

Owner requested a more distinctive animated slider. Current version has an 84px snowy track, gold stars revealed when on, a sliding 3D hat with a brief hop/tilt, and a one-shot sparkle. Animation only runs after interaction, never loops, and respects campaign, visitor and OS motion preferences. Tablet/compact desktop header placement is kept consistent while this Christmas switch is present, so turning the theme off does not move the control mid-animation. This is scoped to the Christmas control; headers without it remain unchanged.

Verified paired builds, seven seasonal tests, whitespace check, desktop/mobile appearance, keyboard switching, original appearance on off, and toggling with motion paused. OS reduced-motion guards inspected in source, not emulated. Evidence: `output/christmas-local/christmas-slider-festive.png`. Preview restored to on with motion enabled. Owner acceptance and deployment remain pending.

### Larger hat and smoother glide

Owner requested a larger hat and more visible, smoother movement. Increased the hat from 48px to 60px (25%), widened the track to 92px, and extended its travel to 56px over 900ms with ease-in/out. Replaced the sharp hop with a gentle 1050ms tilt and timed the sparkle near arrival. Motion guards are unchanged. Paired builds, seven seasonal tests and whitespace checks passed. Browser verified desktop/mobile fit, both states, keyboard activation and visible intermediate slide position. Evidence: `output/christmas-local/christmas-slider-larger-smooth.png`. Local only; final acceptance and deployment remain pending.

### Whole-page appearance crossfade

Owner requested that the whole theme fade on/off with the slider. Explicit Christmas visibility changes now use a 900ms same-document View Transition of the current shared storefront, with the slider isolated as a live animation layer. Theme attributes commit before capture via a layout effect. No cloned interactive page or duplicate catalogue is created. This applies to the homepage and other current shared pages. Initial loading and other occasions retain their behaviour. Motion-off/reduced-motion choices skip the crossfade; older browsers without View Transitions also retain instant switching. Temporary transition scope is removed after completion or cancellation.

Verification: site/SSR/prerender and admin builds passed; all 267 tests passed, including four new transition tests covering scope cleanup, motion/compatibility bypass, interrupted transitions and snapshot failure. Browser observed intermediate crossfade frames in both directions on the desktop/mobile homepage and on Collections, verified original appearance after completion and instant switching with motion paused. Source guards for OS reduced motion remain in place; no OS emulation claim. Evidence: `output/christmas-local/christmas-theme-crossfade.png`. Local preview restored for review. Founders Hub update records this revision separately from pending owner acceptance and deployment.

Implementation reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition and https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using

### Hat handle with a pop

Owner explicitly approved using the hat itself as the handle and asked for a pop. Removed the white circular thumb background. The hat retains its smooth 900ms travel, then briefly squashes, scales up and settles at either end over a 1300ms sequence. The on-state sparkle now coincides with arrival. Whole-page fade, visitor preferences and reduced-motion guards are unchanged.

Paired site/SSR/prerender and admin builds, all 11 focused seasonal/transition tests and whitespace check passed. Browser checked on/off, keyboard activation, desktop and mobile fit. No new shared styling, activation or deployment. Current evidence: `output/christmas-local/christmas-hat-handle-pop.png`. Final owner acceptance remains open.

### Integrated head and stronger landing pop

Owner wanted the small head-like appearance back as part of the hat, plus a more noticeable landing pop. Added a softly shaded ivory head tucked behind the brim inside one animated character wrapper. Hat and head now tilt, squash and pop together; the horizontal handle itself retains the 900ms glide. The 1500ms character sequence squashes at arrival (900ms), peaks at 32% larger on / 28% larger off, then settles. On-state sparkle is timed after arrival. This supersedes the hat-only resting appearance, without restoring a separate circular knob.

Paired builds and 11 focused seasonal/transition tests passed, with whitespace checks. Desktop/mobile fit and both toggle directions checked. Existing motion guards and whole-page fade retained. Evidence: `output/christmas-local/christmas-hat-head-pop.png` and `christmas-hat-head-header.png`. Final owner acceptance and production deployment remain pending.

### Larger circular head

Owner requested a larger circle and explicitly allowed it to exceed the track. Head is now a 40px circle over the 36px track, centred beneath the hat. The shared character animation, pop, slide and page fade are unchanged. Paired builds and whitespace checks passed; desktop/mobile fit verified. Evidence: `output/christmas-local/christmas-larger-circle.png`. Local only, pending final review and deployment approval.

### Slider storyboard exploration

Owner found that the enlarged circle breaks out of the hat and requested several creative image storyboards before further implementation. Generated four separate storyboard images using built-in image generation: Snowcap Buddy, Santa Peekaboo, Snow Globe and Gift Pop. Each depicts Off, Glide, Pop and On, with a small header context and an off-direction note. The first two integrate the head into a complete character silhouette; the latter two explore a globe and gift handle. Current local implementation is unchanged while selection is pending.

Images and complete prompts: `output/christmas-slider-storyboards/2026-10-18/` in the project workspace, including `prompts.json`. These are visual proposals, not implemented animations. Generated header typography and incidental decorative branding are illustrative, not approved replacements for shared branding. Any chosen design must preserve the current site's branding and navigation, motion preferences, original/theme-off behaviour and whole-page fade. Owner selection, refinement, implementation, verification and deployment remain separate stages.

Founders Hub storyboard update could not be confirmed: the original review note and a shorter replacement both returned Unconfirmed save. Checking the original did not resolve it; a fresh view showed the first note absent. No further retries were made. The four-option review checkpoint is preserved here and in prompts.json, but its board activity remains unconfirmed.

## Santa Peekaboo selected, 18 October 2026

The owner selected storyboard 02 and authorised its local implementation. This supersedes the separate hat/head-circle exploration. Final theme acceptance and production deployment remain pending.

- [x] One continuous illustrated Santa head with integrated hat, face and beard.
- [x] Sleep at left when off, wake during 900ms glide, upright happy pop at arrival, wink when on.
- [x] Lavender track with miniature pines, a moon when off and gold stars when on.
- [x] Gentle return and sleepy landing when switching off.
- [x] Existing whole-page fade and visitor/OS motion preferences retained.
- [x] Desktop/mobile appearance, keyboard on/off and paused-motion switching checked in the authenticated shared-site preview.
- [x] Focused seasonal/transition tests: 11 passed. Site, SSR, prerender and admin builds passed.
- [ ] Owner acceptance of the revised control.
- [ ] Separate explicit production deployment approval.

New asset: `public/assets/seasons/christmas/santa-peekaboo-poses.png`, generated with the built-in image tool from the selected storyboard. Full prompt and provenance: `docs/santa-peekaboo-asset.json`. The transparent original sheet is preserved; SVG viewports select the four poses without raster edits. The older hat asset remains available. Pose animation completion cannot prematurely cancel the parent landing animation. No runtime, activation, scheduling, admin workflow, catalogue or customer API changes in this refinement.

Evidence: `output/christmas-local/santa-peekaboo-desktop.png` and `santa-peekaboo-mobile.png` in the project root. Founders Hub existing “Build and verify selected Christmas theme locally” activity saved successfully with the selection and local verification. Status remains In progress. OS reduced-motion handling is retained in source; OS-level emulation was not performed in this pass.

### Santa return refinement

Owner reported that switching off looked strange travelling backwards. Browser reproduction and the pose rules confirmed the same right-facing awake sprite was used for both directions, followed by an abrupt cut to sleep. The off journey now mirrors and aligns the awake pose so Santa faces left with the hat trailing right. A small settling squash replaces the return bounce, and the awake/sleep poses blend over 210ms after the 900ms glide. The on sequence, page fade, asset, runtime and motion guards are unchanged.

Verified the return frames on desktop and mobile, plus the resting off state and forward switch. Site, SSR, prerender and admin builds and whitespace checks passed. Evidence: `output/christmas-local/santa-peekaboo-return.png`. This is a CSS-only local refinement; final acceptance and deployment remain pending.

Founders Hub progress comment encountered the recurring “Unconfirmed save” response interruption. The frontend's Check original save action was used; persistence is not yet confirmed. The complete return-refinement note remains saved here locally.

### Continuous pose handovers, 18 October 2026

Owner reported a jump from sliding into the still image in both directions. Investigation found differently positioned faces in the sprite viewports, stepped on-state opacity changes and a keyed character remount at animation completion. This supersedes the earlier handover timing notes.

- [x] All five rendered poses (including the mirrored return) use the same face anchor and display scale.
- [x] Sleep/wake, wake/pop and pop/wink overlap smoothly; the final on handover lasts 330ms.
- [x] The left-facing return blends into sleep over 360ms after arrival.
- [x] The character remains mounted. Each animation's final opacity and transform match its resting state exactly.
- [x] Pose layers blend within an isolated character to avoid a transparency dip during overlaps.
- [x] Direction changes are applied before paint, avoiding a flash of the destination resting pose.
- [x] Desktop/mobile visual sequences and paused-motion on/off verified in the local preview. The page fade remains intact.
- [x] 11 focused seasonal/transition tests, site/SSR/prerender/admin builds and whitespace checks pass.
- [ ] Owner acceptance and separate deployment approval remain pending.

No production settings, shared content, catalogue or customer/admin functionality changed. Existing OS reduced-motion logic remains; OS-level emulation was not repeated. Supporting screenshots: `output/christmas-local/santa-smooth-handover.png`.

Founders Hub: attempted an activity update on the existing local-build subtask, then used Check original save. The frontend again returned Unconfirmed save due to an interrupted response. Persistence is unconfirmed; this local document preserves the update. No duplicate task was created and no completion status changed.

### Single continuous Santa, 18 October 2026

Current owner decision supersedes the pose crossfades above: Santa must feel like one character moving and settling. The control now renders one persistent, front-facing Santa illustration. No pose replacement, mirroring, opacity animation or image blending remains on the character. His expression stays consistent; the off state is a relaxed tilt rather than a replacement sleeping image.

- [x] Same single illustration throughout travel, landing and rest.
- [x] Directional lean, arrival squash/pop and smooth settle animate the character itself.
- [x] Off journey ends in a gentle lowered tilt; on journey settles upright.
- [x] Interrupted animation samples its current transform before starting the opposite journey, while the horizontal CSS transition reverses continuously.
- [x] Paused motion cancels character animation and shows the static endpoint; existing campaign/OS/visitor guards retained.
- [x] Desktop/mobile visual checks, both directions, quick reversals and paused-motion switching passed in the authenticated local preview.
- [x] 11 focused seasonal/transition tests, site/SSR/prerender/admin builds and whitespace checks passed.
- [x] Existing Founders Hub local-build subtask activity updated, confirmed visible with All changes saved (11 comments).
- [ ] Owner review and explicit production deployment approval remain pending.

The previously generated sprite sheet is preserved as an asset, but only its single front-facing Santa is rendered. No new image generation or shared-site changes. Evidence: `output/christmas-local/santa-single-character.png`. Earlier unconfirmed Founders Hub updates are superseded by the successfully saved current-direction update.

### Restore Santa's personality with articulated parts

Owner clarified that the single-character change must retain the sleeping face, turning and playful expressions. This supersedes the fixed-expression decision above. The current implementation uses one textured character with moving facial features and a flexible hat, never a crossfade between complete Santa pictures.

- [x] Closed curved eyelids at rest when off; eyes open smoothly while waking.
- [x] Head yaw and facial parallax look into the direction of travel, returning to front at arrival.
- [x] Independently flexing hat follows the motion; existing squash/pop/settle retained within header bounds.
- [x] One eye closes into the on-state wink; both eyes close at the off endpoint.
- [x] Facial interpolation and body motion resume from the live state on reversal.
- [x] Motion pause cancels both animation systems and draws the correct resting expression immediately.
- [x] Desktop and mobile travel, expressions, quick reversal, paused motion and restored motion visually checked.
- [x] 13 tests pass: existing 11 seasonal/transition checks plus facial interpolation, endpoints and interruption continuity. Site/SSR/prerender/admin builds and whitespace check pass.
- [ ] Owner acceptance and separate production deployment approval remain pending.

Artwork: `public/assets/seasons/christmas/santa-rig-base.png`, created with the built-in image-generation tool using the previous Santa sheet as a strict visual reference. Full prompt and provenance: `docs/santa-rig-asset.json`. The image has a blank facial area for live vector eyes and nose. Complementary clipped portions of the same texture allow hat flex with a fixed seam; the character is never replaced or faded. Older artwork remains available. Tests: `tests/santa-motion.test.mjs`.

Evidence in project root: `output/christmas-local/santa-rig-preview.png` and `santa-rig-sleep-mobile.png`. Existing OS reduced-motion guard remains wired into the animation; OS-level emulation was not repeated. No production content, activation settings, admin/customer workflow, schedule or readiness changes.

Founders Hub: attempted an update on the existing local-build subtask and used Check original save. The frontend again reported Unconfirmed save with an interrupted response. The current progress note is preserved here; its remote persistence is not confirmed.

### Slider-only Christmas control

Owner accepted the animated character and requested removing the Christmas on/off wording and Settings. This is acceptance of this control refinement, not deployment or final theme approval.

- [x] Christmas header displays only the animated Santa slider, with spacing for the protruding character.
- [x] Accessible name remains Christmas theme, with switch state and keyboard operation.
- [x] Separate Pause snow control and existing reduced-motion guards retained.
- [x] Other occasions retain their existing wording and Settings controls.
- [x] Desktop/mobile appearance and keyboard on/off verified in the authenticated local preview. Site/SSR/prerender/admin builds and whitespace check pass.
- [x] Existing Founders Hub subtask updated successfully: 12 comments and All changes saved. Combined note also records the previous articulated-character update whose earlier save was unconfirmed.
- [ ] Final theme approval, deployment and activation remain separate pending decisions.

Evidence: project-root `output/christmas-local/santa-slider-only.png`. No production changes.

### Mobile header top row

Owner requested the Santa slider on the top row instead of its own row.

- [x] Christmas control, wordmark, basket and menu share one mobile row in both theme states; navigation expands underneath.
- [x] Existing wordmark becomes compact within this occasion's mobile header; Santa keeps its size. Below 375px only the track/travel shorten to make room.
- [x] Scoped to headers containing the Christmas slider. Other occasions and pages without a campaign retain the shared layout.
- [x] Browser checks at 390px and 320px: on/off fit without a second row, keyboard toggle, open menu and Escape close. These are browser-width checks, not physical-device testing.
- [x] Site/SSR/prerender/admin builds and whitespace check pass. Animation logic and safeguards unchanged.
- [ ] Owner review and production deployment approval remain pending.

Evidence: project-root `output/christmas-local/santa-mobile-top-row.png`. The temporary 320px review width was restored to the normal 390px mobile review setting.

### Santa-led theme redesign exploration

Owner now wants the Christmas theme redesigned around the established Santa Peekaboo character and its soft dimensional art style. This authorises new visual exploration, not replacing the current working theme. The existing local build is retained unchanged while the owner chooses a new direction.

- [x] Re-inspected live storefront after owner sign-in, current shared content/prices/section order and studio journey; existing live Christmas occasion still Not started. Saved test headline remains untouched.
- [x] Generated five separate homepage concept images using the exact Santa expression sheet, fresh live homepage capture and original photo-magnet composition as visual references.
- [x] Displayed order: 1 Santa's Wrapping Table; 2 Santa's Snowglobe World; 3 Santa After Dark; 4 Santa's Big Surprise; 5 Santa Comes Home.
- [x] Images visually reviewed and saved with full prompts, provenance and implementation caveats in project-root `output/christmas-santa-redesign/2026-10-18/brief-and-prompts.json`.
- [ ] Owner selection and refinement of the new visual direction.
- [ ] Build selected replacement locally after visual approval, retaining the existing working theme for comparison.
- [ ] Responsive/other-page verification, final owner approval and separate deployment/activation approval.

Generated collection artwork and incidental navbar symbols are illustrative. Any build must retain the exact existing catalogue assets, shared content, working Santa slider, motion safeguards and mobile top-row layout. No application code, production settings, customer records or emails changed for this exploration.

Founders Hub: updated the existing Review local themes and approve final direction description and added the Santa redesign activity. Used the current Save task control, then reopened the record: revised description, five comments and All changes saved confirmed. Status remains In progress. No new task or occasion was created.

### Selected Santa direction: real tree and recurring peekaboo cameos

Owner selected Santa After Dark (displayed option 3), requesting a proper Christmas tree with lights held by Santa, plus the peeking Santa used throughout option 2. The annotated crop is preserved as `output/christmas-santa-redesign/2026-10-18/owner-peeking-santa-reference.png`.

Generated and visually reviewed `06-refined-tree-and-peeking-santa.png`: green evergreen branches with warm lights, real-photo magnet ornaments and Santa visibly holding the tree; plum nighttime scene retained; playful Santa cameos at collections, story and how-it-works boundaries. Full prompt/provenance: `refined-tree-and-peek-prompt.json` in the same folder. Current stage is owner review of this combined image before implementation. Existing local theme remains intact. Incidental generated slider rendering and catalogue artwork are illustrative; reuse the actual approved control, product files and shared content when building.

Founders Hub update attempted on the existing visual-review subtask. Save task and Check original save both returned Unconfirmed save with an interrupted response. The selected direction and image evidence are preserved locally above; persistence of the revised remote description is not confirmed.


### Santa World local build, 18 October 2026

The owner approved `06-refined-tree-and-peeking-santa.png` and explicitly requested the local build. This supersedes the exploration-only status above. Final appearance acceptance and production deployment remain separate.

- [x] Retained previous compiled preview at authenticated loopback port 5198, plus source archive in `research/customvibe-christmas-reference-preserved/`. Each preview has a separate cookie when started with the current server script.
- [x] Generated hero Santa/tree, backdrop, snow divider and two peeking poses with provenance under `public/assets/seasons/christmas/santa-world/`. Original photo magnets remain separate shared React components.
- [x] Christmas-only CSS/hero changes: plum hero, lit fir tree, collection peek, cream story section and peeking story/how-it-works characters. Shared content, products, prices, routes and interactive story gallery retained.
- [x] Existing single-character animated slider, mobile top row and page crossfade left unchanged.
- [x] Desktop 1440px, intermediate width, 390px and 320px browser layouts inspected. Collection descriptions have dark text; repeated forest seams removed; original decorative thread hearts hidden only in this theme to prevent overlap.
- [x] Homepage on/off, pause/resume, mobile navigation open/Escape close, shared gallery, Collections, Studio, Basket and Contact access checked. Preview submission controls remain disabled. No real emails or production records touched.
- [x] In local admin, blank headline inherited current original wording; restored original draft without saving test changes. This draft shows the new design. Selected-date preview shows the original website when no approved eligible schedule exists. Ready status, dates, recurrence and activation unchanged.
- [x] Site/SSR/prerender/admin builds pass. All 269 existing tests pass, including seasonal activation, authentication, draft isolation and motion/fade fallback checks. Preview unauthenticated requests return 401 on both ports. Final script syntax and whitespace checks pass.
- [x] Final screenshots in project-root `output/christmas-local/santa-world-*.jpg`. Visual comparison and limitations in `design-qa.md`.
- [ ] Owner review of the working replacement.
- [ ] Before deployment: optimise new raster delivery, recheck the unattributed browser observer diagnostic in a clean browser, physical-device/reduced-motion spot check.
- [ ] Explicit deployment and activation approvals, then live verification.

Browser console inspection found an unattributed MutationObserver observe argument error captured by the browser tool; no MutationObserver use exists in app/admin/preview source and no broken interaction was observed. Do not claim a completely clean browser console. This diagnostic needs attribution before production. PNG art is approximately 9 MB combined and remains at original quality for this local review.

Founders Hub: existing build and final-review descriptions saved, progress/owner-decision activity added. Status stays In progress so neither owner acceptance nor deployment is implied.
