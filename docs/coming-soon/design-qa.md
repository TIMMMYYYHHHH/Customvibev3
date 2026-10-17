# Exact original photo restoration

17 October 2026. Owner rejected the regenerated photo content from the preceding revision. That approach is superseded.

The four original product cutouts are copied byte-for-byte to the explicitly public coming-soon assets. Both responsive scenes render those files in independent SVG image layers, aligned to the existing physical magnet planes. Original photo content is not regenerated, recoloured or retouched. SVG viewBoxes trim transparent product padding; affine transforms scale and angle the photos for the scene. Foreground finger clips preserve the visible grip and existing scene contact shadows. The background remains generated scenery.

A regression test compares all four served source buffers against the originals and checks that both scenes reference each product. All 18 focused authentication and presentation tests pass. Browser checks at 320x568, 390x844, 768x1024, 1280x720 and 1920x1080 confirm correct responsive scene selection and no horizontal overflow; widescreen desktop still fits without scrolling. Desktop and mobile screenshots were compared with the original photographs. Evidence: project output/coming-soon-implementation/originals-desktop-local.jpg, originals-mobile-local.jpg and originals-measurements.json.

This changes only presentation assets and rendering. Website/admin protection, payments and customer workflows remain unchanged. Full deployment checks repeat builds, test suite and protection verification.

---

# Responsive composition correction

17 October 2026. Local implementation and browser checks passed.

The owner reported that the three loose magnets looked pasted on, with the desktop scene shrunk on mobile and a large blank area below the footer. This revision supersedes the separate overlay approach below. Both scenes now integrate all four magnets with consistent perspective, lighting, physical thickness and contact shadows. The desktop uses a 1920 x 1080 composition; phones and portrait tablets use a closer 1024 x 1280 composition. These are image-generated renditions using the supplied product photographs, not pixel-identical original photos. Source assets and exact prompts are in project output/coming-soon-assets/worktable-cohesive-{desktop,mobile}.png and worktable-cohesive-prompts.txt. Production WebP versions are scene-desktop-v3.webp and scene-mobile-v3.webp.

The mobile layout grows the artwork between editable copy and the footer, with dynamic viewport height and safe-area padding. Short phones, landscape phones and tablets can scroll naturally. No fixed desktop canvas is scaled down. Desktop retains a viewport-height composition. Seven named presentation files are public; retired overlays are removed. Authentication, customer workflows and disabled payments are unchanged.

Browser viewport checks: 320 x 568, 390 x 844, 430 x 932, 768 x 1024, 1024 x 1366, 844 x 390, 1280 x 720 and 1920 x 1080. No horizontal overflow. Footer directly follows artwork without a blank tail. All four magnets remain visible in the phone composition. Wide 16:9 screens fit without vertical scrolling. Small-phone Log in opens the password dialog and focuses Password. All 235 tests and storefront/SSR build passed. These are desktop-browser viewport simulations, not physical-device checks. Evidence: project output/coming-soon-implementation/responsive-*.jpg and responsive-measurements.json.

---

# Hand grip, square corners and viewport-fit correction

17 October 2026. Final result: passed locally.

The owner identified three defects after the worktable release: every finger behind the held magnet, a fixed 3:2 canvas causing desktop scrolling, and 6% CSS corner clipping. Those supersede the previous visual acceptance below.

The scene is now a 1920 x 1080 image with the supplied sunglasses magnet composited into a physical grip. Left fingertip/thumb and right thumb overlap its edges with contact shadows. The held image is an image-generated rendition, not pixel-identical product photography. The other three magnets remain original cutout images with border-radius: 0. The desktop hero uses viewport height, with typography scaled to available height; phone layouts retain normal document flow and accessible content.

Built-in image generation edited the existing tabletop scene with the original sunglasses product as a supporting image: preserve the couple/photo, place a thin sharp-cornered square magnet in a natural grip with visible finger overlap, keep ribbon/tissue/heart and blank upper/right areas, output a 16:9 photo with no UI or text. Source and full prompt: project output/coming-soon-assets/worktable-held-v2.png and worktable-held-v2-prompt.txt. Production: public/coming-soon/worktable-held-v2.webp.

Measured document and viewport sizes match at 1920 x 1080 and 1280 x 720, with no horizontal or vertical overflow. The three overlay wrappers all compute to 0px radius. At 390 x 844 the page also fits without horizontal overflow. Images load and the password dialog still opens and closes. Storefront build and 17 focused authentication/presentation tests pass. Screenshot evidence: project output/coming-soon-implementation/grip-1920.jpg and grip-1280.jpg. Deployment workflow repeats the full suite and protection checks.

---

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
