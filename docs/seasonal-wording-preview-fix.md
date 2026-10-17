# Draft wording preview repair

18 October 2026. Owner reported that all four wording fields stayed unchanged in the preview, including after Save draft and Apply changes.

Root cause: the editor filtered out every campaign without an installed theme before sending it to the iframe. The original shared homepage also contained only static copy, so it could not render those overrides. This was not a saving failure.

The explicit draft-preview path now carries the selected campaign even when no theme is installed. Runtime applies its wording only inside authenticated draft preview. The shared original Hero reads each field with a blank-field fallback to its existing JSX, preserving emphasis, line breaks, links and prices. User text is rendered as escaped React text. Installed-theme checks, progress and schedule activation gates remain intact. Website at selected date continues to resolve actual eligible campaigns, so schedules off show the normal website wording. Explanatory preview copy distinguishes these modes.

No settings migration or saved occasion edits are needed. Existing wording will display after the admin reloads. Admin appearance is unchanged. The occasion design boundary is now explicit in AGENTS.md and docs/occasion-theme-prompt.md.

Verification: the new regression test failed against the original preview filter, then passed after the fix. All 261 tests pass; public, SSR/prerender and admin builds pass. Local browser checks confirm immediate edits in all four fields, multiline copy, literal markup escaping, Save draft plus reload, Apply changes plus reload, original wording reset, selected-date mode remaining original while off, and the 390px mobile preview. Production deployment is pending restored business Cloudflare access; its existing connection returned HTTP 401 on 18 October. No live settings were written.

Access troubleshooting, 18 October: owner reports the helper exits with its generic business verification error. The local helper now retains only HTTP status and numeric Cloudflare error codes, and separately checks the fixed business account and existing customvibe-admin settings. It prints no token, provider message, binding payload or secret. Both existing identity and access checks must pass before the socket starts. Seven isolated Python tests cover credential redaction, rejected token diagnostics, wrong identity, missing admin access, failed account verification and network failure. Owner was asked to rerun the same command and report only the safe check lines. No permissions, credentials or live resources were changed.
