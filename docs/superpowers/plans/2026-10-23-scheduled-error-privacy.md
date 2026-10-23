# Scheduled failure privacy implementation plan

> For agentic workers: use the subagent-driven-development workflow for this single task. The coordinator owns review and publication decisions.

**Goal:** Prevent private original hourly exceptions from escaping the scheduled handler while retaining a failed invocation.
**Architecture:** Keep the existing sanitized category then reject with a fresh fixed Error. No new module, service or configuration.
**Tech stack:** Existing JavaScript Workers and Node actual-handler tests.
**Spec:** `docs/superpowers/specs/2026-10-23-scheduled-error-privacy-design.md`.

## Global constraints

No producers, capture/sampling, sender, service, configuration or telemetry expansion. Preserve exact cleanup order, partial work, no retry, successful silence and caught-map/five-minute continuation. Do not touch the coordinator's existing recovery-runbook edit. No provider action, real email, deployment, push or merge in this task.

## Review focus

- Sensitive message/stack/cause/custom properties must not escape through the new rejection.
- All hourly phase failures must remain rejected with the original fixed safe category logged.
- Partial cleanup must remain partial, without replay or retries.
- Maps failure remains caught and continues existing scheduled work.
- Existing success and five-minute behavior remains unchanged.

## Task 1: Redact the hourly rejection boundary

Files owned: `security/index.mjs`, `tests/scheduled-diagnostics.test.mjs`, and the Hourly cleanup failures section of `docs/availability-runbook.md`.

- [ ] Run existing focused scheduled diagnostics as baseline. Use the established Node22 runtime and existing dependencies, with no install/upgrade.
- [ ] Update the real-handler tests first: assert rejection is an Error distinct from the fixture original, with name Error, exact message `Scheduled cleanup failed`, no original cause/custom properties and no sensitive sentinel in own property values or stack. Cover each hourly phase and partial mail cleanup; retain exact operation, safe-category and offline assertions. Add representative custom properties to the sensitive fixture. Watch these tests fail on the existing original rethrow for the expected identity/message reason.
- [ ] Replace only the hourly original rethrow with a fresh fixed-message Error without cause. Do not change any other catch/phase or module.
- [ ] Run focused scheduled, locker-health and map regression tests, then the project test suite with required generated build prerequisites. Report all failures honestly and distinguish environment failures. Do not rerun unchanged completed browser fixtures merely for status.
- [ ] Update the runbook to describe fixed failure rejection and remaining platform-enrichment privacy limits. Self-review diff, run diff check, and write a concise report with commands, counts and red/green evidence under continuation-20261023. Leave changes uncommitted for coordinator review; no push or deployment.
