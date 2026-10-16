# Shared email design

Approved by Tim on 16 October 2026 and applied to the six existing Resend messages: customer acknowledgement, owner notification, and New order / In progress / Ready to ship / Shipped manual updates.

## Implementation

The shared renderer is `server/email-layout.mjs`. Order details are formatted by `server/email-order-summary.mjs`; the existing submission and manual-update renderers use both. No new sending system, trigger or database schema was introduced.

The current revision retains cream/plum/berry branding, the Little Thread decoration and 20px outer / 12px inner corners. Brand, headings and “From our tribe to yours.” are now live HTML text, with Fredoka/Patrick Hand named first and email-safe Trebuchet MS/Arial fallbacks. Gmail can use the fallback fonts. Neutral panels have no bright outlines; clients supporting dark CSS receive a restrained charcoal/plum palette. This replaces the initial fixed-cream text graphics after Tim's Gmail phone screenshots exposed their light rectangles in dark mode.

Only the icon and transparent Little Thread use PNG Content-ID attachments, about 32 KB combined. They contain no customer artwork. Heading, brand and signoff remain readable with images blocked; equivalent plain text remains available. HTML stays below 100 KB. Existing legacy owner print attachments are preserved; private-storage emails contain only decorative attachments and the authenticated owner artwork link. Customer emails never include the admin link or private artwork.

`scripts/build-email-assets.mjs` copies the existing small icon and renders the transparent thread with Sharp; `scripts/pack-email-assets.mjs` packs the checked-in PNGs. Normal builds use checked-in assets and need no graphics tools or network. Obsolete fixed-background wordmark/heading graphics have been removed.

Gmail can recolour messages independently of dark CSS. Browser previews demonstrate our HTML and supported palette, not Gmail's conversion. Actual Gmail phone acceptance remains required. References: [Litmus dark-mode guide](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers), [client support for dark media queries](https://www.caniemail.com/features/css-at-media-prefers-color-scheme/), [Resend Content-ID support](https://resend.com/changelog/embed-images-using-cid).

## Copy and unchanged protections

Current live payments remain disabled. Emails say order with a separate truthful Unpaid status, without an owner-acceptance step or fictional payment/delivery charge. Future completed paid checkout and its confirmation still require server-verified successful gateway payment; the paid design proposal is not an implemented gateway.

Photo copies and puzzle sets show their derived magnet counts. Existing catalogue snapshots do not retain a per-pack size, so those lines show ordered units and say Included in total rather than inventing a count. The trusted overall magnet count and submitted subtotal remain visible. No record, fingerprint or retry identity changed.

Sender, Reply-To, recipient selection, private artwork access, 14-day retention, quotas, manual stage triggers, send history and idempotency remain intact. The existing admin preview remains plain text and uses the same renderer as sending. Stage changes never send.

## Verification

- New tests were observed failing before implementation, then passed for HTML escaping, quantities, unpaid facts, private links, inline graphics and legacy attachment preservation.
- Independent review identified a catalogue pack count issue. A new regression failed before correction and passed afterward, without changing saved records or fingerprints.
- Actual HTML was rendered in a local gallery using fictional data only. Desktop and 390px mobile checks covered all six variants, embedded image loading and a long-content fixture, with no horizontal overflow.
- Public/admin builds passed. Final full suite: 144 automated tests passed. `git diff --check` passed. Publication evidence follows below.
- At initial publication, no real email was sent, no production order stage changed and no accepted update was resent. The subsequently authorised Gmail check is recorded below. Outlook/Apple Mail and forced dark mode remain unverified.

## Scope still tracked separately

W3Forms contact HTML is provider-controlled; no provider change or further contact test was requested. Gmail saved templates/signature are not yet inventoried. Customer artwork thumbnails remain under Improve order emails with design previews. Website-wide order terminology and payment integration remain in their existing board tasks. The broad email-review parent stays open until required inventory, inbox checks and final acceptance are reconciled.

Local review: run `node scripts/preview-email-design.mjs`, then serve `docs/email-template-review` locally. Actual-render gallery: `/implemented/`. Original approved paid proposal remains in the local review directory and is explicitly fictional.

## Publication, 16 October 2026

- Application commit: `0967af7`.
- Business admin Worker: `61e7f598-90eb-431c-a07c-64551802731e`.
- Protected Pages publication: [workflow 38938316022](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38938316022), successful including both builds, 144 tests and before/after gate checks.
- After Tim restored admin access, signed-in live verification passed: the deployed preview showed the recorded recipient, saved New order stage, correct magnet count, truthful unpaid facts and From our tribe to yours. The already accepted update on CV-000001 remained blocked from duplicate preview/send with its accepted history intact. Previewing a different unattempted order left its stage and history unchanged; the preview was cancelled without sending. No order stage or email history was modified. Actual inbox rendering/delivery remains a separate authorised fresh-message check.

## Fresh-order Gmail check, 16 October 2026

Tim authorised one fresh live unpaid order to his confirmed email, approved placeholder contact/delivery details and a non-personal solid-colour sample image, and explicitly confirmed the checkout's private 14-day storage consent. The normal storefront submitted once at 19:48 SAST, creating `CV-7MPC-PSSM-4AKM-4R9A`: one photo magnet, R50 subtotal, no payment or delivery booking.

- Both the customer acknowledgement and owner notification arrived in their intended Gmail inboxes, each with one matching search result. This is actual inbox evidence, separate from the admin's provider-accepted result.
- Both displayed the inline logo, branded heading, From our tribe to yours. line and Little Thread decoration. Desktop screenshots showed rounded outer and inner panels, readable order details and truthful Unpaid wording. Customer Gmail used a dark interface around the light email; this does not verify forced email dark mode.
- Customer Reply-To was the orders address; owner Reply-To was the customer address. Gmail showed `rsend.customvibe.co.za` as mailed-by, `customvibe.co.za` as signed-by, and TLS for both.
- The owner's artwork action targeted the matching authenticated admin order. Live admin showed New order, unpaid, one image/one copy, R50 subtotal, both provider accepted and artwork expiry on 30 October at 19:48. No manual update was sent and no existing order stage or history was changed.
- Tim subsequently supplied Gmail phone screenshots: dark-mode visual acceptance failed because the cream text-image rectangles and bright panel outlines remained conspicuous. The correction is described below. Outlook, Apple Mail, image blocking and forced dark mode remain unverified. The existing local 390px layout checks do not replace these client checks.
- Found a minor singular-copy issue: the one-magnet summary says “1 magnets in total”, and the owner introduction says “1 magnets”. Correction is tracked as the shared email-review subtask “Correct singular magnet wording in emails”. No resend is needed to verify that copy correction.

The fresh-order check remains In progress for phone confirmation. The broad email-review parent remains open for inventory reconciliation, the tracked correction, remaining client checks and linked-scope/final acceptance. No customer contact details or artwork were copied into Founders Hub.

## Gmail dark-mode and brand correction, 16 October 2026

Current publication status: both Pages and admin are published. The earlier access blocker below is historical; see the restored-access checkpoint at the end. Actual Gmail phone acceptance remains pending.

Tim authorised correction of the phone dark-mode colours and exact CustomVibe spelling everywhere. Live HTML text replaces fixed-background brand/headings/signoff; neutral borderless panels remove the bright edges. The transparent thread remains decorative. The site header/footer, admin header, shared sign-in page, email wordmark and social-sharing artwork now use CustomVibe. Existing titles/metadata/manifest already used this case. Domains, email addresses, technical identifiers and historical records remain unchanged.

The one-magnet owner introduction, preheader and HTML/plain-text summary now use singular “magnet”. Two regression tests were observed failing before implementation, then passed: essential text survives image removal across all six variants, and single-item wording is singular. The complete suite passes 146 tests; public/SSR/prerender and admin builds pass. Business admin bundling also passes without deployment. Local light/dark and 390px checks show no fixed cream text rectangles or panel borders. These are local checks, not an actual Gmail phone result.

The existing protected GitHub publishing workflow now has an optional manual `publish_admin` input, default false. It uses the existing business credential and checks the existing admin settings before and after publishing. No account, resource, credential or access scope is created or expanded. The local Wrangler login points to the personal account and must not be used for this deployment.

Pages publication succeeded in [workflow 38964875138](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38964875138), including builds, 146 tests and before/after protection checks. Signed-in live header/footer spelling is verified. This publishes acknowledgement/owner rendering and website/sign-in/social branding. The optional admin run [38964894096](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38964894096) stopped at the read-only settings guard because the existing Pages credential could not read business Worker settings; no admin deployment occurred. Manual email templates/admin branding remain on the previous version until the owner restores existing business deployment access through the private helper. No personal login was used. The workflow now runs its final Pages protection check even if the optional admin step fails. No email was sent, accepted update retried or order stage/history changed during this correction. The fresh-order verification and dark-mode subtask stay open until a separately authorised fresh message is checked on Tim's phone. The broader email and wording parents retain their other outstanding scope.

Final checkpoint: [protected workflow 38965457622](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38965457622) passed for c7b75bd. Signed-out requests still return 401 password forms for both live hosts; the website gate shows CustomVibe, while the admin gate still has the old spelling because that deployment is pending. Local 390px checks cover all six revised variants and long unbroken names. Founders Hub's project display name is now CustomVibe and persists after reload. The singular-wording subtask is complete because its customer/owner renderers are published through Pages. Branding/manual-template completion remains blocked on existing business Worker publishing access; the owner was given the private helper step. Gmail phone acceptance remains open and no new test email was sent.


## Restored-access publication checkpoint, 16 October 2026

Tim restored the existing business deployment access privately and authorised publication. The business account and remote main were checked; main matched `a3648d1` (application revision `30746ff`). The admin build and preparation passed, and the existing business admin Worker published as `de9ede5d-d55a-4dd5-91ce-a4ebbfc1aa07`. The read-only admin guard passed before and after publishing. Required credentials were checked by name/presence only; no secret values were retrieved. No migration or order mutation was performed.

Both signed-out live hosts returned protected 401 password pages with exact CustomVibe branding. After Tim signed in, the live admin header and 14-day retention banner were verified. The fresh-order manual preview displayed its recorded recipient, New order stage, one magnet, truthful Unpaid status and From our tribe to yours. The preview was cancelled without sending. CV-000001 remained In progress with its accepted updates and duplicate-preview/send block intact. Its artwork expiry remained 30 October. All six template renderers are now published across Pages and admin; this is not a new Gmail inbox rendering result.

Availability follow-up: Tim initially received a 503 on admin sign-in. A normal retry succeeded; a later read-only navigation to Orders also returned 503, then a reload briefly showed an empty shell. A subsequent reload and order-detail navigation succeeded. The cause is unconfirmed. Temporary security-service live logs showed reserve/status/order requests without an uncaught exception; this does not prove every response succeeded because application failures are caught. Existing storefront access and the scheduled cleanup also responded. No authentication settings were weakened or changed, no speculative rollback was performed, and no paid/persistent logging was enabled. Track this separately in Founders Hub and do not describe it as fixed merely because the latest request worked.

The exact-brand subtask is complete. The Gmail dark-mode and fresh-order acceptance subtasks remain open for a separately authorised fresh message checked on Tim's actual phone. No new email or accepted-update retry occurred during this publication. The broader email and wording parents remain open for their other scope.

## Availability investigation checkpoint, 16 October 2026

The availability note above is superseded by [admin-availability-verification.md](admin-availability-verification.md). Application `d52dd90` and admin `ed8ffa2a-b779-40bb-a636-97e97b966767` publish bounded read recovery and targeted artwork retry. 159 tests and protected publishing checks pass. Normal sign-in, Orders and the manual recipient/message preview work, with accepted history preserved. Live D1 internal errors still occur despite bounded recovery, so the availability task remains open. Phone email acceptance is paused until that issue is resolved. No email or stage change was made during this investigation.
