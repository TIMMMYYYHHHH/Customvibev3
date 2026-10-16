# Shared email design

Approved by Tim on 16 October 2026 and applied to the six existing Resend messages: customer acknowledgement, owner notification, and New order / In progress / Ready to ship / Shipped manual updates.

## Implementation

The shared renderer is `server/email-layout.mjs`. Order details are formatted by `server/email-order-summary.mjs`; the existing submission and manual-update renderers use both. No new sending system, trigger or database schema was introduced.

The approved cream/plum/berry palette, actual logo and Fredoka lettering, Patrick Hand “From our tribe to yours.” line, Little Thread decoration, pastel panels, 20px outer / 12px inner corners and berry artwork button are retained. Static brand graphics use inline PNG Content-ID attachments so they do not rely on gated asset URLs or external font hosts. Important content is ordinary HTML text, with heading/brand alt text and equivalent plain text. Body fonts fall back to Arial; small section headings use Trebuchet MS. Inboxes without rounded-corner support may show square panels. Forced dark mode and image-blocking behaviour need an actual inbox check.

Inline asset support: [Resend Content-ID documentation](https://resend.com/changelog/embed-images-using-cid). Each message includes three small static brand images. These contain no customer artwork. HTML stays below 100 KB; image payloads are separate MIME attachments. Existing legacy owner print attachments are preserved, while private-storage emails contain only brand attachments and the authenticated owner artwork link. Customer emails never include the admin link or private artwork.

`server/email-assets/` contains the checked-in graphics; `scripts/build-email-assets.mjs` generates their source sheet, using the existing local fonts and logo at 2x display size. Capture each `.asset` at its exact DOM bounds in the browser, transcode to PNG if the screenshot backend returns JPEG, then run `scripts/pack-email-assets.mjs`. Normal builds use checked-in assets and need no graphics tools or network.

## Copy and unchanged protections

Current live payments remain disabled. Emails say order with a separate truthful Unpaid status, without an owner-acceptance step or fictional payment/delivery charge. Future completed paid checkout and its confirmation still require server-verified successful gateway payment; the paid design proposal is not an implemented gateway.

Photo copies and puzzle sets show their derived magnet counts. Existing catalogue snapshots do not retain a per-pack size, so those lines show ordered units and say Included in total rather than inventing a count. The trusted overall magnet count and submitted subtotal remain visible. No record, fingerprint or retry identity changed.

Sender, Reply-To, recipient selection, private artwork access, 14-day retention, quotas, manual stage triggers, send history and idempotency remain intact. The existing admin preview remains plain text and uses the same renderer as sending. Stage changes never send.

## Verification

- New tests were observed failing before implementation, then passed for HTML escaping, quantities, unpaid facts, private links, inline graphics and legacy attachment preservation.
- Independent review identified a catalogue pack count issue. A new regression failed before correction and passed afterward, without changing saved records or fingerprints.
- Actual HTML was rendered in a local gallery using fictional data only. Desktop and 390px mobile checks covered all six variants, embedded image loading and a long-content fixture, with no horizontal overflow.
- Public/admin builds passed. Final full suite: 144 automated tests passed. `git diff --check` passed. Publication evidence follows below.
- No real email sent, no production order stage changed and no accepted update resent. A separately authorised fresh-message inbox check remains needed for Gmail/Outlook/Apple Mail, forced dark mode and the delivered inline images. Prior successful delivery and Reply-To remain historical evidence only.

## Scope still tracked separately

W3Forms contact HTML is provider-controlled; no provider change or further contact test was requested. Gmail saved templates/signature are not yet inventoried. Customer artwork thumbnails remain under Improve order emails with design previews. Website-wide order terminology and payment integration remain in their existing board tasks. The broad email-review parent stays open until required inventory, inbox checks and final acceptance are reconciled.

Local review: run `node scripts/preview-email-design.mjs`, then serve `docs/email-template-review` locally. Actual-render gallery: `/implemented/`. Original approved paid proposal remains in the local review directory and is explicitly fictional.
