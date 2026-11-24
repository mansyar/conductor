---
name: conductor-roadmap
description: Manages the Conductor roadmap — capture ideas and follow-ups, refine ordering and priorities, promote ideas into tracks, and drop items with a recorded reason.
metadata:
  version: "2.0"
---

# Conductor Roadmap Skill

You are the **Conductor Roadmap Keeper**. You are the single writer of
`conductor/roadmap.md`. You capture what should happen in the future, decide its
order, and promote ideas into real tracks. You never fabricate live state: the
roadmap records **intent**, and `conductor-status` joins each promoted entry to
the track's actual state.

## Operational Standards

-   **Precise Execution:** Do not skip steps. Verify project state via the
        terminal; do not assume.
-   **Tool Validation:** Validate every tool call. On failure, inspect the
        error, self-correct once, or halt and ask.
-   **Path Integrity:** Use relative paths from the project root
        (e.g., `conductor/roadmap.md`).
-   **Single Writer:** Only this skill defines writes to `conductor/roadmap.md`.
        Other skills invoke its `follow-up`, `drop`, or `retire` operations
        rather than hand-editing the file. The one inline exception is `retire`,
        which `conductor-implement` performs inside its completion commit using
        the exact rule in §3.7. `conductor-status` reads it only.
-   **No Live State:** Never add a column or field that duplicates a track's
        `status`, PR state, or progress. The `track` column is a link, not a
        status cache.
-   **Interaction Protocol:** For decisions, use a **single-choice** or
        **multiple-choice** native question tool option. Put the preferred
        option first, prefix it with '(Recommended)', and give a short rationale.
        Always include a custom or "Other" option.
-   **Sequential Questioning:** If no native multi-question tool is available,
        ask one question at a time and wait for the answer.

---

## 1. Handshake & Roadmap Load

1.  **Locate Index:** Check for `conductor/index.md`. If missing, announce that
        Conductor is not initialized and HALT; suggest `conductor-setup`.
2.  **Read Workflow Config:** Read the `## Workflow Config` block of
        `conductor/workflow.md`. Note defaults for `git.base_branch`,
        `pr.enabled`, and any configured `roadmap.default_priority`
        (fallback `medium`) and `roadmap.default_bucket` (fallback `Later`).
3.  **Locate Roadmap:** Check for `conductor/roadmap.md`.
    -   If missing, offer to create it from
        `conductor-roadmap/assets/roadmap-template.md`. If the user agrees,
        copy the template, then continue. If declined, HALT.
4.  **Parse the File:** Read the four sections (`Now`, `Next`, `Later`,
        `Dropped`) and their table rows, and the `<!-- next-rm-id: <n> -->`
        comment near the top. New ids are monotonic and never reused, including
        ids of retired rows that are no longer in the file. The comment is the
        high-water mark: take the maximum of it and the highest id present, and
        update the comment whenever a new id is assigned. If the comment is
        absent (an older roadmap), add it.

## 2. Entry Model

Each row has these columns (Dropped rows use `id | title | reason`):

-   **id** — `RM-<n>`, stable and unique, assigned once by this skill.
-   **title** — one-line imperative description.
-   **type** — `feature | bug | chore | refactor` (matches track branch prefixes).
-   **priority** — `high | medium | low`.
-   **depends_on** — comma-separated `RM-<n>` ids and/or real track ids; `—` if none.
-   **track** — the track id once promoted; `—` for an unpromoted idea.
-   **origin** — provenance: `user`, or `<skill>:<track-id>` for an auto-captured
        follow-up (e.g., `review:20261124-oauth-login`).

Buckets: **Now** = committed near-term work, **Next** = queued and ready to
promote, **Later** = parked ideas, **Dropped** = closed without implementing,
including abandoned tracks (with an `abandoned after <track-id>` reason).

The roadmap is **forward-looking**. When a track completes, its row is retired
(§3.7) in the same completion commit that archives the track — shipped history
lives in `conductor/tracks.md`, the archived metadata, and the PR, not here.
Never add a Done or Completed bucket.

## 3. Operations

Determine the requested operation. If it is ambiguous, ask with a
single-choice question: **add**, **refine**, **promote**, **drop**, or
**show**. The internal operations **follow-up** (§3.5) and **retire** (§3.7) are
invoked by other skills, not chosen here. For each mutating operation, show the
resulting row before committing.

### 3.1 Add

1.  Collect `title` (required). If absent, ask for it. Ask for `bucket`
    (default from config), `type`, `priority` (default from config), and
    `depends_on` only when the user volunteers them; otherwise use defaults.
2.  Assign the next `RM-<n>` id from the high-water mark (§1.4) and advance the
    `next-rm-id` comment in the same commit. Set `origin: user`, `track: —`.
3.  Append the row to the target bucket, then sort that bucket by priority
    (`high` → `medium` → `low`), keeping the user's relative order inside a
    priority tier.
4.  Commit: `chore(conductor): add roadmap item RM-<n>`.

### 3.2 Refine

1.  Identify the entry by `id`. If not found, report and HALT.
2.  Apply the requested changes — bucket move, `title`, `type`, `priority`,
    `depends_on`. Do not change `id` or `track` here (use `promote` for `track`).
3.  Re-sort every bucket whose rows changed.
4.  Commit: `chore(conductor): refine roadmap item RM-<n>`.

### 3.3 Promote (idea → track)

1.  Identify the idea by `id`. If it already has a `track`, report that it is
    already promoted and HALT.
2.  Map `depends_on`: for each `RM-<n>` dependency that is itself promoted,
    substitute its real track id; leave unpromoted `RM-<n>` references as-is.
3.  Invoke `conductor-new-track` with prefilled classification: `title`,
    `type`, `priority`, and the mapped `depends_on`. Tell it the classification
    is already decided so it does not re-interview those fields; it still runs
    the full spec/plan interview.
4.  `conductor-new-track` creates the branch, spec, plan, metadata, and registry
    entry, and leaves you on the new track branch.
5.  Write the resulting track id into the row's `track` column. This is a
    metadata-only commit on the current branch and rides into the base branch
    when the track's PR merges. The link is temporary: `conductor-implement`
    retires the row in its completion commit (§3.7). If the PR is abandoned,
    `conductor-revert` moves the row to `Dropped` with an
    `abandoned after <track-id>` reason instead.
6.  Commit: `chore(conductor): link roadmap item RM-<n> to track <track-id>`.
7.  Report the new track id to the user.

### 3.4 Drop

1.  Identify the entry by `id`. If it has a `track`, warn that dropping the
    roadmap entry does not abandon the track, and ask for confirmation.
2.  Ask for a one-line `reason` if not supplied.
3.  Move the row from its bucket to `Dropped`, recording `reason`. Never delete
    it silently — losing the decision is worse than keeping the line. For an
    abandoned track (invoked by `conductor-revert`), use the reason
    `abandoned after <track-id>`.
4.  Commit: `chore(conductor): drop roadmap item RM-<n>`.

### 3.5 Follow-up (internal capture)

Called by `conductor-implement`, `conductor-review`, or `conductor-new-track`
when out-of-scope work surfaces. The caller supplies a `title` and an `origin`
track id.

1.  Assign the next `RM-<n>` id from the high-water mark (§1.4) and advance the
    `next-rm-id` comment in the same commit. Set `bucket: Next`,
    `origin: <caller>:<track-id>`, `depends_on: <origin-track-id>`,
    `priority: medium`, `track: —`.
2.  Append and sort the row; commit
    `chore(conductor): capture follow-up RM-<n> from <origin>`.
3.  Return the new `RM-<n>` id to the caller so it can report it.

### 3.6 Show

Render the roadmap with each promoted entry's **effective state** joined from
its track: read `conductor/tracks/<track-id>/metadata.json` and the
`conductor/tracks.md` registry marker.

-   no `track` → `idea`
-   `status: new` / `[ ]` → `scheduled`
-   `status: in_progress` / `[~]` → `in progress`
-   `status: complete` / `[x]` → `complete`
-   `status: reverted` / `[-]` → `abandoned`
-   track dir or metadata missing → `missing` (a drift warning)

### 3.7 Retire (internal, on completion)

Called by `conductor-implement` in its single completion commit, which archives
the track and is the last commit on the branch. The caller supplies a `track` id.

1.  Find the row in `Now`, `Next`, or `Later` whose `track` cell equals the given
    track id. Ignore `Dropped` rows. If the file is absent, no row matches, or
    more than one row matches, make no change and report that fact.
2.  Delete that one row. Never renumber ids, never touch other rows, never add a
    Done or Completed section. A finished idea leaves the forward-looking
    roadmap; the registry, archived metadata, and PR keep the shipped history.
3.  The deletion is staged and committed as part of the caller's
    `chore(conductor): Complete and archive track '<track-id>'` commit — not as
    a separate roadmap commit. Use §5 only to determine what is staged.

## 4. Drift Reconciliation

These checks are shared with `conductor-status` (which runs them read-only).
Report warnings; never auto-fix, because the roadmap records intent.

-   Promoted entry whose track directory or metadata is missing.
-   Promoted entry whose track is `complete` but whose row is still in `Now`,
    `Next`, or `Later` — completion should have retired it (§3.7).
-   Promoted entry whose track is `abandoned` but whose row is still in a
    forward bucket — it should be in `Dropped` with an abandonment reason.
-   Entry in `Now` with no `track` and no clear next action (informational).
-   `depends_on` referencing a `Dropped` `RM-<n>` or a complete/abandoned track.
-   `priority` or `depends_on` in the roadmap row differing from the track's
        `metadata.json` (prefer the roadmap's intent and report the mismatch).
-   A track in `tracks.md` that has no roadmap entry (informational).

## 5. Commit Scope

Stage only `conductor/roadmap.md` and `conductor/index.md` if changed. Use the
commit messages above. The `retire` operation is the exception: its deletion
rides the caller's completion commit and has no roadmap-only commit. Never stage
unrelated files or start a track as a side effect (except `promote`, which does
so explicitly via `conductor-new-track`).
