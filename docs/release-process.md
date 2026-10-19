# Release process

## Validate before merging

The `Validate proposed CustomVibe changes` workflow in `.github/workflows/validate.yml` runs for pull requests targeting `main`. Its check is named `Node 22 build and fixture tests`. It checks the proposed merge revision on an Ubuntu runner using Node 22 and the committed dependency lockfile:

1. `npm ci`
2. `npm run build` for the storefront, SSR bundle and prerendered pages
3. `npm run build:admin` for the admin and shared storefront preview
4. `npm test` for the Node local fixture suite
5. `python3 -B -m unittest discover tests/python` for the Python security-helper fixtures

Each command must succeed. A failing command stops the job; no step permits failure. The job has a 15-minute limit, and a newer revision cancels validation of an older revision on the same pull request. There are no path filters, so configuration, documentation and dependency changes also get validation.

This is a validation-only workflow. It uses `pull_request`, never `pull_request_target`, read-only repository contents permission and checkout without persisted credentials. It references no production secrets, deployment environment or customer service bindings, and does not deploy, send customer email or access production records. Tests use local fixtures. Keep any future validation steps credentials-free and do not run untrusted pull-request code with production credentials.

Before merging, review the diff and require a successful result for the latest revision, including both builds and the full suite. Fixture checks do not replace visual review, production protection checks or separately tracked physical print and QR acceptance. Keep the existing protected publish workflow in `.github/workflows/publish.yml` unchanged: this validation workflow does not grant public launch, enable payments or alter the website and admin gates.

### Repository enforcement and evidence

Verified repository ruleset `25416396` is active on `main` as of 19 October 2026. It requires the exact check `Node 22 build and fixture tests`, bound to GitHub Actions integration `15368`, with no bypass actors. The effective branch rules were reread to confirm enforcement. This replaces the earlier observation that the branch had no protection. Enforcement was configured without a paid upgrade. Rule enforcement does not establish that a particular proposed revision passed: require a successful GitHub check for the current pull-request head and its proposed merge revision before merging.

Local Node 22 verification and an actual GitHub Actions run are separate evidence. Record the tested revision, exact runtime, install/build/test results and any warnings in the release or task activity. Required-check enforcement is verified as described above; CI acceptance for each current pull-request revision remains separate and must be confirmed from its completed GitHub run. Local results or a passing run for an older revision do not satisfy that requirement.

To reproduce validation locally, use a clean disposable checkout with no production credentials, install Node 22 and Python 3 and run the five commands above in order. The Python fixtures use only the standard library and stub provider requests; they need no packages, credentials or live connection. A negative control may add a deliberately failing fixture only in that disposable checkout and confirm its test command exits nonzero; remove the fixture afterwards and rerun that suite. Never commit the negative fixture or run it against live data.

If validation itself is broken, correct or revert only the new validation workflow through review. Preserve the protected publish workflow and its existing destination and protection checks.
