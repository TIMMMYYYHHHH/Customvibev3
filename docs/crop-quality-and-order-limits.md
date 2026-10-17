# Crop quality and order limits

17 October 2026. Board: Artwork & email > Protect print quality for larger orders > Add crop-resolution warnings and clear order limits.

## Existing behaviour inspected

- JPG/PNG originals already had a 20 MiB, 40 megapixel and 12,000-pixel-side input check. Originals and drafts remain in memory.
- Server validation already enforced 100 magnets and 30 order entries. Private artwork already enforced 60 files, 4 MB per file and 32 MB total. Storage quotas and 14-day retention are unchanged.
- Photo and puzzle print tiles already export at 1200 square pixels. That export size does not establish source quality. There was no source crop-resolution warning.
- Quantity buttons used an unrelated 30-copy ceiling. They now follow the existing 100-magnet total; 30 remains the number of distinct basket entries.

## Implementation

`cropQuality` uses the same square crop geometry as rendering, including zoom and quarter-turn rotation. It divides source crop pixels by the puzzle grid before converting each 7.5 cm tile to pixels per inch. It never uses the enlarged JPEG or preview dimensions as evidence of quality.

The recommended target is 300 ppi, about 886 source pixels per tile edge. Below 300 ppi shows a soft-print warning; below 150 ppi shows a stronger blurry-print warning. The latter is an advisory product threshold, not a verified production rejection threshold. Decisions use unrounded values; displayed PPI is rounded down. Missing source dimensions show an unknown-quality advisory. Neither warning blocks ordering or requires extra consent.

Reference for the general 300 ppi recommendation: [Adobe print resolution guidance](https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/resolution-specs-for-printing-images.html). Pixel count cannot identify motion blur, focus, lighting, JPEG damage or already-upscaled originals. Actual print acceptance remains separate.

Guidance appears beside crop controls, on affected basket items and in the checkout summary. Upload/type/size and order limits are available by Add photos, including on mobile, with a link to detailed capacity guidance. Help includes the same explanations.

Capacity counts each design's artwork once, regardless of copies: photo = 1 file; 3x3 puzzle = 10 files; 5x5 = 26 files, including the proof. Every copy and every magnet in a premade pack counts toward 100 magnets. Existing constants are shared with server validation. File-byte checks still run on prepared artwork before any upload.

New uploads stop at the applicable capacity and retain successfully added photos. Quantity increases stop before exceeding capacity. A format/grid change may create an oversized editable draft; basket and checkout explain the problem and prevent submission. The preparation function independently rejects oversized orders before rendering, including a direct checkout path. No new quota, storage, email or payment workflow was introduced.

## Local verification

- Regression tests first failed for missing crop/capacity checks and missing pre-render rejection, then passed with implementation.
- Full suite: 174 tests passed. Public, SSR/prerender and admin builds passed. Final release checks are recorded below.
- Read-only code review found no actionable issues.
- Real local App flow with network-isolated existing local-review fixture: 400px photo reports 135 ppi and blurry; 3000px photo reports sufficient resolution; 3x3 puzzle reports 1000px/tile, 338 ppi; 5x5 reports 600px/tile, 203 ppi and soft; zoom 3 reports 200px/tile, 67 ppi and blurry.
- Phone basket (393px) retains warnings with edit/remove controls. Exactly 100 magnets remains orderable with the warning; 101 blocks basket continuation and direct checkout submission. Removing the excess restores the enabled submission button. No submission was made.
- Puzzle copies correctly keep artwork file counts unchanged. Unit cases cover 30/31 entries, 60/61 files, premade pack counts, rotation/position and threshold boundaries.
- Desktop layout checked at 1440px. Original-photo guidance was made visible on mobile/tablet after finding an older compact-layout rule hid it.

## Publication and remaining checks

Application commit: `10db996`. Protected [Pages run 38988835883](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38988835883) succeeded, including 174 tests, public/admin builds and before/after gate and configuration checks. The separate admin Worker publish step was skipped as intended.

Live signed-in checks confirmed the early upload/order guidance, source-based 400px/135ppi photo warning, 3x3 puzzle 133px/45ppi warning, 9 magnets/10 artwork-file count and nonblocking basket warning. Phone display checked at 393px. Only a synthetic image was read into browser memory; no checkout submission, artwork upload or customer email occurred. Local 100/101, 30/31 and 60/61 boundary evidence is above. Physical print acceptance is not implied.

The crop-warning/order-limit subtask can be completed. The parent must remain In progress because physical printing and related acceptance remain open.

Physical print checks, maximum free-runtime load testing, real email acceptance and admin availability remain on their existing separate tasks. No customer email, order submission, payment, stage change, database migration or Worker configuration change is part of this release.
