# Dependency inventory and manual maintenance

Tim owns one manual dependency review each month, starting **20 November 2026**, plus earlier review when a relevant advisory arrives or the lockfile changes. This is a rolling human process in Founders Hub, with no automated reminder, Dependabot schedule or automatic upgrade. Use [Review dependencies and licences monthly](https://foundershub.kznwebstudio.co.za/?project=b9ac1199-2497-4d7d-b8a1-227ecb2fd133), task `1f82e05a-cf53-4f72-b460-2a029d615376`, under Upkeep / Maintain service records, recovery and renewals. Keep implementation acceptance and release milestones in their existing technical tasks; the future recurring review is separate work.

## Cadence and bounded routine work

After each monthly review, add a dated activity update with the outcome, evidence links, actual PR/run usage and remaining work. Move the same task's due date to the same calendar day in the following month, rather than creating a duplicate or marking future reviews complete. For example, the 20 November review rolls to 20 December 2026. Tim remains responsible. Record advisory or lockfile-triggered reviews in that same task; do not wait for its monthly date to triage a relevant security issue.

The routine budget for each calendar month is:

| Routine work | Bound |
| --- | --- |
| Proposed dependency changes | At most one update group in one PR, with at most one dependency-update PR in flight |
| PR validation | At most three executions total, including revised commits, failed/cancelled attempts and reruns; one standard `ubuntu-latest` job, at most 15 minutes each |
| Publication | At most one separate reviewed manual publication execution, at most 15 minutes, subject to every existing release prerequisite |
| Combined Actions execution budget | At most four single-job executions and 60 execution-minutes; a review with no PR or publication needs no Actions run |

Count executions in the month they run, including a publication following an older PR. Batch related changes before pushing, avoid unnecessary revisions and record run IDs, results and durations. The existing workflow timeouts bound each job; the PR count and monthly total are operator-enforced process limits, not an automated monthly cap. Stop optional update traffic at the limit. Required security investigation and remediation continue under normal review and existing authorization: record the reason, additional scope/run budget and review before extra executions. This routine allowance is not a global stop on required security fixes and never waives release gates.

GitHub's standard hosted runners, including `ubuntu-latest`, are [free and unlimited for public repositories](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job). CustomVibe's public repository and current standard-runner workflows were verified on 20 October 2026. This establishes the runner-minute cost basis for this unchanged scope, not account-wide billing or storage headroom. Private repositories, [larger runners](https://docs.github.com/en/actions/concepts/runners/larger-runners), new storage consumption and paid features are outside this allowance; verify their actual allowances and obtain any required owner approval before expanding scope. Keep existing service-cost controls. This process enables no paid service, storage expansion or automation.

`.github/workflows/validate.yml` validates PRs targeting main. `.github/workflows/publish.yml` is manual `workflow_dispatch` only, with a separate 15-minute standard-runner job. Neither a PR nor its merge publishes the website. Keep independent review, the required `Node 22 build and fixture tests` check, disabled auto-merge and the exact-source, baseline, protection, compatibility and paired-release requirements in [the release process](release-process.md). A reserved publication execution is not publication authorization or evidence that activation prerequisites are complete.

## Offline inventory

From the intended checkout with the configured Node 22 runtime:

```sh
node scripts/dependency-inventory.mjs > /private/tmp/customvibe-dependencies.json
# Or explicitly select another intended checkout:
node scripts/dependency-inventory.mjs /absolute/path/to/checkout > /private/tmp/customvibe-dependencies.json
node --test tests/dependency-inventory.test.mjs
```

The script reads only `package.json` and `package-lock.json` at that root. It needs no installed dependencies, Git, credentials or network. It imports only Node built-ins, never executes package/lifecycle hooks, never follows lockfile link targets and never reads `node_modules`, licence files, environment files, process environment or arbitrary package paths. It writes JSON to stdout only; the caller chooses any evidence destination. The two input files must be regular files with no final symlink, at most 256 KiB and 10 MiB respectively. Reads remain bounded if a file grows. File/JSON failures report a fixed input name without contents. Use an intended trusted checkout; this is not a sandbox for a concurrently hostile filesystem.

The supported input is npm lockfileVersion 2 or 3 with its root `packages` record and normal `node_modules` package paths. Lock links are listed as unsupported and never dereferenced. Workspace/non-package paths, malformed dependency maps and older lockfile layouts fail explicitly, rather than guessing their meaning. Supporting another package manager or workspace resolver requires a separately reviewed change.

Each report has a generation time and SHA-256 of both exact input files. Record the reviewed Git revision separately in the dated task evidence. Regenerate after a change. Do not commit a second static inventory as authoritative or treat a report with another lock hash as current.

| Report field | Meaning and limit |
| --- | --- |
| `direct` | Every dependency/dev/optional/peer declaration from the manifest, including a name declared in several groups. Common range/tag text is retained; other source specifiers are omitted to avoid printing source URLs or embedded credentials. No semver satisfaction check is performed. |
| `entries` | Every non-root locked package path, version if recognized, declared licence status, platform declarations and lock flags. `transitive` means it has no resolved direct declaration. This includes optional distributions for other platforms, regardless of this machine's installation. |
| `dependencies` / `viaDirectDependencyRoots` | Dependency and optional/peer graph edges resolved by the lock's nested/hoisted paths, with cycles bounded. Optional declarations override duplicate regular edges. Root labels identify graph relationships, not actual executable reachability. Package dev-only declarations are not installed transitive dependencies and are not traversed. |
| `unresolvedDependencies` | Required versus optional missing references, including optional peers that may legitimately be absent. A missing optional declaration is not an installation defect or a reason to add a package automatically. Investigate an unresolved required reference in context. |
| `manifestLockMismatch` | Manifest and lock root dependency declarations differ. This is a consistency warning, not permission to resolve or rewrite the lock. |
| `licenseDeclared` / `licenseStatus` | Uninterpreted metadata. Missing/blank is `missing`; unsupported, oversized or control-containing metadata is `unknown`; file pointers are `reference`; `UNLICENSED` is `unlicensed`. Other printable nonempty strings are `declared`, without asserting valid SPDX syntax, a licence grant or compatibility. |
| `licenseReviewRequired` / `licenseCounts` | Review locations for the preceding non-declared cases and counts of exact declaration strings (`UNKNOWN` groups absent/unusable values). A declared expression can still need legal/distribution review; an empty review list is not clearance. |

Flags can overlap. OS/CPU declarations are not platform admission decisions. Unknown versions remain null. Non-range requested values, raw resolved URLs, registry credentials, package scripts and lockfile link targets are not printed. Exit 0 means the bounded inventory completed, even if it reports unknown metadata, unsupported links, drift or unresolved references. Exit 1 means the inputs/arguments were unsupported or unreadable. Neither outcome is a vulnerability scan, licence-text review or legal opinion. No registry or installed provider/runtime state is checked.

## Monthly review record

1. In an isolated checkout, record the date, reviewer, source revision, configured Node/npm versions and the generated report's input hashes. Keep the full dated report with local audit/task evidence, plus a concise activity update linking that evidence. Inspect direct/transitive changes, optional declarations, missing metadata and unresolved required references. Preserve the last report as historical evidence, not as current authority.
2. Reuse `scripts/check-dependency-notices.mjs` from the existing notices work. With the exact private dependencies available, run `node scripts/check-dependency-notices.mjs` for exact installed licence/version/font checks. After prepared public/SSR/admin builds, run `node scripts/check-dependency-notices.mjs --outputs --bundles` for output and measured browser/helper coverage. The offline graph does not replace that checker and does not prove that a tooling dependency ships to customers.
3. Check current official registry/changelog/advisory sources and record retrieval dates, exact affected ranges, package/path applicability and unavailable sources. Refresh those checks and the candidate's direct/transitive licence declarations and actual changed licence texts when executing a dependency change; historical inventory or audit evidence cannot clear a new candidate. An optional `npm audit --package-lock-only --ignore-scripts --json --registry=https://registry.npmjs.org/` is a network operation, not part of the offline inventory command. Use a private cache and treat a successful indexed advisory result as time-bounded evidence; failed connectivity or an absent advisory record is unknown. Do not run `npm audit fix` as part of a review. Version age alone is not a vulnerability. Existing audit readers under the local `audit/fix-plan` evidence are historical helpers, not scheduled jobs or another inventory authority. See the [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit/).
4. Propose at most one bounded update group at a time, with exact old/new versions and lock hashes, engine/peer requirements, changed declared/full-text licences, browser/server/build/tool paths, actual advisory applicability, validation and rollback. Keep React/react-dom together; treat the Vite major migration separately. A changed licence declaration is a review trigger, not an automatic compatibility conclusion. No further upgrade is enabled by this document.
5. For an in-scope candidate trial, follow the existing reviewed validation/release workflow: fresh private install with scripts disabled unless explicitly required/reviewed, public/SSR/prerender and admin builds, Node/Python fixtures, relevant disconnected UI/artwork/QR journeys, and the notices checker. Freeze the exact diff for independent review. Normal current-head checks and protected release rules still apply; no automatic merge or deployment. Roll back package manifest/lock together, rebuild matching applications and preserve rejected-trial evidence. Never include secrets or real customer information in evidence.

The offline tool does not enforce this monthly budget or check provider allowances, event monitoring or legal/distribution decisions. Keep website/admin locks, disabled payments, manual customer email and current privacy/retention controls throughout maintenance.
