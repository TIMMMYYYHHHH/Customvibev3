# Coming soon worktable correction

Date: 17 October 2026
Final result: passed (local implementation and browser QA).

## Current owner decision

The owner supplied the exact intended screenshot after clarifying that the displayed image order had been misunderstood. The centred worktable image supersedes the earlier mint-fridge interpretation. Use the attachment, also represented by project output/coming-soon-images-v3/02-handmade-reveal.png, as the visual target. The history below is preserved as superseded work, not an approved design decision.

## Implementation

Centred two-line slogan, lilac coming-soon label, handmade-magnet wording, outlined top Log in button and centred footer. The worktable scene preserves the hands, berry ribbon, mint tissue and small heart. Four original product cutouts are overlaid unchanged: sunglasses, group, beach and wedding. All interface text remains semantic, editable HTML using the existing Fredoka/DM Sans and actual brand logo.

The background was generated with the built-in image tool by editing the supplied reference: remove all text, UI and four magnets; preserve the exact worktable, hands, ribbon, tissue, heart, lighting and composition, leaving clear space for live text and original product overlays. Source asset: project output/coming-soon-assets/worktable-background.png, 1536 x 1024. Production asset: public/coming-soon/worktable.webp.

Only the page markup, styles and explicitly named presentation asset list changed. The website gate, separate admin authentication, payment controls and customer workflows retain their existing behavior. Versioned CSS avoids reusing the previous layout from browser cache. The retired fridge image no longer bypasses the gate.

## Verification

Reference and local screenshot compared at 1536 x 1024 with login closed. Headline placement, two-line hierarchy, lilac label, hand/product arrangement, materials and footer match. Intentional differences: original brand logo and four real product photos replace illustrative generated imagery. No unresolved P0/P1/P2 differences. Phone checks at 390 x 844 and 320 x 740 have no horizontal overflow; all imagery loads, Log in focuses Password, Escape closes and restores focus. No browser errors or warnings.

Evidence: project output/coming-soon-implementation/worktable-desktop.jpg and worktable-mobile.jpg. Focused auth/presentation tests pass (17). Full build and suite results are recorded in the release workflow and Founders Hub.

---

# Superseded mint-fridge implementation history

Owner selected the first revision 3 image, the mint fridge, on 17 October 2026 and requested actual CustomVibe magnets.

## Design and implementation

Reference: project output/coming-soon-images-v3/01-your-tribe-fridge.png. Original product cutouts replace generated photo magnets. The blank generated fridge is decorative; all text and login controls are semantic HTML. Fredoka and DM Sans, the existing logo, cream/plum/berry and mint palette preserve the brand. Desktop uses the reference's 52/48 split and phone stacks the copy above the fridge.

The top Log in action opens a native password dialog. Direct /auth/login and failed password submissions open the same form. Without JavaScript, the link and server form remain usable. The existing 401 gate, signed CSRF challenges, session issuance/revocation, rate limits and separate admin/proof sign-in flows stay intact. Only nine named static presentation assets are readable without a site session. There is no broad directory exception. Payments and all deployment settings are unchanged.

## Verification

Focused tests were first run against the previous page and failed for the expected missing dialog and public presentation assets. All 17 focused authentication and presentation-boundary tests pass after implementation. Storefront build prerenders all 26 routes.

Browser comparison at 1536 x 1024 matches the selected composition, spacing and content hierarchy. Differences are intentional: original CustomVibe logo and real square product photography replace generated mockup imagery; heading uses the existing brand font. Screenshots are in project output/coming-soon-implementation. Mobile, complete suite and live deployment verification are recorded below when completed.

Local verification complete: storefront and admin builds pass; all 235 tests pass. Browser checks passed at 1536 x 1024, 390 x 844 and 320 x 740 with loaded imagery and no horizontal overflow. Log in focuses Password; Escape and Close restore the trigger. Invalid password stays in the dialog with an alert, and valid local fixture credentials produce a real signed session and unlock the isolated preview. No browser warnings or errors were recorded. The preview uses in-memory authentication only and cannot send email or access production records.

Production verification: initial release 62008b4 passed the existing publish workflow, including before/after gate configuration verification (run 39040862581). The live root displays the selected design with every image loaded, Fredoka heading typography and the login dialog initially closed. Direct /auth/login opens the form. Refined the decorative background to keep the complete fridge handle visible at 1280 x 720; the real magnet images retain their square proportions. Final visual follow-up is CSS only. Command-line probes were denied by the edge with 403, so live presentation checks use the browser and auth-boundary behavior is covered by the passing automated suite.
