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
