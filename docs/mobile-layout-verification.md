# Mobile layout review, 17 October 2026

Owner target: Samsung S25, Chrome. The owner also reproduced the poor composition in Mac responsive view. Real-phone visual acceptance remains pending after this revision. Overflow checks alone are not design acceptance.

## Changes

- Recompose the homepage below 900px with consistent side margins, readable type, smaller photo grouping, compact collection rows and pricing cards, and story copy before its photo.
- Replace the stretched mobile chapter paths with content-measured curves in section gaps. Resize observation updates the path when FAQ answers or content change. Preserve the existing desktop Wide swoop.
- Improve mobile navigation, Help, catalogue text, footer grouping, checkout labels, collection dialog sizing and full-width basket rows.
- Restore focus to the collection preview opener after closing its dialog. Previously focus fell back to the page body.
- Keep mobile rules in `src/mobile.css` and apply them to the isolated review fixtures too. Use a current short order number in the synthetic checkout fixture.

## Local verification

164 automated tests passed. Public client build, server render build and 21-page prerender passed. Browser checks used the signed-in browser's viewport emulation, not a physical Android device.

21 public routes checked at 320x800, 393x852, 768x1024 and 1440x900: home, collections, studio, puzzle, basket, checkout, Help, contact, privacy, terms, returns, shipping, eight product routes and the missing-page route. No document horizontal overflow or off-screen headings/inputs was found across these 84 checks. Additional home checks passed at 360x800 and 430x932.

Visual review covered the hero, collection rows, story photo/caption, making steps, pricing, expanded FAQ, contact, menu, Help, catalogue, dialog, populated photo designer and basket. Keyboard Escape closed the collection dialog and restored the opener. A synthetic checkout fixture exercised consent, unpaid confirmation and starting again without sending email or changing production records.

The initial 393px home was over 9,000px tall, with oversized stacked cards and edge-running line segments. This revision changes the composition, not just overflow handling. The owner must still judge the new mobile layout and section connections on Samsung Chrome.

## Boundaries and remaining checks

No payment, authentication, email trigger, order stage, artwork retention or customer data changes. Existing availability investigation and phone email checks remain on hold. Live delivery and checkout owner acceptance stay in their existing tasks.

Founders Hub: update **Fix mobile layout and verify all pages** under **Pass final website launch checks**, and the existing **Fix homepage line artwork** task. Keep both in progress until owner phone review and any remaining acceptance checks are satisfied. Record publication and live checks in their activity updates.
