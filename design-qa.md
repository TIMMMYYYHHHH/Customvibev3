# C3 cards and M1 collection chooser local review

final result: passed

## Source and implementation
- Source visual truth: `output/collection-concepts/C3.png` and `output/collection-concepts/M1.png`, selected explicitly by the owner.
- Actual artwork reused from `public/assets/magnet-artwork/`. No generated replacement artwork or print-file changes.
- Implementation: http://127.0.0.1:5191/collections and homepage `/#collections`.
- Evidence: `output/c3-m1-review/cards-desktop.png`, `modal-desktop.png`, `home.png`, `phone-card.png`, `phone-modal.png`.
- Reference and desktop evidence are 1536 × 1024 pixels. Desktop evidence uses a same-origin 1536 × 1024 CSS-pixel iframe and a full-page browser capture, with no image rescaling. Native desktop also checked at 1280 × 720. Phone is a 390 × 844 CSS-pixel iframe; capture includes surrounding neutral harness canvas. Density is 1.
- State: Learning & play cards, alphabet full-set modal in Watercolour. Existing site header, filters, catalogue order, real artwork, short approved product descriptions and Details navigation are intentionally preserved instead of copying mock-only content.

## Comparison history and fixes
1. Initial desktop browser comparison found inherited global heading/body styles overriding the compact M1 summary typography (P2), making the purchase controls and information unnecessarily tall. Scoped selectors now restore summary typography; final screenshots show the corrected state.
2. Initial larger desktop view had oversized gallery magnets and could not show the first nine together (P2). Gallery width now caps at 660px, the rail/summary proportions match M1 more closely, and redundant full-set captions are hidden. The original image alt text remains. All 26 designs are available by scrolling the centre gallery.
3. Initial card actions left-aligned Details (P2). Centered the secondary link and shortened excess header space. Final desktop and phone cards show the aligned actions.
4. Phone flow would have placed shopping mode choices after the long gallery (P2). Responsive layout now places those choices above the artwork. Phone screenshot and interactions confirm that change.
5. Final source/implementation images were opened together for the full card and modal comparison. Focused controls, typography, quantities and card imagery were also inspected in native desktop/phone screenshots. No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces
- Typography: existing Fredoka headings and DM Sans UI retained. Headings above coloured previews match C3; M1's style rail and compact summary are readable. Wide desktop uses larger controls, phone text wraps without clipping.
- Spacing/layout: same C3 component on home and Collections. Upright three-column previews, full-card colour, consistent padding, solid primary action. M1 uses a larger dialog, left styles, centre artwork and right summary. Each desktop column can scroll on short screens. Phone stacks naturally and keeps shopping choices before artwork.
- Colour/tokens: mint, peach and lilac primary collection panels with complementary colours on other collections. Solid plum selected controls, neutral secondary controls, solid berry purchase actions; no coloured glow or inset control shadows.
- Asset quality: exact existing artwork and satin preview finish retained. Source print artwork is unchanged. Images fill square viewports without generated substitutes or white outlines.
- Copy: actual collection names/descriptions, real full-set counts, pricing and 7.5 × 7.5 cm size. Mock-only longer descriptions were not introduced. Existing five full style names remain visible.

## Interaction verification
- All six collections open in their advertised style: alphabet/thanks Watercolour, counting Gouache, words Layered paper, colours Handmade clay, reminders Pencil & ink.
- Alphabet full set displays 26 designs; numbers 10; other collections 9.
- Selecting A twice and C once, then switching to Handmade clay, preserves both quantities. Basket displays three magnets at R150, correct style and labels. Editing retains that style and quantities.
- Phone individual selection and quantity increment remain selected after switching to Pencil & ink.
- All five style controls remain available; full-set/individual toggles, dialog close, card navigation and Details links remain functional.
- Homepage uses the same C3 component, including the puzzle card. Native desktop has no horizontal overflow.
- Browser console: no errors observed during the tested local flows.
- All 255 existing automated tests pass. Public client, SSR/prerender and admin build pass. Whitespace check passes.
- No live deployments, checkout submissions, customer emails or production data writes performed.

## Remaining owner review
The selected direction is implemented and verified locally. Owner approval of actual-artwork appearance is still required before publication. The mock is a layout direction, not a replacement for existing catalogue imagery or copy.

## Owner feedback refinements, 18 October 2026
- Strengthened the preview-only satin edge, shallow base and directional surface shading. No white perimeter outline and no changes to printable artwork.
- Removed the circular shopping-mode indicators; full-set and individual controls use clean text with solid selected fill.
- Matched the puzzle preview padding and gaps to the neighbouring 3×3 artwork grids. At a 985px viewport each piece measures 112.3125px square in all three cards; the 1536px screenshot confirms matching preview extents.
- Verified full-set switching, individual A selection and preservation when changing to Handmade clay. Circle pseudo-elements are absent.
- Public build and whitespace check pass for these CSS refinements. The 255-test result above belongs to the preceding implementation, not a new run.
- Updated evidence: output/c3-m1-review/refined-cards.png and refined-modal.png. These refinements remain local and await owner appearance review.
