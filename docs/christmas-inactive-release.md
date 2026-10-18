# Inactive Christmas installation, 18 October 2026

## Owner decision

Owner request: “This is a good start can we add it to live acuatoin thats not activated”. This authorises installation on the existing Christmas occasion, not Ready to use, schedule enablement or manual activation. Final design refinements remain open. No new occasion, campaign or seasonal-settings write is needed.

## Release scope

Prepared from latest main 258d3bf, preserving Handy personalisation, current admin recovery and fulfilled-order work. Includes only the installed Christmas registry, scoped Christmas components/assets, shared runtime integration and relevant tests. Shared page structure, catalogue, prices and functionality remain live sources. The existing admin preview displays the same application. Local fixture servers and reference wording are excluded from production.

Santa World uses the approved soft Santa character holding a lit Christmas tree, photographic magnets, snowy sections, peeking cameos and the animated Santa slider. Assets are lossless WebP with exact decoded RGBA equality to the reviewed PNGs: 10,930,216 to 7,456,216 bytes. The approved older local draft remains preserved separately for comparison.

## Baseline and acceptance checklist

- [x] Site, SSR, prerender and admin builds pass on latest implementation.
- [x] All 300 automated tests pass; whitespace checks pass.
- [x] New release preview visually checked with Santa/tree and shared hero content.
- [x] Existing production targets, auth bindings, gate, credential presence and disabled preview sending pass read-only deployment guards.
- [x] Live Christmas baseline: Not started, Theme Not created, Schedule Off, manual activation off. Original website showing now, nothing scheduled.
- [x] Preserve saved headline “I am testing / What this preview looks like”; other wording fields blank and inheriting current website copy.
- [x] Preserve 1 Dec 2026 08:00 to 27 Dec 2026 00:00, one time only, South African time, schedule disabled.
- [ ] Publish matching site, catalogue and admin.
- [ ] Verify authenticated live draft, original/date preview, saved settings and public protections.
- [ ] Record saved Founders Hub deployment result.
- [ ] Final owner design acceptance. Separate from installation.
- [ ] Ready to use / activation approval. Not authorised by this request.

No security Worker deployment, database migration, customer-record write or email sending is part of this release. No service upgrades. Deployment evidence will be added after verification.
