# Revert: <Track Title>

## Summary

<One paragraph explaining what is being reverted and the effect on the product.>

## Original Work

-   **Track:** `<track-id>` — <title>
-   **Original PR:** <url>
-   **Original branch:** `<branch>`
-   **Merge/squash commit:** `<sha>`

## Why

<The reason for the revert: regression, incorrect requirement, abandoned design,
security issue, or other.>

## Revert

-   **Strategy:** `git revert -m 1 <merge-sha>` / `git revert <squash-sha>`
-   **Revert commit:** `<sha>`
-   **Scope:** <files, modules, migrations, flags>

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Tests | `<command>` | <pass/fail> |
| Lint | `<command>` | <pass/fail> |
| Typecheck | `<command>` | <pass/fail> |
| Build | `<command>` | <pass/fail> |
| Manual/smoke | `<steps>` | <pass/fail/not run> |

## Risks

-   <Data, migration, flag, or dependency risk.>
-   <Known conflicts or follow-up required.>

## Follow-up

-   [ ] <Issue or track link, if the work will be redone.>
-   [ ] Archive the reverted track after this PR merges.
