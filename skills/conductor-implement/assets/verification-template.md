# Phase <n> Verification

- **Track:** `<track-id>`
- **Phase:** `<phase name>`
- **Date:** `<ISO-8601>`
- **Branch:** `<branch>`
- **Base commit:** `<sha before the phase>`
- **Head commit:** `<sha after the phase>`
- **Result:** `verified|failed|blocked|partial`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `<command>` | 0 | `<summary>` |
| lint | `<command>` | 0 | |
| typecheck | `<command>` | 0 | |
| build | `<command>` | 0 | |
| e2e | `<command>` | 0 | |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | <criterion> | <test or artifact> | pass |

## Evidence

- `<path under .conductor/evidence/ or a test report>`

## Deviations

- <what changed, why it was required, and who approved it>

## Notes

<Anything the primary agent needs to know. If the result is `partial` or
`blocked`, state exactly what could not be verified and why.>
