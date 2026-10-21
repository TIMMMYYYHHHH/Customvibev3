# Release S: bounded live UI checks

Current source: `4282dcfe46d2750d8349965bb3c910bbc157d2c0`.

Read-only observations were recorded on 21 October 2026 after the public site and matching Admin release were reloaded. Retained screenshots were independently inspected and their recorded hashes matched. These observations provide bounded live acceptance evidence. They are not a full WCAG assessment or a numerical quality score.

## Observed public behaviour

- The collections screen displayed normal navigation, a labelled design search, filter controls, populated collection cards and eleven collections. No visible alert appeared in the captured viewport.
- Keyboard entry of `apple` produced the “My first words” result. The search was cleared afterward.
- Keyboard Space selected “Learning & play”. The retained screenshot showed its selected appearance, a visible focus ring and five collections. All collections was then restored with eleven results.
- The filter was identified in the actual DOM as a button using `aria-pressed`. A differing role label in the native accessibility surface caused an initial selector miss. That tool representation mismatch does not establish a product defect.

## Observed Admin behaviour

- The authenticated Store content screen loaded and displayed Private store, Payments unavailable, artwork retention of fourteen days, order-details retention of six months and All changes saved. The visible Save changes control appeared disabled.
- Tab moved from Store content to Themes & seasons; Shift+Tab returned to Store content. The retained screenshot showed visible focus around Store content. This verifies that limited traversal, not the complete focus order.
- The root reviewer additionally reported that the Orders board loaded and the existing Preview update and View send history controls were present. Those controls were not activated during these checks.
- Existing history labels reported “Owner email Provider accepted” and “Customer order email Provider accepted”. These are historical provider-acceptance labels only. Linked actual-delivery variants were not observed. No sending, inbox delivery or new delivery status is established by this evidence.

The interactions were restored safely. No customer records, order stages or content were saved, and no preview, sending, payment or CAPTCHA action was performed.

## Console observations and limits

The captured Admin warning/error count was zero. Twelve repeated public console messages came from the challenge provider. These captured messages do not establish an application regression or functional Turnstile acceptance. Browser logging was available; network traces, response headers and resource timings were not exposed by the supported browser surface.

## Remaining acceptance

TECH29 remains In progress. Genuine browser 200% zoom, complete keyboard and populated studio/checkout journeys, fresh isolated unauthenticated gate behaviour, actual network/runtime and analytics transport, screen-reader announcements, physical devices, orientation and other browser engines remain unverified in this pass. Prior local fixes and earlier sampled transport observations retain their own evidence and scope. No public-launch, payment-activation, full accessibility or delivery-completion approval follows from this note.
