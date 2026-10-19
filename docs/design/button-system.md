# CustomVibe buttons

Approved 18 October 2026: P1 Soft sticker with S1 Fresh mint. This is the current customer-facing button standard, replacing beige secondary controls.

| Role | Fill | Text | Use |
| --- | --- | --- | --- |
| Primary | `--cv-action` #ae2e5b | White | Main forward action, add photos, explore, add to basket, submit |
| Secondary | `--cv-secondary` #9ddcc4 | `--cv-selected` #291438 | Supporting action, change design, unselected tabs and options |
| Selected | `--cv-selected` #291438 | White | Active tab or choice, also expose aria-current/aria-pressed/checked |
| Disabled | `--cv-disabled` #e7e2dd | #776e7a | Unavailable action, retain native disabled semantics |
| Quiet | Transparent | Plum | Back, close, remove and low-emphasis text links |

Use `src/button-tokens.css` tokens. Customer control roles, including the flat secondary, selected and tool-control rules, live in `src/button-system.css`. `src/consistency.css` retains surface geometry and consumes shared tokens without redefining action, hover or radius values. Standard shop actions use `.button`, storefront actions use `.action`; add `.secondary` for supporting actions. Shared CollectionCard CTAs use the same tokens. Import the system in both customer and admin storefront-preview entry points. Admin now imports the shared palette through `src/button-tokens.css`; its selectors and layouts remain scoped in `admin/workroom.css`.

Buttons use Fredoka 650, softly squared 14px corners and flat solid fills. Body copy and detailed option labels retain DM Sans. Standard actions have at least 48px height; compact controls retain at least 44px targets and accessible names. Keep mobile widths flexible and allow labels to wrap when necessary.

Hover uses berry #92234b or mint #83ccb1. Selected choices stay plum. Focus uses a visible 3px plum or berry outline with separation from the fill. No decorative outlines, gradients, inset effects, glow or shadows. Focus outlines are functional and required. Disabled controls must not regain active colour on hover. The shared secondary disabled selector also overrides the legacy base secondary hover rule. Disabled Contact actions keep neutral fill and text inside the more specific storefront brand wrapper, including hover. Selected seasonal icon options are excluded from the generic secondary role so the existing plum selected role wins, while disabled icons keep their neutral role. Ordinary admin seasonal primary actions use the same shared berry tokens; seasonal artwork, preview backgrounds, accents and content palettes retain their approved scopes.

Preserve quiet links, destructive meanings, status flags, magnet artwork and exact print files. Seasonal themes retain their separately approved scope. Do not turn every element into a coloured button.

Reference concepts: `output/button-directions/P1-soft-sticker.png` and `output/button-directions/P1-secondary-colours.png` (S1).

## Publication

Owner approved publication after local review on 18 October 2026, preserving recent admin updates. Published implementation `5d7f76d72c14b757a4d996fe472a3a841cb2626e` on current main, including the latest Christmas header stability fix. All 305 tests pass; customer, SSR/27-page prerender and matching admin builds pass.

Protected site workflow [39137980447](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39137980447) succeeded, including before/after protection checks. Matching admin version: `3a88181a-cf53-4551-9349-de4ce68f6d8b`. Only three admin preview assets changed; separate admin application source, artwork, catalogue and seasonal records were not changed. Helper configuration restored byte-for-byte.

Post-publication API checks confirm exact live site revision, gate on, fail closed, preview submissions off and unchanged admin/security/catalogue bindings. A concurrent addition of the production locker API secret appeared between snapshots; it was preserved, never read or overwritten. Authenticated browser verification was initially pending owner sign-in because both website and admin sessions expired; it is now complete, as recorded below.

Authenticated live verification completed after owner sign-in. Homepage collection chooser and photo studio show Fresh mint #9ddcc4 secondary controls, plum selection, berry actions, 14px corners and neutral disabled states. The admin retains grouped Table, Fulfilled and manual Email update controls. Christmas remains OFF/In progress with schedules off, original saved wording and working Full screen preview. The embedded admin chooser uses the same mint controls while retaining the approved seasonal primary treatment. No customer, catalogue or seasonal records were changed and no email sent. Evidence: `output/button-directions/review/fresh-mint-live.png`. Founders Hub task Refine storefront button style is complete.

## Admin extension

The owner approved extending the same P1 / Fresh mint system to admin buttons on 18 October 2026. Orders, Store content, Themes & seasons, artwork and recovery dialogs use shared tokens. Secondary actions and unselected tabs are mint; primary actions berry; selected tabs plum. Buttons use Fredoka and 14px corners, while detailed option labels keep DM Sans. Preserve neutral panels, form fields, stage colours and disabled states. Destructive actions remain dark plum with explicit labels, quiet actions remain transparent. No behaviour, email automation, saved settings or records change.

Admin extension published as 9a38c36 on 18 October 2026 after preserving current main, including already-live locker and seasonal changes. All 318 tests and customer/SSR/admin builds pass. Site workflow 39141439028 succeeded; admin version 7320f2cf-58ef-48d0-aedd-614b4a8a10d1 published five changed assets. Local Orders, order details and Store content checked, including primary, secondary, selected and disabled states. Authenticated live verification completed after owner sign-in: Store content shows mint secondary controls, plum selected tabs and neutral disabled Save changes; Orders retains grouped Table and Fulfilled with mint Board and plum selected Table. Themes & seasons and the Christmas editor show the matching controls without shadows. Original CustomVibe remains active; Christmas is OFF/In progress with schedules off and saved wording retained. Evidence: `output/button-directions/review/admin-mint-local.png` and `output/button-directions/review/admin-mint-live.png`. No customer, catalogue or seasonal records were modified and no email was sent.

## Token maintenance

Keep default action, hover and control-radius definitions only in `src/button-tokens.css`. Approved seasonal scopes may intentionally override action tokens, such as the Christmas storefront theme; those are separate from the default definitions. Keep control role declarations in `src/button-system.css` for customer surfaces and `admin/workroom.css` for admin surfaces. Remove superseded declarations only with computed-style evidence. Field and panel radii, stage colours, F1 navigation and artwork are not general action-token cleanup targets.

The local `tests/fixtures/action-tokens-check.mjs` harness uses isolated synthetic public, admin and seasonal-admin HTML. It captures 375, 768 and 1440 px normal, hover and focus states, compares computed styles to committed baseline CSS, and probes the shared token source without making external requests. It is a CSS regression fixture, not live workflow verification. Run with `before`, then `after`, from the repository root. `before` reads the three affected CSS files from the current `HEAD`, so keep baseline and proposed edits separate until review.
