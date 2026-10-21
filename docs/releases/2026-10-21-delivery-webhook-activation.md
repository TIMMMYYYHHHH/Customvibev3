# Delivery webhook activation, 21 October 2026

The owner approved one Resend hook, owner-only signing-secret installation, the exact five-key Production configuration, one unchanged-artifact native Pages publish and one unsigned guard check. Activation completed. A later separately approved single manual update verified signed callback correlation and owner Inbox arrival for that attempt. TECH03's scoped correlation criterion is verified; the parent and EXT01 retain their remaining acceptance criteria. This is a sanitized manual operation record, not a coordinator receipt or a claim that every email journey was verified.

## Exact source and artifact

- Application source: `648868b66fa3ab80a334c3f555e7dc5b237489d5`, tree `7323e2ff8920b3a4a00ed4287a116766e18a880d`.
- Native archive: `customvibe-648868b-native-upload.zip`, 521 files, SHA256 `c066063e46ba0f603846ed4639ca97c79a9790262b866a824e72361e5ad821b1`.
- Complete file manifest SHA256: `c7e56fa2ccbfac039f6063ebf70cfeda26b5fbca229c25ec297c98f193b3df01`.
- Bundled `_worker.js` SHA256: `5df307fa04c9594044ba3311fea44eb03100ccc16dda9c26b359c68513cabe90`.

The original archive was staged once, with 521/521 successful uploads. No application, helper, tooling, artifact or historical recovery record changed for activation. This later documentation revision does not change the source provenance of that deployment.

## Provider and Production configuration

Root observed one enabled hook in Resend team `customvibe03`, ID `22649335-0867-422c-9e4a-3eb1c396b0af`, targeting `https://customvibe.co.za/api/mail-events/resend`. Only these seven events were selected: `email.sent`, `email.delivery_delayed`, `email.delivered`, `email.bounced`, `email.failed`, `email.suppressed`, `email.complained`. The owner created the hook and transferred its signing key directly to the encrypted Production destination. Agents did not read or retain its value. No paid feature, permission expansion or real email send was included.

The previous 16 Production variable names/types and plaintext values were retained, with exactly these five additions. Existing secret values were neither read nor compared. Preview retained its previous nine variables and values, without these additions.

| Added Production key | Type and accepted value |
| --- | --- |
| `RESEND_WEBHOOK_SECRET` | Secret, encrypted; name/type presence only |
| `MAIL_EVENTS_ENABLED` | Text `true` |
| `MAIL_EVENTS_ENVIRONMENT` | Text `production` |
| `CF_PAGES` | Text `1` |
| `CF_PAGES_BRANCH` | Text `main` |

The explicit CF variables use the existing runtime binding model. Automatic runtime markers on native uploads were not assumed. The one unsigned runtime result below establishes prerequisite shape only, not that the signing key matches the provider.

## One publish and actual canonical identity

Fresh metadata and schema comparisons preceded the one browser action. All ten Security and ten Content schema checks passed against 12 Security migrations plus one Content migration, including the already-applied additive `0012_mail_delivery.sql`. No migration was executed during activation. Original request clocks were preserved.

| Guard or action | Actual UTC time or deadline |
| --- | --- |
| Earliest schema request | 09:17:53.652 |
| Schema action deadline | 09:22:23.652 |
| Fresh source/status observation | 09:20:03.668, deadline 09:22:03.668 |
| Final Pages observation | 09:20:34.901, deadline 09:21:04.901 |
| One Save and deploy action | 09:20:54.357, inside all three deadlines |
| First Success acknowledgement | 09:21:03.115 |
| Successful canonical API observation | 09:21:46.275 |

Actual new canonical Production deployment: `7fb97a6b-61f7-4f0c-9656-5ec207155366`, replacing `5dfdc65b-87f3-400a-8226-cd92ae7ff84a`. Provider `commit_hash` was the empty string `""`, preserved honestly. Provenance is the exact source/artifact, trusted upload action and matching acknowledged successful canonical identity, not a fabricated provider commit annotation.

All 12 postpublish GETs passed. Project and canonical each exposed the exact 21-variable enabled target; Preview remained unchanged at nine. Full observed nonsecret settings, private routes/subdomains, service bindings and 14-day artwork lifecycle were unchanged. The website gate, separate Admin authentication, payments OFF, manual customer updates, quotas and retention safeguards were preserved.

| Retained component | Actual version |
| --- | --- |
| Security | `7dbffdd4-2967-4a39-8c54-1b0503e1b77c` |
| Admin | `e35bb8dd-f04a-4aab-8a11-9439c29ab9e3` |
| Catalogue | `92f3472a-3153-447d-a8be-c79db9498407` |

Catalogue retains actual code provenance `3a16bff91fdab22715450e201f9c874885931d36`. None of these private components was redeployed for activation. Owned helper leases were released. Independent review cleared the pre-mutation facts, saved five-key configuration, timed publication package and postpublish readbacks. No inactive-only validator was used to attest the enabled target.

## Activation-only runtime result

The one approved unsigned request started at 09:23:24.322 UTC and returned at 09:23:24.767 UTC: `POST https://customvibe.co.za/api/mail-events/resend`, Content-Type `application/json`, body `{}`, no cookies, credentials or Svix headers, no redirect following or retries. Response: HTTP 400, `application/json`, `{"error":"Invalid request"}`. The receiver checks runtime prerequisites before rejecting missing signature headers, before processing the body or calling AUTH. The approved OFF/same-artifact fallback was not needed or exercised.

At this activation-only checkpoint, the unsigned result verified prerequisite shape and missing-signature rejection only. Correct signing-key correspondence, valid signature verification, provider callback passage, AUTH reachability, exact receipt correlation and owner mailbox acceptance were still unverified. No real email or valid provider event was generated by that activation batch. The later single journey below supersedes those unknowns only for its one selected manual-update attempt; the earlier evidence and its limits remain unchanged.

## Later single owner-approved mail journey

The owner separately approved one real manual status email to the owner's supplied address for an owner-selected existing order. Root verified the unchanged preview and clicked Send update once at `2026-10-21T09:46:49.627Z`, or 11:46:49.627 SAST. The saved stage remained New order and payment status remained Unpaid. No stage or artwork change, resend or retry occurred.

At `09:47:25.154Z`, the selected attempt showed provider acceptance with delivery initially unconfirmed, and the duplicate-send control was blocked. After a read-only refresh, the same manual-update history row showed `Recipient server accepted`, `Webhook checked` and `Event time`, with both displayed event/check times at 11:46 SAST. This was recorded at `09:48:08.463Z`. The owner separately confirmed the message arrived in the Inbox.

The private Admin projection binds that delivery history to the accepted manual-update attempt. Its webhook source and delivered outcome establish signed callback passage and exact receipt correlation through the existing receiver/backend for this attempt. Human Inbox confirmation is separate evidence; recipient-server acceptance alone would not establish Inbox placement. No recipient address, order identifier, message body, secret or raw provider payload is retained in this record.

This meets TECH03's scoped accepted-mail-to-delivery-outcome criterion. The parent and EXT01 remain open: Reply-To and actual reply routing, other templates and purposes, and the rest of the mailbox journey are not verified by this single message. Not all failure, complaint, replay or expiry branches were exercised live. No further send or implementation change follows from this evidence update.

For an authorized fallback, change only Production `MAIL_EVENTS_ENABLED=false`, publish the same artifact once and verify the actual canonical false flag and separately approved unsigned 503 check. Retain the encrypted secret and other markers. Disable the selected hook through the owner-controlled status action after effective closure if available. Do not delete or rotate the secret, weaken protection, replay sends or assume an older canonical alone restores project configuration. See the [webhook runbook](../email-delivery-webhook-runbook.md).

## Retained evidence

Detailed local evidence is retained under `audit/fix-plan/tech03-approved-activation-sol61/` in the CustomVibe project workspace. These are evidence paths and hashes, not claims that local files are published repository blobs. The original preapproval batch is retained separately under `audit/fix-plan/customer-review-release-sol61/`. Historical release/recovery records remain unchanged.

| Evidence | SHA256 |
| --- | --- |
| Approved batch: `TECH-03-FINITE-ACTIVATION-BATCH.md` | `4db751987a5890004dd9d54525bf18e297b34c36516ba6bea33a58ab2bff1782` |
| `premutation-1/PREMUTATION-RESULT.json` | `1252fdd6eba6d18b6ef6905f49d94c9fb0b2e5dd851c36bd7ce984d125952b2e` |
| `postconfig-1/POSTCONFIG-RESULT.json` | `477a8543162233304ae44a060759cc07008eb4913c82517cda5b5fde78f2e776` |
| `prepublish-1/REVIEW-PACKAGE.json` | `32ddbd335b3602944949bbc60a5cf307fdba9e3b2fac15d67909b24656bf6e1f` |
| `postpublish-1/POSTPUBLISH-RESULT.json` | `c707e2e280e9ad918d44c9065d23e419c3feb6fd372a8064669036f0f51cbc92` |
| `postpublish-1/CANONICAL-ASSOCIATION.json` | `1a331eed16eab69e626ccd6fc0fd969f65d2bcf5f874cf91a0057d2199a60276` |
| `ON-STATE-UNSIGNED-GUARD.json` | `fd57e145fba2db1b3c5a370cd790859b563e9e97f3f1ee651ed77139bb87bba1` |
| `REPORT.md` | `920259b7f9ad1d15ca8b6e79e92f3af8d9fd258eb5a3956f6553d5b848f344df` |
| Later `OWNER-MAIL-SEND-ATTEMPT.json` | `26a62c59fc3ca42f786cb6d23efd74f8f2118b5e368326abf657757c84e50918` |
| Later `OWNER-MAIL-ACCEPTANCE.json` | `c685bb4f72c87c0214dbba5cec1fa1b3291a7026bc753a88b34adc1813f1ae95` |
| Later `OWNER-MAIL-DELIVERY-JOURNEY.json` | `9c659905a127b8ab6432f559d3ba42eb088954d2ef1cca482d24a2c80955c6e8` |
