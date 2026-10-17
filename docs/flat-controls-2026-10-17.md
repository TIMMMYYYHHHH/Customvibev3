# Flat control styling

Owner-approved on 17 October 2026. Remove coloured tinted-outline controls and inset shadows. Keep solid selected/primary actions with contrasting text, flat neutral secondary actions and visible keyboard focus.

## Changed locations

- Admin navigation, secondary actions, catalogue tabs/product selection, order movement and stage selection: `admin/admin-shell.css`, `admin/orders.css`.
- Customer studio format and puzzle-size choices: `src/studio.css`, `src/consistency.css`.
- Collection filters, help topics, shared action buttons and Add photos: `src/consistency.css`.
- Full-set/custom collection choices and selected individual designs: `src/designs/collection-picker.css`.
- Lasting preference: `AGENTS.md`, `.better-web-ui.md`.

## Verification

Public client/SSR/prerender and admin production builds pass. Twelve existing admin UI/security/stage-move tests pass. Local browser checks confirm selection changes and 320px/390px collection layouts without horizontal overflow. Screenshots and final publication status are in the workspace report `output/live-flat-buttons/report.html`.

Changes are presentation only. The website password gate, separate admin authentication, disabled payments, manual email workflow and artwork retention are unchanged. Seasonal theme features are excluded. Other uncommitted coming-soon/artwork work is excluded from this publication.
