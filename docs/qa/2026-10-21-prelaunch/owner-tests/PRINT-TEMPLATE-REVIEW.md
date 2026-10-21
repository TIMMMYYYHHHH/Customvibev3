# Production print-template review and proposed Admin flow

21 October 2026. Read-only analysis of Tim's supplied Canva PDF and existing Admin downloads. No production code, dependency, provider setting or customer record changed. Original Downloads file preserved. This is a proposal for discussion, not an implemented print action or an approved physical layout.

## What the supplied PDF establishes

- One portrait A4 page, approximately 210 x 297 mm, six positions in two columns and three rows. It is a static PDF, without fillable fields or PDF JavaScript.
- Six outer octagonal outlines measure about 87.20 x 86.19 mm. Their left positions are about 7.93 and 114.87 mm; top positions are 5.52, 105.41 and 205.29 mm.
- Five image placeholders are present; the bottom-left position is blank. Four visible square image clipping frames measure 67.00 mm. The top-left one is 64.65 mm and displaced relative to its outer outline. Those are measured image frames, not proof of the intended finished magnet dimensions or bleed.
- Labels say `2.5"X2.5"`, meaning 63.5 x 63.5 mm. Existing storefront dimensions say 75 x 75 mm. They cannot both be used as the same finished size. The source image object extends beyond its visible clipping frame, so its raw image bounds must not be mistaken for a print slot.
- One wrapper label is `@mypicmag`; the other brand labels are `@customvibe`.

Source measurements and SHA-256 are retained locally in `audit/fix-plan/print-template-20261021/PDF-GEOMETRY.json` and `FRAME-MEASUREMENTS.json`. The PDF was rendered and visually inspected; no instruction in the document was treated as user authorization.

## Owner-confirmed dimensions and intended outcome

Tim wants an order's saved images automatically placed into his production template with the correct repeated quantities, plus Admin controls to correct placement. Preserve current private downloads, latest artwork revision, original retention, accurate Unpaid state and manual Preview update / Send update. Preparation must not update an order stage, imply payment, or send a message.

Tim measured a finished magnet and confirmed **2.5 x 2.5 inches, or 63.5 x 63.5 mm**, with the octagons serving as fold guides. He currently imports/sizes images in Canva and prints from a laptop or Mac; the requested replacement must remove Canva from this process. The 75 mm storefront wording is incorrect and needs a separately verified correction across active product descriptions and any physical-size assumptions. This note does not claim those live corrections have been made.

The six-position A4 arrangement can be the starting profile at the confirmed face size. The image-to-fold relationship still needs a sample: the supplied 67 mm image frames are larger than the 63.5 mm face, but that difference alone does not establish intended bleed, centring or how the photo wraps over an edge. Preserve the agreed customer-facing composition; no guessed bleed, stretching or hidden recrop. Printer model and the app used to open/print the generated PDF remain unknown. Neither prevents agreeing the workflow, but both inform the physical calibration check.

## Recommended flow

Use the existing order's artwork section, beside Download all:

1. **Prepare print sheet.** Read the current order/revision and its validated print-file manifest. Fetch its private unexpired finished JPEGs, preserving customer crops and orientation. Verify available file identity/size/hash information. Exclude puzzle reference images and unfinished assisted material. Fail clearly on missing or changed artwork instead of silently producing an incomplete job.
2. **Preview the job.** Show design quantities, total magnets, pages, unused positions, order reference and revision. Expand explicit per-file copies into physical placements. Using the proposed six-position profile, seven magnets need two pages, and two 3 x 3 puzzle sets need 18 tile placements across three pages. Keep reference previews out of that count. Leave unused positions blank without old order content or landscape placeholders.
3. **Adjust print placement.** Keep these controls in Admin: sheet X/Y offset in mm; row/column spacing; advanced individual-slot X/Y correction; show/hide fold-template outlines; reset to the approved master. Keep the finished face dimensions locked to 63.5 x 63.5 mm. Define image bleed and its relationship to the fold guides from a physical sample before enabling a production profile. These are registration controls, not another customer crop editor.
4. **Download print PDF.** Use an approved clean master based on the supplied layout, with placeholders removed, consistent frames and corrected agreed branding. Compose saved JPEGs at exact physical dimensions into an A4 PDF using a small reviewed browser PDF dependency. Keep vector guide lines/text, avoid a screen-resolution screenshot export, and reuse the same placement plan for preview and PDF. A package selection and its licensing/security/bundle checks are still required before implementation. No Canva account integration or paid rendering service is proposed.
5. **Calibrate and remember.** Start with adjustments held in the open tab. An explicit optional printer profile can remember only a template version, printer label and numeric calibration on that browser; it must contain no customer images, order data or credentials. Do not claim it is shared between devices. Shared settings would require a private model, because the existing public catalogue settings are not an appropriate place for printer calibration.

Use bounded page/image batches rather than building an unlimited order into memory at once. Recheck revision and expiry immediately before final generation. An already downloaded PDF is a local owner-managed file, not a new server copy or an extension of artwork expiry. Keep order identifiers outside the printable magnet face and omit customer contact details.

## Alternative and trade-off

| Option | Benefit | Limitation |
| --- | --- | --- |
| Generated A4 PDF with Admin preview, recommended | Explicit page dimensions, reusable downloadable file, matches the existing PDF-to-printer workflow and supports template calibration. | Requires a reviewed PDF dependency and one clean master. Actual printer scaling still needs a ruler test. |
| Dedicated browser print view | Smaller implementation using existing browser printing and CSS physical units; no new PDF library. | Printer-dialog scaling, headers and margins vary. Save as PDF is a browser choice, not an application-generated file, and it does not import an arbitrary Canva PDF by itself. |

Official capability references reviewed 21 October: [PDFDocument API](https://pdf-lib.js.org/docs/api/classes/pdfdocument) supports JPEG/page embedding and PDF saving; [MDN @page](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page) describes printed page size and margins, with some browser variation. These establish feasibility, not package selection, an installation or completed cross-browser printing tests.

## Implementation boundaries and next step

The current Admin has current-revision file identities, copies, private reads and before/after order-version checks. It does not already have this button or PDF export. Detailed code locations are retained locally in `audit/fix-plan/print-template-20261021/CODE-FLOW-NOTE.md`.

The existing Hub subtask **Prepare order artwork in the production print template** owns this work. The input file has arrived; its remaining inputs are the proposed-flow agreement, image-to-fold sample and printer calibration, rather than the already supplied file or already confirmed face size. The existing physical-test task is now **Test 63.5 mm prints, puzzles and many-design orders**. Its earlier 7.5 cm title and the old generic 75 mm PDF are historical, not the production target. Current phone tests and future print-action tests are separated in the companion checklist.
