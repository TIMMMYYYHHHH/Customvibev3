# Prepare order print sheets without Canva

21 October 2026. Owner-approved implementation. Publication and live catalogue verification are separate from the local checks below.

## Owner workflow

In an order's Artwork & print quantities section, choose **Prepare print sheet** beside Download all. The tool reads the current private artwork and exact copies, excludes assembled puzzle references, and shows A4 pages with six positions. A seven-magnet job has two pages; two 3 x 3 puzzle sets have 18 tiles over three pages. Empty positions stay blank.

Use the placement controls to move the sheet, adjust row/column spacing, or correct an individual position. The finished face is **63.5 x 63.5 mm**, matching Tim's measurement. Default output preserves the complete saved image at that size. Advanced image extent can be increased explicitly, up to 70 mm, when the owner wants image edges to extend beyond the finished face for wrapping. This scales the entire image uniformly, without a new crop; important edge content needs checking. Reset returns to the measured six-position layout. Adjustments remain in the open tab only.

**Download print PDF** verifies the current order/revision again, then produces an A4 PDF. Print portrait at Actual size / 100%, with Fit/Shrink disabled. The original source template is unchanged. A new blank Canva template, printer model or photograph is not an implementation prerequisite. First-use plain-paper/finished-material checks remain useful owner acceptance, not an extra customer approval step.

## Folded-back branding

Every populated octagon retains live `@customvibe` text on four correctly rotated flaps, alongside the existing two-piece puzzle logo. Text uses the established berry and outlines use plum. No logo or tag is added to the customer's front artwork. The former `@mypicmag` label and landscape placeholders are not copied into the new clean layout. Turning outlines off keeps all back branding.

## Integrity and production boundaries

- Latest artwork revision when present, otherwise the submitted current manifest. Existing game and completed assisted/legacy file names are supported through the existing canonical proof rows.
- Exact saved JPEG bytes, sizes and available SHA-256 hashes, private authenticated reads, original expiry, and before/after order/version/digest checks. Missing/changed files never produce a partial PDF.
- Existing file/byte limits plus a 500-page / 3,000-copy local PDF generation limit. Oversized jobs fail explicitly; existing ZIP downloads remain available for manual batch handling.
- Original 1,200 px export contract remains intact. PDFs embed each master JPEG once and reuse it for copies. The PDF module is loaded only when downloading, rather than added to the customer bundle.
- Memory-only artwork and calibration, with object-URL cleanup. No customer contact data is inserted in the PDF. Saved PDFs are local owner-managed files, not a server copy or retention extension.
- No order-stage update, email send, payment, dispatch, new secret, schema or subscription change. Password gate, separate Admin sign-in and manual Preview update / Send update remain.

## Verification and current limits

The local synthetic fixture is `tests/fixtures/admin-print.html`; its external network, writes and email are blocked. Seven copies, PDF download, invalid calibration/reset and stale-order rejection/refresh were exercised through the real Admin controls. A separate 375 px iframe check verifies responsive stacking; it is not a real Samsung test of this new feature. Two generated synthetic PDF pages were rendered and visually inspected, including repeated designs, blank positions and rotated branding. JPEG byte reuse, dimensions, current/legacy quantities, invalid manifests, expiry and integrity are covered by automated tests.

Tim reported the current live website and mail generally good on his Samsung S25 Ultra in Chrome/Firefox/Gmail/Outlook. That is an owner-reported current-version pass, not a claim about every accessibility criterion or the unreleased print feature. Repeat phone/email checks after the final changes and before public launch. Physical fold placement, material/finish, readable text and QR scans remain unverified until tested; printer details or photos are optional aids if an actual problem occurs.

See [confirmed size and scoped live catalogue correction](confirmed-magnet-size.md), [implementation plan](superpowers/plans/2026-10-21-admin-print-sheets.md), and the relevant unit/fixture tests. Detailed local evidence is retained under `audit/fix-plan/print-template-20261021` in the project workspace.

## Release dependency

The runtime constant is in `src/print-dimensions.mjs`, within the existing release source classification. The existing release coordinator nevertheless accepts only three fixed activation profiles for previous changes. None covers this new Admin/PDF dependency and Catalogue transition. No profile was relabelled and no guard was bypassed. A reviewed transition supported by those checks is required before publishing the feature, matching website/Admin and changed Catalogue, and making the scoped 13-field stored catalogue correction. The earlier independently reviewed storage-integrity release remains separately tracked.

Final local validation on Node v22.23.3: **775 application tests passed, no failures or skips**, with prepared-output notices enabled; **seven supporting Python tests passed**. Matching storefront/SSR/Admin builds and source/output/bundle licence checks passed. Official npm production-dependency audit returned zero findings, including the new PDF runtime packages. The mechanical UI detector returned no findings. Independent feature review is clear after the documented fixes. These are local-source results, not a GitHub Linux run or a production release claim.
