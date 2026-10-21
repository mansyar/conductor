## Summary

<What this track delivers, in two or three sentences.>

## Track

- **ID:** `<track-id>`
- **Type:** `<type>`
- **Spec:** [`conductor/archive/<track-id>/spec.md`](conductor/archive/<track-id>/spec.md)
- **Plan:** [`conductor/archive/<track-id>/plan.md`](conductor/archive/<track-id>/plan.md)
- **Review:** [`conductor/archive/<track-id>/review.md`](conductor/archive/<track-id>/review.md)

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
| unit | `<command>` | pass | `conductor/archive/<track-id>/verification/integrated.md` |
| lint | `<command>` | pass | |
| build | `<command>` | pass | |

## Media

<Optional. One line per visual: what it shows and the commit SHA it was
captured at. Reference the captured file with a path relative to the repository
root, for example
`![Login error state](.conductor/media/<track-id>/login-error.png)`. The PR
command uploads the file and rewrites the reference to a hosted URL. Leave this
section out entirely when the track has no media.>

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
