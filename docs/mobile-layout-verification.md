# Mobile layout review, 17 October 2026

Owner target: Samsung S25, Chrome. The owner also reproduced the poor composition in Mac responsive view. Tim accepted the revised mobile layout on 17 October after reviewing on Samsung Chrome. Overflow checks alone are not design acceptance.

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

The initial 393px home was over 9,000px tall, with oversized stacked cards and edge-running line segments. This revision changes the composition, not just overflow handling. Tim initially said the revision was better but needed changes, then clarified “Actually this is good”. The later response is the final visual acceptance.

## Boundaries and remaining checks

No payment, authentication, email trigger, order stage, artwork retention or customer data changes. Existing availability investigation and phone email checks remain on hold. Live delivery and checkout owner acceptance stay in their existing tasks.

Founders Hub: **Fix mobile layout and verify all pages** and **Fix homepage line artwork** are complete following verification and owner acceptance. **Pass final website launch checks** remains in progress with its other required subtasks open.

## Publication and live checks

Application bc0d571 published through protected Pages run [38980556377](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38980556377). Public/admin builds, 164 tests and pre/post protection checks passed. The admin Worker was not redeployed. Live 393px home showed seven mobile connectors, Help had no horizontal overflow and the collection dialog restored focus after closing. The live 1440px story retained the desktop layout.

The historical optional-map criterion does not apply to current checkout, which links to PUDO and does not render the unused DeliveryMap component. No map feature was added.
