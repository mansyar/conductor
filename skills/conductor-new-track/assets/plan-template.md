# <Track Title> — Implementation Plan

> **Branch:** `<prefix>/<track-id>`
> **Base:** `<base-branch>` @ `<base-sha>`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: <Phase Name>

- **Goal:** <one verifiable outcome>
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `src/...`, `tests/...`
- **Verification:** `<exact command>`
- **Status:** pending

- [ ] **P1.T1: <Task Name>** — covers: FR-1
  - [ ] **P1.T1.1: <Sub-task Name>**
  - [ ] **P1.T1.2: <Sub-task Name>**
- [ ] **P1.T2: <Task Name>** — covers: FR-2

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/<track-id>/verification/phase-1.md
-->

## Phase 2: <Phase Name>

- **Goal:** <one verifiable outcome>
- **Depends on:** Phase 1
- **Covers:** FR-3, AC-3
- **Touches:** `src/...`, `tests/...`
- **Verification:** `<exact command>`
- **Status:** pending

- [ ] **P2.T1: <Task Name>** — covers: FR-3
  - [ ] **P2.T1.1: <Sub-task Name>**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
