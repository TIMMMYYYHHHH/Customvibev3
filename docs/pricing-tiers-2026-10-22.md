# Whole-basket quantity pricing

Current owner decision, 22 October 2026: the whole basket selects one rate for all per-magnet photos, puzzle tiles and built-in collection magnets. Selected designs, each design’s quantity and basket set copies all count. Custom fixed-price collections retain their separate price and do not select the shared rate.

| Basket quantity | Price for every shared magnet | Examples |
| --- | --- | --- |
| 1–5 | R50 | 1 R50; 5 R250 |
| 6–9 | R45 | 6 R270; 7 R315; 8 R360; 9 R405 |
| 10+ | R40 | 10 R400; 11 R440; 25 R1,000 |

Adding the tenth magnet deliberately reduces the subtotal by R5. The nudge explains this saving and requires a customer action to add a photo or increase copies. No magnet is added automatically. Delivery remains separate and payment status remains Unpaid.

## Implementation and compatibility

- `src/commerce.mjs` selects the rate once from the combined per-magnet quantity. There is no nearest-rand rounding or separate tier per design or product.
- `src/content/model.mjs` and committed `data/site-content.json` use `{single:5000,six:27000,ten:40000}`. The compatible storage contract still represents the one-, six- and ten-magnet totals in cents. CMS labels explain both the stored totals and their quantity bands, and show the resulting rate and basket examples.
- The validators allow the intentional nine-to-ten decrease. They retain positive bounded integer prices, the existing six-total range from five through six singles, a ten total no lower than the six total, and a ten per-magnet rate no greater than the six rate. The ten total still divides into whole cents. This accepts every previously valid saved price configuration.
- Legacy custom six-magnet totals may imply fractional cents per magnet. Preserve the saved configuration and round only the calculated basket total to the nearest cent. Current approved rates divide exactly. Saved catalogue revision, copy, availability, custom prices, artwork, images and season settings are never reset during reads or deployments.
- New private orders derive quantity and price from the catalogue, retain exact per-design quantities and snapshot line prices. Cumulative cent allocation keeps the line sum equal to the subtotal, including legacy fractional-cent configurations. Browser-supplied counts or totals are not trusted.
- Saved order records, historical line prices, accepted notifications and manual update history are not recalculated or resent. Historical six-magnet R250 and nine-magnet R375 snapshots remain historical facts.
- Public pricing cards, the shared FAQ/FAQ structured data, tier nudges and CMS copy describe one whole-basket rate. Installed Christmas presentation reuses these shared components and the live catalogue; no seasonal price list is introduced.

## Safe release and saved configuration

Source defaults alone do not change the authoritative saved production catalogue. Do not upload the committed fallback as a replacement catalogue or change catalogue rows through a migration.

1. Read the latest authenticated catalogue, pricing and revision. Preserve all other content and newer edits. Keep the website password gate, separate server-side admin authentication, disabled payments and existing provider settings.
2. Build and publish the changed Catalogue runtime and matching Pages/public/SSR and Admin implementation using the existing release controls. Verify and retain the existing Security runtime: its 24 protected inputs are unchanged from `9534fb26974dcb272d1d3057805ef149f25160f3`, so this release does not require Security publication. Catalogue has 53 protected inputs, with changes to `src/content/model.mjs` and `data/site-content.json`; Admin has 65, with those same changes plus its newly generated manifest. Deploy the compatible Catalogue and Admin validators before saving the new pricing: the previous validator rejects R270 for six with R400 for ten. Shared public/admin components must come from the same revision.
3. Once all relevant runtimes accept the new schema values, reopen the latest saved catalogue in authenticated Store content. Change only the approved pricing fields to single R50, six-total R270 and ten-total R400. Save using the current revision. If another edit wins first, reload and reapply just these pricing changes to the newer content. Preserve all products, availability, wording, images and other fields.
4. Reopen the saved pricing and refresh the signed-in storefront and authenticated preview. Verify the saved revision/prices and the displayed boundary totals, a mixed basket and selected-design copies. Verify nine magnets show R405, ten show R400, and the nudge says adding one saves R5. An unsent browser draft is sufficient; do not send customer mail or change production customer orders for this check.
5. Existing accepted orders and receipts remain unchanged. A private upload/grant or frozen retry begun before a pricing change can fail its existing fingerprint check and require review. Do not bypass that check, fabricate acceptance or start a duplicate order. Refresh ordinary unsent drafts before beginning a new submission after the change.
6. Record actual deployment/configuration evidence and verification in Founders Hub. Implementation, local tests, deployment, saved pricing and owner print checks are separate evidence.

## Local verification recorded by the pricing worker

Installed dependencies with Node v22.23.3, no installation or provider call:

- Red: 39 focused tests, 15 expected failures against the former six-total, nearest-rand calculation, validator and nudge.
- Green: 39/39 focused tests covering every tier boundary, mixed photos/puzzles/collections, selected quantities/copies, immutable browser input, source and fallback prices, legacy custom prices, and rendered R5-saving/R20-extra guidance.
- Additional regression checks: 42/42 across persisted historical prices and stage changes, admin controls, catalogue store/revision preservation, fallback validation, public/private submission limits and crop-quality help.

The coordinator owns the final integrated suite, paired builds, local browser review and any authorized live release/configuration. These local results do not claim the live stored prices have changed.
