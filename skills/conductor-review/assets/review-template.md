# Review: <Track Title>

- **Track:** `<track-id>`
- **Type:** `<type>`
- **Branch:** `<branch>`
- **Range:** `<base-sha>..<head-sha>`
- **Date:** `<ISO-8601>`
- **Verdict:** `BLOCK|PASS WITH FINDINGS|PASS`

## Summary

<One paragraph on readiness and the most important findings.>

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `<command>` | pass/fail | |
| coverage | `<command>` | pass/fail | |
| lint | `<command>` | pass/fail | |
| typecheck | `<command>` | pass/fail | |
| build | `<command>` | pass/fail | |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `tests/...` | covered |
| AC-1 | P1.T1 | `tests/...` | covered |

## Findings

### Critical

- **F1 — <title>**
  - **File:** `<path>:<line>`
  - **What:** <defect>
  - **Why:** <impact>
  - **Fix:** <concrete change>
  - **Requirement:** <FR/AC or none>
  - **Test gap:** <test to add or none>

### High

- <none>

### Medium

- <none>

### Low

- <none>

## Plan compliance

<Every planned phase and task accounted for? Any task marked complete without
verification?>

## Out of scope

<Findings that belong to another track or a future change.>

## Debt

- <finding, reason for deferral, and issue link>

## Doc sync

`pending` / `updated` / `none` — <what changed after the review fixes>

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 1 | 0 | 2 | 3 | 3 |
