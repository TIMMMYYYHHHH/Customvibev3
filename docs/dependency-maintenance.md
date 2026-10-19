# Dependency inventory and manual maintenance

Run one manual review each month, and review sooner when a relevant advisory arrives or the lockfile changes. Record its date and owner in the existing Upkeep task. This working process adds no schedule, Dependabot configuration, automatic merge, deployment or account/service change. Automation eligibility, included Actions allowance, bounded future PR volume and ownership remain open TECH26 decisions.

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
3. When the review includes online checks, deliberately use current official registry/changelog/advisory sources and record retrieval dates, exact affected ranges, package/path applicability and unavailable sources. An optional `npm audit --package-lock-only --ignore-scripts --json` is a network operation, not part of this inventory command. Use a private cache and treat a successful indexed advisory result as time-bounded evidence; failed connectivity or an absent advisory record is unknown. Version age alone is not a vulnerability. Existing audit readers under the local `audit/fix-plan` evidence are historical helpers, not scheduled jobs or another inventory authority.
4. Propose at most one bounded update group at a time, with exact old/new versions and lock hashes, engine/peer requirements, changed declared/full-text licences, browser/server/build/tool paths, actual advisory applicability, validation and rollback. Keep React/react-dom together; treat the Vite major migration separately. A changed licence declaration is a review trigger, not an automatic compatibility conclusion. No further upgrade is enabled by this document.
5. For an in-scope candidate trial, follow the existing reviewed validation/release workflow: fresh private install with scripts disabled unless explicitly required/reviewed, public/SSR/prerender and admin builds, Node/Python fixtures, relevant disconnected UI/artwork/QR journeys, and the notices checker. Freeze the exact diff for independent review. Normal current-head checks and protected release rules still apply; no automatic merge or deployment. Roll back package manifest/lock together, rebuild matching applications and preserve rejected-trial evidence. Never include secrets or real customer information in evidence.

Provider account allowances, automation/run volume, event monitoring and legal/distribution decisions are separate from this offline tool. Keep website/admin locks, disabled payments, manual customer email and current privacy/retention controls throughout maintenance.
