# Delivery information wording, 23 October 2026

Owner-approved copy for the existing Shipping and delivery page. This changes wording and one source link only. It does not change checkout acceptance, shipping calculations, stored orders, payment, booking, dispatch, email or retention behavior. Local implementation is separate from publication and live verification.

## Customer wording

Under Production and delivery times:

> Once your order has been handed to The Courier Guy, delivery follows their estimated locker-to-locker transit times.

The existing section link reads **See The Courier Guy’s delivery information.** and points to https://thecourierguy.co.za/locker-courier-services/. It uses the policy section's existing third-element links array and the existing PolicyPage renderer. No new UI, icon or external-link behavior is introduced.

The requirement to confirm production and delivery estimates before payment, and the sentence promising communication of material delays, remain. No numeric production or transit promise is added. The former broad production/transit TODO is replaced by the approved carrier-estimate wording and the retained before-payment confirmation requirement.

Under Collection and problems:

> Please collect by the deadline in your courier notification. Contact us if you need help with a delayed, damaged or uncollected parcel.

This replaces the superseded collection-window/missed-collection TODO wording and previous generic help sentence. The separate tracking/liability TODO remains unresolved; no insurance promise or customer liability waiver is inferred. The section date is 23 October 2026. Coverage, exclusions, parcel size/weight, business, VAT and other unrelated policy TODOs remain. Delivery stays R69 below R1,000 merchandise subtotal and free from exactly R1,000. The site still records unpaid orders and makes no courier bookings.

The owner declined a support enquiry. No provider contact or new support request forms part of this change.

## Verification boundary

The existing policy renderer supports the link array. No new test mirroring the approved text is necessary. The coordinator should run the existing public build/SSR/prerender and matching Admin build for the shared policy surface, existing relevant policy/shipping checks, and normal notice checks, then inspect Shipping and delivery and the actual link on the released site. Confirm the retained pricing/unknowns and do not describe local code as deployed. No build, test, commit, push or publication is claimed by this document.
