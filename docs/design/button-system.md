# CustomVibe buttons

Approved 18 October 2026: P1 Soft sticker with S1 Fresh mint. This is the current customer-facing button standard, replacing beige secondary controls.

| Role | Fill | Text | Use |
| --- | --- | --- | --- |
| Primary | `--cv-action` #ae2e5b | White | Main forward action, add photos, explore, add to basket, submit |
| Secondary | `--cv-secondary` #9ddcc4 | `--cv-selected` #291438 | Supporting action, change design, unselected tabs and options |
| Selected | `--cv-selected` #291438 | White | Active tab or choice, also expose aria-current/aria-pressed/checked |
| Disabled | `--cv-disabled` #e7e2dd | #776e7a | Unavailable action, retain native disabled semantics |
| Quiet | Transparent | Plum | Back, close, remove and low-emphasis text links |

Use `src/button-system.css` tokens. Standard shop actions use `.button`, storefront actions use `.action`; add `.secondary` for supporting actions. Shared CollectionCard CTAs use the same tokens. Import the system in both customer and admin storefront-preview entry points. Do not import it into the separate admin workroom.

Buttons use Fredoka 650, softly squared 14px corners and flat solid fills. Body copy and detailed option labels retain DM Sans. Standard actions have at least 48px height; compact controls retain at least 44px targets and accessible names. Keep mobile widths flexible and allow labels to wrap when necessary.

Hover uses berry #92234b or mint #83ccb1. Selected choices stay plum. Focus uses a visible 3px plum or berry outline with separation from the fill. No decorative outlines, gradients, inset effects, glow or shadows. Focus outlines are functional and required. Disabled controls must not regain active colour on hover.

Preserve quiet links, destructive meanings, status flags, magnet artwork and exact print files. Seasonal themes retain their separately approved scope. Do not turn every element into a coloured button.

Reference concepts: `output/button-directions/P1-soft-sticker.png` and `output/button-directions/P1-secondary-colours.png` (S1).

## Publication

Owner approved publication after local review on 18 October 2026, preserving recent admin updates. Published implementation `5d7f76d72c14b757a4d996fe472a3a841cb2626e` on current main, including the latest Christmas header stability fix. All 305 tests pass; customer, SSR/27-page prerender and matching admin builds pass.

Protected site workflow [39137980447](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39137980447) succeeded, including before/after protection checks. Matching admin version: `3a88181a-cf53-4551-9349-de4ce68f6d8b`. Only three admin preview assets changed; separate admin application source, artwork, catalogue and seasonal records were not changed. Helper configuration restored byte-for-byte.

Post-publication API checks confirm exact live site revision, gate on, fail closed, preview submissions off and unchanged admin/security/catalogue bindings. A concurrent addition of the production locker API secret appeared between snapshots; it was preserved, never read or overwritten. Authenticated browser verification is pending owner sign-in because both website and admin sessions expired.
