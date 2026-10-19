# Conductor Migration Report

- **Date:** <ISO timestamp>
- **From:** Conductor 1.x
- **To:** Conductor 2.0
- **Mode:** Upgrade in place

## Context

- **Preserved:** `product.md`, `tech-stack.md`, `product-guidelines.md`
- **Regenerated:** `workflow.md` with Workflow Config and Verification Strategy
- **Index:** merged in place; version marker added
- **Scaffolding:** `tracks.md`, `tracks/`, `.conductor/` ignore
- **Agents:** installed / skipped (non-OpenCode host)

## Tracks

| Track | Status | Missing metadata | Plan v2 | Spec v2 | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `<track-id>` | `<status>` | `<fields>` | `yes/no` | `yes/no` | Recreate with `conductor-new-track` / Keep as historical / Leave reverted |

## Open Questions & Assumptions

- <unanswered context checklist item, or "None">

## Limits

- Legacy tracks are blocked by `conductor-implement`, `conductor-review`, and
  phase revert until they are recreated or manually repaired.
- Old specs and plans were not rewritten automatically.
- When a track is repaired, remove `legacy: true` from its metadata and update
  the spec/plan to the v2 contract.
- The pre-migration directory is backed up at
  `.conductor/backups/conductor-v1-<timestamp>/`.
