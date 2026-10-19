# <Track Title> — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

<One paragraph describing what this track delivers and why.>

## Problem / Motivation

<What problem exists today, who feels it, and what happens if it is not solved.>

## Goals & Success Metrics

- **Goal:** <outcome>
- **Metric:** <how success is measured>

## Scope

### In Scope

- <what this track will do>

### Out of Scope

- <what this track explicitly will not do>

## Bug Details

> Include this section for **Bug** tracks only. Remove it for every other type.

- **Reproduction steps:**
  1. <step>
- **Expected behavior:** <what should happen>
- **Actual behavior:** <what happens instead>
- **Root-cause hypothesis:** <where the defect likely lives>
- **Regression test:** <test that must fail before the fix and pass after>

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | <observable behavior> | must |
| FR-2 | <observable behavior> | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | <performance, security, accessibility, reliability, ...> |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | <testable condition> | FR-1 |
| AC-2 | <testable condition> | FR-2 |

## Edge Cases

- <boundary, empty, error, permission, concurrency, offline, ...>

## Dependencies

- **Tracks:** <track IDs that must be merged before this track starts, or "none">
- **External:** <services, credentials, APIs, data, or "none">

## Open Questions & Assumptions

- **Question:** <open question>
- **Assumption:** <assumption made because the answer was unavailable>

## References

- <PRD, issue, design doc, URL, or "none">
