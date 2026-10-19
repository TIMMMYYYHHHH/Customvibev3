# Local fallback catalogue validation

With the configured Node22 runtime and matching private dependencies, run:

```sh
node scripts/check-fallback-content.mjs
node --test tests/fallback-content.test.mjs tests/content.test.mjs tests/content-store.test.mjs tests/database.test.mjs tests/collection-products.test.mjs
```

The checker reads the committed `data/site-content.json` relative to its own module. It accepts no file selector, provider configuration or write mode. It uses the unchanged browser model validator, stricter server storage validator and existing collection upgrade rules. It never upgrades its input, applies defaults, calls a service or writes a database/file. The test runner imports the same pure `inspectFallbackContent(input)` interface for synthetic drift cases.

The JSON report separates these results:

| Field | Meaning |
| --- | --- |
| `valid` | True only when there are no validation errors or required structural differences. |
| `errors` | The raw fallback fails the existing model or storage validator. Validation runs before deriving upgrade expectations, so normalization cannot hide invalid print metadata. |
| `structuralDrift` | Built-in IDs missing from the raw fallback, or count/pricingMode/printVersion/artworkEdition differences against the existing upgrade contract. Includes IDs, field names and expected/actual metadata. Reports never repair or append products. |
| `defaultDifferences` | Informational JSON-pointer paths that differ from model defaults, including copy, visibility, revision, pricing, images, custom products and order. These are not errors or instructions to make the sources equal. |

Exit0 means validation passed without required structural drift. Informational differences may remain. Exit1 means invalid/unreadable input, unsupported command arguments or structural drift. Errors do not authorize rewriting business copy, availability or either catalogue source. There is no per-field exception list or second catalogue definition; expectations come from existing runtime contracts.

The current committed fallback and model defaults both contain13 products and are structurally compatible. Their revisions and some editable product fields differ. This is expected local source history, not proof that the live catalogue is wrong. Regenerate the report when reviewing model/fallback changes; do not commit a generated report as another authority.

## Stored catalogue authority

The checker is a local maintenance/fixture command, not a runtime startup requirement or production recovery tool. It is not inserted into catalogue loading, saves, builds or provider configuration. Existing `readContent` behavior continues to prefer stored D1 content when a row exists, using fallback only when the row is absent. Existing collection migration rules remain unchanged.

The focused fixtures run actual `readContent` and actual SQL against disposable in-memory SQLite. They verify that reads do not initialize a missing row, stored owner edits win even over an invalid supplied fallback, and corrupt stored data still fails rather than being replaced. Raw rows, SQLite change counters and attempted writes are checked before/after. Fixture records are synthetic; no live D1 catalogue is read or changed.

This is partial TECH23/ENG-005 acceptance only. It does not reconcile production data, approve catalogue restoration, replace existing content/collection tests or establish deployed D1 behavior. Email quotas/contact/origin constants, strict security host checks, provider settings and live acceptance remain separate. No email, automation, account or service-cost change is included.
