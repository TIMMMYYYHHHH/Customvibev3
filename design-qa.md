# Coming soon worktable design QA, 17 October 2026

Final result: passed.

The owner-attached worktable reference supersedes the mistaken fridge selection. Compared the source and implemented screenshot at 1536 x 1024, login closed. Centred headline, lilac label, tabletop composition, hands, ribbon, tissue and footer match; original product photos and the actual brand logo intentionally replace generated imagery. Mobile verified at 390px and 320px with no horizontal overflow. All assets load; password dialog opens, focuses correctly, closes and restores focus; no console warnings or errors. No unresolved P0/P1/P2 issues.

See docs/coming-soon/design-qa.md for current implementation, evidence paths, asset-generation prompt and preserved superseded history. Previous unrelated admin QA follows unchanged.

---

# Admin board light-mode design QA

Date: 17 October 2026
Status: Passed for implementation and local browser verification.
Owner decision: Direction 5, with light mode retained.

## Design

Open stage columns, matte warm-grey cards on a lighter page, thin borders, restrained plum text and berry actions. No card shadows, glow or gradients. Email update and Move order share a compact horizontal action row. Existing Fredoka and DM Sans fonts remain in use.

Reference and captured evidence are in the workspace output/admin-card-directions directory: 05-light-mode.png, 05-light-comparison.png, 05-light-card-comparison.png, 05-light-phone.png and 05-light-implemented.png.

The real implementation intentionally retains the private-store notice, unpaid counts, refresh action, accessible field labels and manual email guidance. These move the board lower than the generated reference. Text uses the actual brand fonts rather than the generated approximation. No unresolved P0, P1 or P2 visual issues were identified.

## Verification

- Final isolated release snapshot a24aaeb includes the completed f2f51f7 per-letter quantity and studio notes changes. Concurrent uncommitted work is excluded.
- Site build, SSR build and 26-page prerender passed.
- Final complete isolated test suite: 232 passed, zero failed.
- Admin build and prepare-admin passed.
- Desktop at 1600px: four open columns, solid card fill, computed box-shadow none, no horizontal overflow.
- Phone layouts at 390px and 320px: one column, no horizontal overflow, expanded Move order controls fit.
- Search for Joe returns one card; unmatched search returns empty columns.
- Stage filter In progress returns the matching column.
- Move order changes a synthetic order stage; Email update reaches the existing manual preview controls. No messages sent or production records changed.
- No browser warnings or errors in the local preview.

## Release boundary

Only admin/Orders.jsx, admin/orders.css and the light-board fixture variant change application behavior or previews. Authentication, payment state, artwork retention, sending logic and backend workflows are unchanged. Live authenticated visual acceptance remains distinct from this local verification.

## Publication

Source a24aaeb was pushed to main. The final admin release includes the concurrent completed f2f51f7 quantity changes, rebuilding both applications and repeating all tests before publishing. Worker version aa8adf29-b3ad-4dc1-94ca-f4911c901db9 supersedes the initial light release. The existing business account connection published to admin.customvibe.co.za. The final bundle uses index-DYx2YIO1.css and index-B82nGn0l.js.

Founders Hub saved the owner direction decision in the existing styling subtask. The final release update and completion status could not be recorded because task actions stalled, including after a fresh tab and reload. The attempted reopening of the signed-in owner-review subtask could not be verified. Do not treat the earlier signed-in acceptance as acceptance of this new layout. Reconcile these existing tasks when the Hub responds again; avoid duplicate tasks.

## Card palette revision, 17 October

Owner requested option 2 colours on the existing option 5 light layout. Stage card fills are lavender #e6d7ed, peach #efd5b3, sage #d1dfd2 and blue #cedfe6, with matching borders, hover fills and stage dots. Open columns and the approved layout are retained. Solid fills remain shadow-free. Card secondary text is darkened for contrast.

Admin build and existing admin UI checks passed. Local browser verification confirmed all four colours, transparent columns and no card shadows. Moving the synthetic Patrick order to Ready to ship changed its card to sage and displayed the existing no-email confirmation. Main, secondary and action text pass 4.5:1 contrast across every card and action hover fill. Evidence: output/admin-card-directions/05-light-option2-colours.png in the workspace. No production orders or emails were changed.
