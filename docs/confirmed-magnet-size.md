# Confirmed magnet size

Current owner correction, 21 October 2026: the finished face of every magnet and puzzle tile is **63.5 × 63.5 mm = 6.35 × 6.35 cm = 2.5 × 2.5 inches**. Earlier 75 mm / 7.5 cm product assumptions are superseded. The source of runtime dimensions is `src/print-dimensions.mjs`.

A 3 × 3 puzzle measures 19.05 cm square before gaps; a 5 × 5 puzzle measures 31.75 cm. Resolution guidance assesses original crop pixels after zoom and puzzle division. At the finished face size, 750 pixels give 300 ppi and 375 give 150 ppi. Decisions use unrounded values. Exports remain 1200 × 1200 px, equivalent to 480 ppi when the full saved square maps to the finished face. Resampling creates no source detail.

The measured octagonal fold outlines are independent of the finished face. Default print placement preserves the complete saved image on the 63.5 mm face. A larger image extent is an explicit wrap adjustment. Existing artwork grids, customer crops, old order snapshots and historical print evidence stay unchanged. Previously produced 75 mm sample sheets do not verify this corrected product size. Physical fold alignment, readable text and QR scanning still need owner acceptance.

Source correction covers current storefront/studio/Help guidance, quality arithmetic, fallback catalogue defaults and new Admin ZIP instructions. The stored live catalogue has priority over source JSON. Its size correction must fresh-read the current authenticated catalogue and optimistically save only these existing fields: `details` on alphabet, counting, words, colours, reminders and thanks; `details` and `contents` on business and information; `contents` on qr, wifi and noughts-crosses. This is 13 fields across 11 products. Preserve every other field and the hidden QR/Wi-Fi status, then re-read to verify persistence. Never replace production catalogue data with fallback JSON.

This source work does not itself verify a live catalogue save, deployed copy or physical print acceptance. It changes no payment, email, stage, authentication or retention workflow.
