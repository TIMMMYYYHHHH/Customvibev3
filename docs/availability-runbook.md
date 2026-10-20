## Hourly cleanup failures

The Security scheduled handler reports one `customvibe_unavailable` record for a failed hourly phase: `scheduled_orders`, `scheduled_artwork`, `scheduled_mail_delivery` or `scheduled_auth`. The existing sanitizer records only the fixed phase and reason category. Added application diagnostics exclude exception text, SQL, identifiers, request data and nested exception details. This does not make a privacy claim about uncaught platform payloads.

The handler rethrows the original exception, stops later phases and adds no retry. Earlier cleanup may already have succeeded. Mail delivery cleanup retains its existing position between artwork and auth cleanup. The five-minute path retains its early return and existing caught `scheduled_maps` reporting; a caught maps failure still allows the same scheduled continuation.

Investigate the reported category against the matching deployed revision and schema, then use the existing release and recovery process. Do not assume a successful bounded invocation cleared the expired backlog. Order snapshot cleanup remains limited to 50 rows and artwork request cleanup to 20 rows per invocation. No success or completion marker is produced. These records do not detect a missed invocation, send an alert, establish recovery or close operational monitoring acceptance.
