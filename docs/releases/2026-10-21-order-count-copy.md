# Order-count wording release, 21 October 2026

[PR53](https://github.com/TIMMMYYYHHHH/Customvibev3/pull/53) corrected the shared order-capacity summary from “1 magnets · 1 entries” to “1 magnet · 1 entry”. Zero and larger counts retain their plural labels. The studio, basket and checkout use this same component. Only one application source line changed; capacity calculations, markup, styling and the “/ 60 artwork files” denominator remain unchanged.

The owner approved the normal merge and, separately, one matching website/Admin publication. Released source is [dc8e9328e2d6ea3c5ef3718525d61115d3af63d4](https://github.com/TIMMMYYYHHHH/Customvibev3/commit/dc8e9328e2d6ea3c5ef3718525d61115d3af63d4), tree `d79967aab1211316a51e2dca6194b1a04a7301d2`. Its tree equals the independently reviewed PR head. The feature branch was retained.

| Component | Actual released or retained identity |
| --- | --- |
| Website, new successful canonical Production | `e3b59950-6ef4-4b98-a26c-c9857ed8c9ba` |
| Admin, new sole 100% version | `4df3310f-e4d1-4d19-aeca-07244afd7f1f` |
| Security, retained | `7dbffdd4-2967-4a39-8c54-1b0503e1b77c` |
| Catalogue, retained | `92f3472a-3153-447d-a8be-c79db9498407` |

Catalogue retains its original code provenance `3a16bff91fdab22715450e201f9c874885931d36`; it was not relabelled as this release. The prior Admin version remains in deployment history.

Existing [CI run 39588925223, attempt 1](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39588925223) passed all 732 Node and 7 Python fixtures, locked installation, public/SSR/prerender and Admin builds, and shipped-notices validation. The existing five capacity arithmetic tests and disconnected actual-component rendering for 0/1/2 also passed. No new mirrored test or repeated application suite was added for this wording correction.

One final-source local build/package sequence passed using checksum-verified official Node 22.23.3 and retained locked dependencies. Independent review cleared the source, complete 521-file native package and matching Admin artifacts. Admin executable bytes matched across Node 22 and helper Node 24. The Functions bundle legitimately changed with its current SSR/client-manifest inputs; old/new Worker byte equality is not claimed. Security/Catalogue physical inputs and all configurations remained unchanged, so neither service was rebuilt or redeployed.

The website was published through the existing Production Direct Upload, with one Save and deploy click at 11:47:48.823 UTC, before the original raw Pages deadline 11:47:50.906. Fresh schema/source/Catalogue and protection checks on all four components preceded it. After its actual acknowledgement and canonical readback, one fixed Admin helper message was sent at 11:54:34.432 UTC, with acknowledgement at 11:54:53.984. All 12 fresh before/after metadata checks, actual version identities, current main and helper lease checks passed by 11:55:09.093 UTC. No uncertain write was retried.

Native provider commit metadata was empty. Website provenance rests on the reviewed source/compiler/file manifest, exact selected archive, trusted upload/action/acknowledgement and actual canonical identity. No provider commit annotation, raw remote Worker-byte checksum or coordinator baseline was fabricated.

Live read-only DOM records establish these counts:

| Case | Checked surfaces | Observed summary |
| --- | --- | --- |
| Empty basket | Studio | `0 magnets · 0 entries · 0 / 60 artwork files` |
| One photo | Studio, basket, checkout | `1 magnet · 1 entry · 1 / 60 artwork files` |
| Two copies of one photo | Studio | `2 magnets · 1 entry · 1 / 60 artwork files` |
| Two photo entries | Studio, basket, checkout | `2 magnets · 2 entries · 2 / 60 artwork files` |

Independent closure review cleared the completed release and live count evidence. The studio screenshot visibly includes the singular count. Checkout count acceptance comes from its DOM records; checkout screenshots do not show that count line. No order/contact submission, email send, extra probe or customer-record change was used for this wording release.

Authenticated Admin loaded, with accurate Unpaid/payment-unavailable and retention guidance. A manual Preview update control was visible and disabled in the observed order. That observation does not establish its disabled reason or verify preview/sending functionality; neither Preview update nor Send update was clicked, and no stage was changed.

Production and canonical retained the exact 21-variable enabled mail target; Preview retained its nine variables without mail-event secret/markers. The website password gate, separate Admin authentication, payments OFF, manual customer-update policy, original 14-day private artwork expiry, six-calendar-month order history, quotas and service controls were preserved. No settings, permission, migration, paid feature or service change occurred.

Detailed local operation/DOM evidence remains under `audit/fix-plan/order-count-copy-release-sol61/` in the project workspace. These paths are retained evidence, not claims of published repository blobs. `FINAL-RELEASE-VERIFICATION.json` SHA256 is `6c4bc28f81d9b892b7919c2b9e360f435fdd4962849c8f98ff6ea4b863b19de1`. The 521-file archive SHA256 is `96e61a3131742aa079317cb1805ab7820288f007e21cbdd05ea357f87a7e1ae0`; its local plain Worker SHA256 is `e24b0e5a76b6af6b1c7b729c399cc246ba9d6d3488bbd1d1b276b37243fe71f4`. Historical approval refusals, abandoned captures and stopped timing windows remain preserved separately.

This record does not establish new mailbox/Reply-To, physical-print or QR acceptance. The earlier separately approved mail journey remains documented in [the delivery activation record](2026-10-21-delivery-webhook-activation.md).
