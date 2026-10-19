## Summary

<What this track delivers, in two or three sentences.>

## Track

- **ID:** `<track-id>`
- **Type:** `<type>`
- **Spec:** [`conductor/tracks/<track-id>/spec.md`](conductor/tracks/<track-id>/spec.md)
- **Plan:** [`conductor/tracks/<track-id>/plan.md`](conductor/tracks/<track-id>/plan.md)
- **Review:** [`conductor/tracks/<track-id>/review.md`](conductor/tracks/<track-id>/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: <name> | <goal> | verified | `<sha>` | <deviations or notable decisions> |
| 2: <name> | <goal> | verified | `<sha>` | |

## Requirements

- [x] `FR-1` — <requirement> (test: `<path>`)
- [x] `NFR-1` — <requirement>
- [x] `AC-1` — <criterion>

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `<command>` | pass | `conductor/tracks/<track-id>/verification/integrated.md` |
| lint | `<command>` | pass | |
| build | `<command>` | pass | |

## Review

- **Verdict:** `PASS` / `PASS WITH FINDINGS`
- **Rounds:** <n>
- **Fixed:** <count> findings
- **Accepted/deferred:** <count> (see `review.md`)

## Deviations and risks

- <deviation, why it was required, and any risk>

## Follow-ups

- <#issue or "none">

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

<Any migration, feature-flag, or data rollback notes.>
