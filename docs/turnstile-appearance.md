# Public form verification appearance

Owner decision, 17 October 2026: show Cloudflare Turnstile only when the visitor must interact. The large successful-verification box should not remain in checkout.

The shared `FormSecurity` component sets `appearance: 'interaction-only'` and explicitly retains `execution: 'render'`. Both checkout and contact forms use this component. The existing Managed widget, light theme, site key and action are unchanged. No provider account setting or security Worker change is needed.

This is a supported provider visibility setting, not CSS that conceals a challenge. Verification still starts as the form becomes ready. Submit controls and submission logic require a token, expiry clears it, and an error clears it and shows the existing recovery message. Server verification of token success, hostname and action, CSRF, duplicate protection and quotas is unchanged.

Official reference: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/

Verification uses the existing automated security tests and read-only browser checks. Do not send a real message, submit an order or deliberately trigger an abuse challenge to check this visual change. A normal successful browser check does not prove the interactive challenge or provider-failure cases on a physical phone; those remain part of existing launch/form checks.

## Release verification

Application `6805669` published through [protected workflow 38985002395](https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/38985002395). All 167 automated tests, public build, 21-page prerender, admin build, business destination checks and post-publication protection checks passed. The admin Worker deployment step was skipped.

Live contact and checkout loaded the new `main-xIrkVa-1.js` bundle. In both forms a normal automatic check produced a token and enabled the existing submit control, with no visible success box. The checkout security container measured zero height after success. Required fields and consent were left empty. No token value was recorded, and no form was submitted. A public brand icon was used only in an unsent browser draft to reach checkout; reload cleared it afterward.

Founders Hub tracks this separately under Improve checkout and confirmation pages. The parent still needs the existing owner review of checkout/confirmation under final launch checks. Blocked availability, email acceptance and courier API work stay on hold.
