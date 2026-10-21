# Prelaunch evidence, 21 October 2026

Evidence-only documentation. No website, Admin, Security or Catalogue source, settings, subscriptions, email sending, customer records or deployment changes. Account recovery and renewals were excluded.

- [Artwork rights and owner-confirmed production facts](artwork-rights/artwork-rights-register.md). Exact static asset inventory and attributed owner assertions; not independent legal or physical clearance.
- [Email authentication and reporting-first DMARC readiness](email-auth/EMAIL-AUTH-READINESS.md). Fresh two-resolver DNS, no policy change; current received-message alignment remains unverified.
- [Signed-in Search Console review](search-console/SEARCH-CONSOLE-REVIEW.md). Available reports reviewed; parent stays open for the existing deferred post-launch verification. No indexing/removal request, crawl/access change or new service.
- [Samsung S25 Ultra phone checks](owner-tests/PHONE-AND-PRINT.md), [historical 75 mm sample PDF, evidence only](owner-tests/print-samples-75mm.pdf), and [production print-template dependency](owner-tests/PRINT-TEMPLATE-HANDOFF.md). The supplied Canva PDF has been inspected; Tim confirmed the finished face is 63.5 x 63.5 mm and the octagons are fold guides. Canva-free PDF preparation is proposed, pending workflow agreement and physical calibration. See the [measured proposal](owner-tests/PRINT-TEMPLATE-REVIEW.md) and [updated test checklist](owner-tests/TEST-CHECKLIST.md) before implementation or production acceptance. The older generic 75 mm PDF is historical synthetic evidence only and must not be used for production sizing.

The production source reference is merged `0d3009c4b19bb588bbb8260dacbfe2e34eb16f61`; the held new Security change is not claimed deployed. Current full frontend/raw evidence remains in the local audit directory. This branch publishes notes only and makes no full-test or release-certification claim.

The owner-confirmed size correction also affects runtime quality arithmetic and saved catalogue copy; see the [bounded correction map](owner-tests/SIZE-CORRECTION-SCOPE.md). This mapping is read-only, not an implemented correction.
