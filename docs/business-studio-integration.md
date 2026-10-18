# Business magnet studio

18 October 2026. Owner approved publishing the reviewed studio and collection updates. See docs/business-cards-release.md for deployment status.

The owner requested editable business details and QR destinations using the Handy at home studio flow. This supersedes the historical business inspiration-only decision. The Wi-Fi action was left to our judgment: Join Wi-Fi is the default, with Open a link for guest portals.

## Implementation

- `/studio/business` offers nine designs. Business collection cards, details and product page lead into this editor. Shared studio navigation includes Photos & puzzles, Handy at home and Business magnets.
- Non-destructive image edits remove variable example text from new versioned backgrounds, retaining photography, fixed headings and QR areas. Original assets remain unchanged. Generation sources/prompts: `docs/business-editable-image-prompts.json`.
- Editable details use the bundled licensed DM Sans print font, sized for each 1254-coordinate layout. Long text is rejected, never shrunk. The gallery retains the original approved marketing examples; edited previews show the actual printable text.
- Four real QR layouts retain white quiet zones and integer-pixel modules. Links allow public HTTP/HTTPS without credentials; payload density is capped at 49 modules per side. Wi-Fi preserves spaces and escapes reserved delimiters. It supports password-protected personal networks and open networks, or a portal URL. Passwords are encoded into the print and stay in the private saved order details, as needed to reproduce it.
- New items are separate basket lines; editing preserves the latest quantity. Exact values and edition travel through server validation, order records, current proof metadata, admin submitted details and ZIP instructions. Checkout renders fresh 1200 × 1200 JPEGs from values, never from stale previews. Preview finish is excluded from printing.
- “Add your details” status labels are plain text, with no pale coloured pill. Primary actions stay flat and contrasting.
- Existing admin recovery, history, Fulfilled/Table workflow, inactive Christmas theme and seasonal settings remain intact. No email, payment, authentication, expiry or storage-policy changes.
- Local `data/site-content.json` updates only the business availability and wording. A future release must preserve the latest production catalogue and edit only business wording through its authenticated editor, never import this local file over production data.

## Verification

- 303 automated tests pass, including all nine business designs through server/order/print instructions, invalid links and QR modes, payload density, Wi-Fi escaping and exact whitespace.
- Public, SSR/prerender and admin builds pass. Existing large-bundle warning remains.
- Local browser fixture `tests/fixtures/business-flow.html` renders nine 1200px JPEGs from deliberately stale previews, preserves all entered details, creates 18 copies using nine unique files and decodes all four printed QR codes exactly. The full nine-image ZIP plus print instructions was downloaded and inspected. No customer submission or email occurs.
- Print comparisons check decoded pixels. A first-render JPEG rasterization difference on the offer design averaged 0.00012 per channel with a maximum of 3/255. Acceptance is bounded to mean 0.001 and maximum 5; larger differences fail. Other sample print renders matched bytes.
- Browser checks cover desktop entry, add to basket, quantity increase, reopening and editing the business name/link while retaining two copies, and a 390px phone guest Wi-Fi form.

## Remaining acceptance

Owner local review and deployment approval received. Protected live verification is tracked in the release record. Physical 7.5 cm print readability and scanning on real magnets remain owner checks. The broader magnet realism improvement remains separately deferred.

Founders Hub: subtask “Personalise business magnets and QR codes in the studio”, under “Add business and useful-information magnets”, Website & checkout. Parent remains In progress.
