# Admin card surfaces, 17 October 2026

Owner requested removal of the glowing appearance on order-board cards. The cards used pure white with a small resting shadow and a wider blurred hover shadow.

`admin/orders.css` now uses the existing warm paper token for resting and hovered cards. Both states have no box shadow, and hover retains its border-colour cue. Stage colours, keyboard focus, drop-target feedback, order actions and manual email controls are unchanged.

Verification: production admin build and asset preparation passed; eight existing admin UI and stage-move tests passed. Browser inspection confirmed all six synthetic order cards use `rgb(255, 253, 248)` and `box-shadow: none`. Move order controls expand normally. No customer records or emails were changed during verification.
