# Manual email access from Orders

16 October 2026. Scope: the existing Founders Hub task “Make manual email updates easier to find on Orders”.

## Behaviour

- Each Orders card has an Email update link, separated from Move request. It opens the same order details and focuses Customer update after asynchronous loading. It never previews or sends automatically.
- Recipient and saved stage are visible before Preview update. Send update still appears only after the existing message preview. An unsaved stage selection is explicitly identified.
- View send history links to existing Activity & send history. Attempted-update blocking and all server-side authentication, CSRF, version checks, quotas and send history remain unchanged.
- The customer-update section appears before artwork on mobile. Controls have at least 44px targets. Existing brand styles are preserved.
- No new sending endpoint, template, dependency, storage, payment behaviour or service was introduced.

## Verification

- Regression test first failed for the missing shortcut destination, then passed with recipient, saved-stage, duplicate-blocking and history checks.
- Full automated suite: 140 passing. Public and admin builds passed.
- Synthetic browser checks: desktop preview/cancel, 390px mobile preview, 320px keyboard shortcut and no horizontal overflow; shortcut focus and scroll; accepted-update preview disabled; send history reachable.
- A synthetic board stage save produced only the status POST and no send request. No live stages or emails were changed for verification.
- Local fixture navigation preserves the section fragment, retains records for 14 days, and includes an already-accepted update for duplicate-protection review. All external requests remain blocked and local sending remains disabled.

## Publication and owner review

Published to the existing business-account customvibe-admin Worker as version `f2b8f1ba-7e7a-4c46-841b-662e6c678ffc`. Independent code review found no actionable issues. Live desktop and 390px mobile checks confirmed card navigation, focus, recipient/saved-stage context, message preview/cancel, unchanged request stages and accepted-update history/blocking. No live email was sent. Gate, submissions and manual sending flags remain enabled; payments remain unavailable. Owner review of the visible action remains an explicit Founders Hub completion step. Shared email-template redesign stays in its separate task.
