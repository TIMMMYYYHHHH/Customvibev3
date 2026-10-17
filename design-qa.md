# Admin board light-mode design QA

Date: 17 October 2026
Status: Passed for implementation and local browser verification.
Owner decision: Direction 5, with light mode retained.

## Design

Open stage columns, matte warm-grey cards on a lighter page, thin borders, restrained plum text and berry actions. No card shadows, glow or gradients. Email update and Move order share a compact horizontal action row. Existing Fredoka and DM Sans fonts remain in use.

Reference and captured evidence are in the workspace output/admin-card-directions directory: 05-light-mode.png, 05-light-comparison.png, 05-light-card-comparison.png, 05-light-phone.png and 05-light-implemented.png.

The real implementation intentionally retains the private-store notice, unpaid counts, refresh action, accessible field labels and manual email guidance. These move the board lower than the generated reference. Text uses the actual brand fonts rather than the generated approximation. No unresolved P0, P1 or P2 visual issues were identified.

## Verification

- Isolated release snapshot based on a833a7c plus these three changed files, excluding concurrent unfinished work.
- Site build, SSR build and 26-page prerender passed.
- Complete isolated test suite: 226 passed, zero failed.
- Admin build and prepare-admin passed.
- Desktop at 1600px: four open columns, solid card fill, computed box-shadow none, no horizontal overflow.
- Phone layouts at 390px and 320px: one column, no horizontal overflow, expanded Move order controls fit.
- Search for Joe returns one card; unmatched search returns empty columns.
- Stage filter In progress returns the matching column.
- Move order changes a synthetic order stage; Email update reaches the existing manual preview controls. No messages sent or production records changed.
- No browser warnings or errors in the local preview.

## Release boundary

Only admin/Orders.jsx, admin/orders.css and the light-board fixture variant change application behavior or previews. Authentication, payment state, artwork retention, sending logic and backend workflows are unchanged. Live authenticated visual acceptance remains distinct from this local verification.
