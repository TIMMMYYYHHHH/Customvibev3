# Coming soon entry page

Owner selected the first revision 3 image, the mint fridge, on 17 October 2026 and requested actual CustomVibe magnets.

## Design and implementation

Reference: project output/coming-soon-images-v3/01-your-tribe-fridge.png. Original product cutouts replace generated photo magnets. The blank generated fridge is decorative; all text and login controls are semantic HTML. Fredoka and DM Sans, the existing logo, cream/plum/berry and mint palette preserve the brand. Desktop uses the reference's 52/48 split and phone stacks the copy above the fridge.

The top Log in action opens a native password dialog. Direct /auth/login and failed password submissions open the same form. Without JavaScript, the link and server form remain usable. The existing 401 gate, signed CSRF challenges, session issuance/revocation, rate limits and separate admin/proof sign-in flows stay intact. Only nine named static presentation assets are readable without a site session. There is no broad directory exception. Payments and all deployment settings are unchanged.

## Verification

Focused tests were first run against the previous page and failed for the expected missing dialog and public presentation assets. All 17 focused authentication and presentation-boundary tests pass after implementation. Storefront build prerenders all 26 routes.

Browser comparison at 1536 x 1024 matches the selected composition, spacing and content hierarchy. Differences are intentional: original CustomVibe logo and real square product photography replace generated mockup imagery; heading uses the existing brand font. Screenshots are in project output/coming-soon-implementation. Mobile, complete suite and live deployment verification are recorded below when completed.

Local verification complete: storefront and admin builds pass; all 235 tests pass. Browser checks passed at 1536 x 1024, 390 x 844 and 320 x 740 with loaded imagery and no horizontal overflow. Log in focuses Password; Escape and Close restore the trigger. Invalid password stays in the dialog with an alert, and valid local fixture credentials produce a real signed session and unlock the isolated preview. No browser warnings or errors were recorded. The preview uses in-memory authentication only and cannot send email or access production records.

Production verification: initial release 62008b4 passed the existing publish workflow, including before/after gate configuration verification (run 39040862581). The live root displays the selected design with every image loaded, Fredoka heading typography and the login dialog initially closed. Direct /auth/login opens the form. Refined the decorative background to keep the complete fridge handle visible at 1280 x 720; the real magnet images retain their square proportions. Final visual follow-up is CSS only. Command-line probes were denied by the edge with 403, so live presentation checks use the browser and auth-boundary behavior is covered by the passing automated suite.
