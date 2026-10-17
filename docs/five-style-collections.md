# Five-style collection release

Owner approved production publication on 17 October 2026, followed by individual choices for every ready-made collection and the label “5 styles available”. This supersedes the local-only selector review restriction. The protected storefront and separate admin sign-in remain enabled; payments remain disabled.

## Catalogue and ordering

Six collections have 26, 10, 9, 9, 9 and 9 designs respectively. Five styles supply 360 square, original-artwork PNG files. Homepage and collection cards show nine upright faces. Visitors select a style, full set or individual designs, then per-design quantities. Style and quantities survive basket editing, server validation, private records and proofs. Different styles never merge into one basket line. One unique artwork file serves every requested copy of that face.

The private catalogue adapts legacy built-in product counts and availability once per artwork edition. It preserves custom product copy and subsequent availability changes made by the admin. The edition is retained on save. Legacy order records remain self-contained; new styled orders explicitly carry a validated style key. No customer records are migrated.

## Artwork

Display uses the approved sealed satin CSS surface with a subtle edge and shadow. The original PNGs are byte-identical to the exported individual files. Print preparation draws only the chosen original artwork onto the established 1200px JPEG canvas, with no preview finish. This resampling does not improve source resolution. Original source detail is mostly 130–142 ppi at 7.5 cm. The owner accepted this for physical testing and authorized all 360 desktop exports. Physical print approval remains outstanding.

## Verification and publication

251 automated tests passed after site and admin builds. New coverage includes all 30 collection/style combinations, selection quantities, exact proof copy counts, invalid style/design rejection, basket separation, 360 square PNGs and safe catalogue adaptation. Local browser checks cover selecting apple twice and flower once, switching style, basket editing, and an offline fixture comparing five uploaded JPEG masters to their original images without overlays. Local fixtures do not submit requests or send email.

Publish the private catalogue, protected site and authenticated admin from the same revision. Deployment guards verify existing destinations and protection. The public launch, payment activation and physical printing are separate owner decisions.

Release routing: the Pages automation credential cannot read the private catalogue Worker. The first release run stopped at that guard before website publication. Use the existing destination-only local helper for catalogue and admin publication, with bundles built from this release checkout. Keep the Pages workflow on its established restricted credential; do not broaden its access. The helper's shared checkout configuration is temporarily pointed at verified bundles/assets and restored byte-for-byte afterward, avoiding unrelated working-tree files.

## Shared cards and flat controls, 17 October 2026

The homepage and Collections page now render the same CollectionCard component, with matching preview panels, headings, descriptions, status labels and actions. Homepage featured products remain catalogue-managed. Puzzle cards lead to the existing 3×3/5×5 creator.

Marketing preview styles: alphabet and thank-yous use Watercolour; counting uses Gouache; first words uses Layered paper; colours uses Handmade clay; reminders uses Pencil & ink. The mapping lives only in CollectionCard and cannot override basket or print style identity. Grids remain upright on hover.

Remaining outlined pricing actions, studio zoom/rotation and selected photo controls, delivery choices and photo-example controls use the existing flat neutral/solid-selected contract. Keyboard focus is preserved. Magnet satin shading remains confined to the artwork preview.

Validation: public/SSR/admin builds and all 254 tests pass after incorporating the latest admin consistency release. Browser checks confirm matching card typography, padding and aspect ratios; all six cards have nine images with the intended asset paths; homepage and Collections render at 390px. A Handmade clay apple selection reaches the local basket with that style intact. No order or email submitted. Deployment and live checks are recorded in Founders Hub.

## Preview-matched opening style

New collection dialogs and product pages start with the style displayed on their marketing card. The shared mapping now lives in artwork.mjs. All five choices remain available. Editing an existing basket item keeps its saved style, including the legacy Watercolour fallback. Regression coverage checks all six initial styles and all five existing-item styles; local browser checks verify every card opens with the matching radio option selected.

Card and larger desktop-modal redesigns are image concepts pending owner selection. They are not implemented as part of this behaviour correction.
