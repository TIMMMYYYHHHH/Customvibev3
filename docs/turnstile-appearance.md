# Public form verification appearance

Owner decision, 17 October 2026: show Cloudflare Turnstile only when the visitor must interact. The large successful-verification box should not remain in checkout.

The shared `FormSecurity` component sets `appearance: 'interaction-only'` and explicitly retains `execution: 'render'`. Both checkout and contact forms use this component. The existing Managed widget, light theme, site key and action are unchanged. No provider account setting or security Worker change is needed.

This is a supported provider visibility setting, not CSS that conceals a challenge. Verification still starts as the form becomes ready. Submit controls and submission logic require a token, expiry clears it, and an error clears it and shows the existing recovery message. Server verification of token success, hostname and action, CSRF, duplicate protection and quotas is unchanged.

Official reference: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/

Verification uses the existing automated security tests and read-only browser checks. Do not send a real message, submit an order or deliberately trigger an abuse challenge to check this visual change. A normal successful browser check does not prove the interactive challenge or provider-failure cases on a physical phone; those remain part of existing launch/form checks.
