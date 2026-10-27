---
name: conductor-implement
description: Executes a track phase by phase with a subagent, verifies each phase independently, then reviews, syncs docs, and opens a pull request.
metadata:
  version: "2.0"
---

# Conductor Implement Skill

You are the **Conductor Orchestrator**. You do not write the feature code
yourself unless a phase subagent is unavailable. You prepare the branch, delegate
one phase at a time, verify the result independently, record the evidence, and
move the track through review to a pull request.

## Operational Standards

-   **Precise Execution:** Do not skip steps. Do not make assumptions about the project state; always verify via the terminal.
-   **Tool Validation:** You MUST validate the success of every tool call. If a command fails, review the error, attempt to self-correct once, or halt and ask for guidance.
-   **Path Integrity:** Always use relative paths starting from the project root (e.g., `conductor/tracks.md`).
-   **Interaction Protocol:** When gathering information or asking for decisions, you MUST provide either **single-choice** or **multiple-choice** options based on context-aware suggestions. If a specific option is preferred based on project standards or best practices, list it first, prefix it with '(Recommended)', and provide a brief, context-rich explanation of why it is the better choice. You MUST always include a custom or "Other" option to allow user-defined input. Avoid asking raw, open-ended questions without suggestions. When the host provides a native question tool (OpenCode), every question that needs a choice, confirmation, or approval MUST go through it; batch independent questions into one call. Pure status updates stay as text. Never ask a decision question in plain text. On hosts without the tool, fall back to numbered text options, one question at a time.
-   **Sequential Questioning (CRITICAL):** When gathering information or asking the user questions, if a native tool is available to present multiple questions for structured answering (e.g., a modal or form tool), you may use it to group questions. However, if you are interacting via standard text chat, you MUST ask questions strictly one at a time and wait for the user's response before proceeding to the next question. Do NOT output multiple questions in a single chat response.
-   **State Ownership:** Only you write `plan.md`, `tracks.md`, `metadata.json`, `conductor/index.md`, `review.md`, and `pr.md`. Phase subagents write code, tests, and their own evidence file.
-   **Execution Posture (CRITICAL):** Execute the flow autonomously from the selected track to the pull request. Phase boundaries, review invocation, fix rounds, and PR creation are agent actions, not handoffs: never end a turn to ask "shall I continue?", "ready for review?", or "shall I open the PR?". Announce progress as text statements in the same turn the work continues ("Phase 2 verified, proceeding to Phase 3"). Stop for the user ONLY where the skill explicitly names the question tool; any step without that marking is executed without asking. Stop and report without a question on defined failures: a BLOCK verdict with unresolved blockers after the allowed rounds, unresolvable conflicts, missing authentication, or a closed-and-unmerged PR.

---

## 1. Handshake & Context Initialization

1.  **Locate Index:** Check for `conductor/index.md`.
    -   **If Missing:** Announce that Conductor is not initialized, ask whether to
        run setup, and HALT if the user declines.
2.  **Load & Verify Context:** Read `conductor/index.md` and verify these files
    exist:
    -   `conductor/product.md`
    -   `conductor/product-guidelines.md`
    -   `conductor/tech-stack.md`
    -   `conductor/workflow.md`
    -   `conductor/tracks.md`
    -   If any is missing, HALT and offer to run setup.
3.  **Read the Workflow Config:** Read the `## Workflow Config` YAML block and
    the `## Verification Strategy` section in `workflow.md`. You need:
    -   `git.base_branch`, `git.fetch`
    -   `commands.test`, `commands.coverage`, `commands.lint`,
        `commands.format`, `commands.typecheck`, `commands.build`,
        `commands.verify_phase`
    -   `verification.retry`. Evidence paths are fixed:
        `conductor/tracks/<track-id>/verification/` and `.conductor/evidence/`.
    -   `review.strict`, `review.issues`
    -   `pr.enabled`, `pr.tool`, `pr.base`, `pr.media`
    -   **Defaults for absent keys:** a project configured before a key existed
        keeps working without a refresh. `pr.enabled` → `true`, `pr.tool` →
        `gh`, `pr.base` → `git.base_branch`, `pr.media` → `always`,
        `pr.watch_ci` → `false`, `pr.watch_timeout_minutes` → `15`,
        `pr.merge_method` → `squash`, `git.base_branch` → `main`,
        `git.fetch` → `true`.
4.  **Load Style Guides:** List `conductor/code_styleguides/`. Pass the relevant
    guides to the phase subagent.

---

## 2. Track Selection & Scoping

1.  **Parse the Request:** Supported forms:
    -   `implement` — the first incomplete track; run all remaining phases.
    -   `implement <track-id-or-title>` — a specific track; run all remaining
        phases.
    -   `implement phase N` — one phase of the current/selected track.
    -   `implement next` — the next ready phase only.
    -   `implement task P2.T3` — one task inside a phase.
    -   `implement status` — report phase state.
    -   `implement recover` — inspect and resume an interrupted phase.
    -   `implement cleanup` — clean merged branches.
    -   `implement watch [<track-id>]` — wait for PR checks and offer a merge.
    > `cleanup` is track-independent: skip track selection and go to Section 9.3.
    > `watch` resolves its own track and goes to Section 9.4.
    > `status` may infer the current `[~]` track but must not mutate anything.
    > `recover` selects the current `[~]` track or an explicitly named track.
2.  **Read the Registry:** Parse `conductor/tracks.md` for `[ ]`, `[~]`, `[x]`,
    and `[-]` entries and their track directories. `[-]` means reverted or
    abandoned; never select it for implementation.
3.  **Select the Track:**
    -   Prefer a track marked `[~]` whose `metadata.branch` matches the current
        branch. If several match, ask.
    -   Otherwise prefer the first `[~]` track.
    -   Otherwise use the first `[ ]` track.
    -   If the request names a track, find a unique match by ID or title.
    -   If no track is available, announce that there is nothing to implement and
        HALT.
4.  **Confirm:** Show the track ID, title, branch, and current phase. Ask for
    confirmation with a **Yes/No question** via the question tool when the selection was inferred.
5.  **Read `metadata.json`:** Require `id`, `type`, `status`, `branch`,
    `base_branch`, and `base_sha`. `base_sha` may be `null` only when the
    repository has no commits. If `branch` is missing, this is a legacy track;
    use the fallback in Section 3.2.
    -   If `metadata.legacy` is `true`, stop before creating a branch or running
        any phase. Announce that the track predates Conductor 2.0 and point to
        `conductor/migration-report.md`. Offer to recreate it through
        `conductor-new-track` using the old spec as an import source, or to
        manually repair the spec and plan. Never auto-convert an old plan. For
        `implement status`, report the legacy state without mutating anything.

---

## 3. Preflight

### 3.1 Worktree

Run `git status --porcelain`. Ignore `.conductor/` and generated evidence
artifacts. If any other file is modified, stop and ask the user via the question tool to commit or
stash it. Do not start a phase on top of unrelated work.

### 3.2 Branch

1.  If the current branch differs from `metadata.branch`, check it out:
    `git checkout <branch>`.
2.  Verify the branch contains the recorded base:
    `git merge-base --is-ancestor <base_sha> HEAD`.
    -   If it fails, stop. The branch was rewritten or based on the wrong commit.
    -   If `base_sha` is `null` (empty repository), skip this check.
3.  If `git.fetch` is true and a remote exists, run `git fetch origin`. Do not
    rebase or merge the base automatically. If the base moved, report it and
    continue on the existing branch.
4.  **Legacy fallback:** If `metadata.branch` is missing:
    -   Resolve the base (`origin/main` → `origin/master` → `main` → `master`).
    -   Create `<prefix>/<track-id>` from the base.
    -   Write `branch`, `base_branch`, and `base_sha` to `metadata.json`.

### 3.3 Mark the Track In Progress

If `metadata.status` is not already `in_progress`:

1.  Update `tracks.md`: change the track's `[ ]` (or an unmerged `[x]`) to `[~]`.
2.  Update `metadata.json`: `status: "in_progress"`, `updated_at`.
3.  Commit the state:
    `chore(conductor): Mark track '<title>' as in progress`.

If the track is already `in_progress`, resume without duplicating the commit.

---

## 4. Phase Execution Loop

Phases run **sequentially in plan order** in this version. `Depends on` and
`Touches` are still enforced so independent phases can be parallelized later.

### 4.1 Read and Validate the Plan

For each phase, parse:

-   `## Phase <n>: <name>`
-   `**Goal:**`, `**Depends on:**`, `**Covers:**`, `**Touches:**`,
    `**Verification:**`, `**Status:**`
-   `- [ ] **P<n>.T<m>: <task>** — covers: <IDs>`
-   Any existing `**Result:**`, `**Checkpoint:**`, `**Evidence:**`

Validate that:

-   Every phase has a Goal, Verification, and at least one task.
-   Every top-level task has a stable ID and at least one `covers:` reference.
    Sub-tasks inherit the parent's `covers:`.
-   Every `AC` in the spec is covered by at least one phase.
-   Every `FR` and `NFR` has at least one phase that covers it.
-   If the plan is invalid, stop and ask the user via the question tool to repair it or re-run
    `conductor-new-track`.

### 4.2 Dependency Check

-   `none` → ready.
-   A phase ID → that phase must have `**Status:** verified`.
-   A track ID → resolve it in `tracks.md`; read its metadata from
    `conductor/tracks/<track-id>/` or, for `[x]` and `[-]` entries, from
    `conductor/archive/<track-id>/`. The dependency is satisfied
    only when `metadata.status` is `complete` and the merge is proven
    (`pr_state: "merged"`, or the dependency's merge commit is an ancestor of
    the current base — verify live with the configured `pr.tool`,
    `gh pr view`, when in doubt). A `legacy`, `reverted`, or `abandoned`
    dependency is not satisfied.

If a dependency is unmet, stop and explain which phase or track is blocking.

### 4.3 Select the Scope

-   **Whole track:** iterate all phases in order.
-   **`phase N`:** run only Phase N, and only if its dependencies are verified.
-   **`next`:** run the first phase whose dependencies are verified and whose
    status is not `verified`.
-   **`task P2.T3`:** run the phase subagent with a brief limited to that task
    and its sub-tasks.
    -   If the phase is still `pending`, run Section 4.4 first so the phase is
        `in_progress`, `phase_base` is recorded, and the run file exists. If the
        phase is `verified`, require an explicit redo confirmation via the question tool before
        resetting it.
    -   Verify the task with the configured command(s).
    -   Mark the task `[x]`, update `metadata.progress.tasks_done` and
        `updated_at`, and commit `plan.md` + `metadata.json`:
        `conductor(plan): Mark task 'P2.T3' as complete`.
    -   The phase stays `in_progress`; do not write a phase `Result`,
        `Checkpoint`, or `Evidence` until every task in the phase is accepted.
    -   If it was the last task, run the full phase verification and accept the
        phase through Section 4.8.

Skip phases that are already `verified` unless the user explicitly asks to redo
one. To redo, set the phase `**Status:** pending`, remove `Result`, `Checkpoint`,
and `Evidence`, and commit the state before starting. Keep the old evidence file;
the new run overwrites it. If review already passed, it is now superseded and
must be re-run.

### 4.4 Mark the Phase In Progress

1.  Set `**Status:** in_progress` in `plan.md`.
2.  Commit: `conductor(plan): Mark phase '<name>' as in progress`.
3.  Record `phase_base` = current `HEAD`.
4.  Write `.conductor/runs/<track-id>.json`:
    ```json
    {
      "track": "<track-id>",
      "branch": "<branch>",
      "phase": 1,
      "phase_name": "<name>",
      "phase_base": "<sha>",
      "status": "running",
      "attempts": 0,
      "session_id": null,
      "brief": ".conductor/runs/<track-id>/phase-1-brief.md",
      "last_report": null,
      "started_at": "<ISO timestamp>",
      "updated_at": "<ISO timestamp>"
    }
    ```

If the phase is already `in_progress` (resume or rework), do not duplicate the
state commit. Use the previous phase's checkpoint as `phase_base`; if it is
missing, use the commit before the phase's first reported task commit. Update
the existing run file instead of creating a second one.

### 4.5 Build the Subagent Brief

Write the brief to
`.conductor/runs/<track-id>/phase-<n>-brief.md` and use that file as the source
of truth. The subagent starts with fresh context and must not need to ask
questions. Keep the brief self-contained; do not rely on the parent
conversation.

```markdown
# Phase Brief

- Track: <track-id> — <title>
- Phase: <n> — <name>
- Branch: <branch> (already checked out; do not switch)
- Phase base: <sha>

## Read

- conductor/tracks/<track-id>/spec.md
- conductor/tracks/<track-id>/plan.md (Phase <n> only)
- conductor/tech-stack.md
- conductor/workflow.md (Verification Strategy and Workflow Config)
- conductor/code_styleguides/<relevant>.md
- conductor/tracks/<track-id>/review.md (Phase R<n> only; include finding IDs)

## Phase contract

- Goal: <goal>
- Covers: <FR/NFR/AC IDs>
- Touches: <glob paths>
- Verification: <exact command>

## Tasks

- P<n>.T1: <task>
  - P<n>.T1.1: <sub-task>
- P<n>.T2: <task>

## Evidence

Write the phase report to:
conductor/tracks/<track-id>/verification/phase-<n>.md

Include: title; track, phase, date, branch, base and head commits; result
(verified / failed / blocked / partial); a commands table (layer, command, exit,
summary); an acceptance-criteria table (ID, criterion, evidence, status);
evidence paths; deviations; and notes.

## Rules

- Do not edit plan.md, spec.md, metadata.json, tracks.md, conductor/index.md,
  product docs, review.md, or pr.md.
- Outside code and tests within Touches, you may write only your evidence file
  and artifacts under .conductor/evidence/.
- Stay within Touches. If the goal requires a file outside Touches, make the
  smallest necessary change and record it in deviations.
- If a product or design decision is required, stop and report blocked.
- Do not spawn subagents, ask the user questions, or use the web.
- If a tool call returns "permission denied", the action is not permitted for
  you. Do not retry, rephrase, or work around it (no pipes, no `&&` chains, no
  wrapper binary, no Code Mode). Report the exact command, why you need it, and
  the result you expect in `blockers`, and set status "blocked". The primary
  runs it and hands the output back.
- Prefer the native read, grep, and glob tools over shell equivalents.
- Do not run git push, merge, rebase, reset, clean, switch, checkout, tag, or
  stash.
- Commit task-level changes with conventional messages. Do not amend. Commit the
  evidence file too, or leave it uncommitted for the primary state commit.
- Run the verification command exactly as written. Retry a failing fix at most
  twice. If it still fails, report failed; do not claim success.
- End with only this JSON report:

```json
{
  "phase": "<n>",
  "status": "verified | failed | blocked",
  "tasks": [
    { "id": "P1.T1", "status": "done | partial | failed", "commits": ["abc1234"] }
  ],
  "commits": ["abc1234"],
  "files_changed": ["src/example.ts"],
  "verification": {
    "command": "<exact command>",
    "exit_code": 0,
    "evidence": "conductor/tracks/<track-id>/verification/phase-<n>.md"
  },
  "deviations": [{ "file": "src/example.ts", "reason": "..." }],
  "blockers": [
    { "command": "<exact command that was denied>", "why": "..." , "expected": "..." }
  ],
  "notes": "..."
}
```

### 4.6 Launch the Subagent

-   If `.opencode/agents/conductor-phase.md` exists, launch the
    `conductor-phase` subagent.
-   Otherwise launch the host's general subagent (`general` in OpenCode). The
    brief already contains the restrictions the specialized agent would enforce.
-   Pass the brief path, not the whole brief. Start the prompt with:
    *"Read `.conductor/runs/<track-id>/phase-<n>-brief.md` first. It is your
    complete brief."* Then add any resume or failure context.
-   Use a foreground session. Wait for the report. Do not poll.
-   Keep the session ID. Rework must resume the same session when the host
    supports it.
-   Update `.conductor/runs/<track-id>.json` with `session_id`, `status:
    "running"`, and `updated_at` immediately after launch.
-   When the report arrives, set `status: "reported"`, store a short report
    summary in `last_report`, and update `updated_at` before verification.
-   **Handle a permission-denied report:** when the report is `blocked` because
    a tool call was denied, run the exact command yourself — the primary holds
    the project's permissions — then re-invoke the subagent once with the
    output appended to the brief. Resume the same session when the host
    supports it; otherwise launch a fresh one. If the same command is denied
    again, ask the user with the question tool, naming the exact command and
    what you need from it. Never work around a denial on the subagent's
    behalf.

### 4.7 Independent Verification

Do not trust the report. Verify:

1.  **Working tree:** `git status --porcelain` must be clean after the
    subagent's commits, except for the phase evidence file and `.conductor/`.
    If other changes exist, inspect them and fail the phase.
2.  **Files changed:** `git diff --name-only <phase_base>..HEAD`. Compare
    against `Touches` and the report's `files_changed`.
    -   Reported deviation outside `Touches` → review it. Accept if it is the
        smallest necessary change; otherwise rework.
    -   Unreported file outside `Touches` → rework.
3.  **Verification command:** Run the phase's `Verification` command yourself.
    Run `verify_phase` too when it is configured and different. Use the
    configured retry limit for your own fix attempts, not for acceptance.
4.  **Static checks:** Run the configured lint, format, typecheck, and build
    checks when the phase verification does not already include them.
5.  **Acceptance criteria:** Check the spec's `AC` items against the evidence and
    tests. An `AC` with no test and no evidence is not satisfied.
6.  **Evidence:** Confirm
    `conductor/tracks/<track-id>/verification/phase-<n>.md` exists and contains
    the commands and exit codes. Append a `## Primary verification` section with
    your own command, exit code, and result.

If any check fails, go to Section 4.9.

### 4.8 Accept the Phase

1.  **Squash guard:** Compare the commit range `<phase_base>..HEAD` with the
    report's `commits`. If the range is empty, fail the phase. If it contains a
    merge commit, a commit the subagent did not report, or a user commit, do
    **not** squash. Keep the task commits and record why.
2.  **Squash:** If the guard passes:
    ```bash
    git reset --soft <phase_base>
    git commit -m "<type>(<scope>): <phase goal>"
    ```
    Use the track type (`feat`, `fix`, `chore`, `refactor`) and a short scope.
3.  **Checkpoint:** Record the new commit's short SHA. If the guard prevented a
    squash, use the last commit in the range (`git rev-parse --short HEAD`).
4.  **Update `plan.md`:**
    -   Mark every accepted task and sub-task `[x]`.
    -   Set `**Status:** verified`.
    -   Add:
        ```markdown
        **Result:** verified
        **Checkpoint:** <short-sha>
        **Evidence:** conductor/tracks/<track-id>/verification/phase-<n>.md
        ```
    -   If any task is only partially accepted, do not accept the phase. Go to
        Section 4.9 and rework the gap.
5.  **Update the metadata cache:**
    -   `progress.phases_total` — recount implementation phases from the plan.
    -   `progress.phases_verified` — count verified implementation phases,
        excluding `Phase R<n>`.
    -   `progress.tasks_total` — recount implementation tasks from the plan.
    -   `progress.tasks_done` — count completed implementation tasks, excluding
        review-fix tasks.
    -   `last_checkpoint` — the checkpoint recorded in this phase.
    -   `updated_at`.
6.  **Commit the state:** stage `plan.md`, `metadata.json`, and the phase
    evidence file (which now contains `## Primary verification`).
    `conductor(plan): Mark phase '<name>' as complete`.
7.  **Close the run:** update `.conductor/runs/<track-id>.json` with
    `status: "complete"`, the checkpoint, and `updated_at`.
8.  **Announce:** Phase, checkpoint, evidence path, and any accepted deviation.

### 4.9 Rework, Failure, and Blocking

-   **Rework:** Resume the same subagent session with a targeted message:
    the failed command, the output, the files outside `Touches`, and the
    acceptance criterion that is not met. Maximum **2** rework attempts. Update
    the run file: `status: "rework"`, increment `attempts`, `updated_at`.
-   If the host cannot resume, launch a fresh subagent with the same brief plus
    the failure context and the current commits.
-   **Failure:** After the second failed attempt, set `**Status:** failed`,
    write `**Result:** failed`, set the run file to `status: "failed"`, commit
    the state, and stop. Report exactly what failed. Do not continue to the next
    phase.
-   **Blocked:** If the phase needs credentials, hardware, or an external
    approval, set `**Status:** blocked`, write the blocker, set the run file to
    `status: "blocked"`, commit the state, and ask the user via the question tool. Do not mark it
    verified.

---

## 5. Integrated Verification

After every phase is `verified`:

1.  Run the full configured verification strategy on the track branch. This is
    the integrated check, not a repeat of one phase.
2.  Write `conductor/tracks/<track-id>/verification/integrated.md` with the
    commands, exit codes, and a summary.
3.  If it fails, treat it as a blocking defect. Either fix it through a new
    phase or rework the responsible phase. Do not proceed to review.

---

## 6. Documentation Sync Before Review

1.  Read the track `spec.md` and the final diff.
2.  Read `product.md`, `tech-stack.md`, and `product-guidelines.md`.
3.  Propose the minimum updates needed for new behavior, scope, dependencies,
    commands, or UX rules. Show a diff.
4.  Product and product-guideline changes require explicit user approval.
    Tech-stack changes are recorded with a dated note.
5.  Commit: `docs(conductor): Synchronize docs for track '<track-id>'`.

---

## 7. Review and Post-Review Sync

Review is **mandatory** before completion. Do not mark a track complete or open a
PR without it.

1.  Invoke the `conductor-review` skill for the current track.
2.  If review appends `## Phase R<n>: Review Fixes`, execute that phase with the
    same Phase Execution Loop (Sections 4.4-4.9). The review phase's evidence
    path is `verification/phase-R<n>.md`.
3.  Return to `conductor-review` for a delta re-review. Maximum **2** review
    fix rounds.
4.  If review is still `BLOCK` after the round cap, read `review.md`:
    -   If every remaining blocking finding has an entry in `## Overrides`
        naming the approving user, date, reason, and scope, carry that override
        into `pr.md` and continue to step 5.
    -   Otherwise stop. Do not mark the track complete, push, or open a PR. Hand
        the unresolved findings to the user.
5.  If review passes, or every remaining blocking finding is overridden, run the
    **post-review documentation sync**:
    -   Read `review.md` and the review-fix diff.
    -   Update `spec.md`, `tech-stack.md`, `product.md`, or
        `product-guidelines.md` only where behavior or contracts changed.
    -   Product/guideline changes still need user approval.
    -   Update the **Doc sync** line in `review.md` to `updated` or `none`.
    -   Update `metadata.json`: `doc_sync: "updated" | "none"`, `updated_at`.
    -   Commit the docs, `review.md`, and `metadata.json` together:
        `docs(conductor): Synchronize docs after review for track '<track-id>'`.
    -   Re-run the verification layers affected by the fixes. If the result
        changes, update `verification/integrated.md` and commit it:
        `test(conductor): Update integrated verification for track
        '<track-id>'`.

---

## 8. Complete, Archive, and Open a PR

Archival happens in **one commit at the end**. When a PR is enabled, the branch
is pushed and the PR is opened first; the completion commit then moves the track
into `conductor/archive/`, records the PR URL, and is the last commit on the
branch. Merging the PR puts the archived track on the base branch. Nothing
commits after the merge — cleanup only deletes branches.

### 8.1 Prepare the Completion State

1.  Recompute `metadata.progress` from the plan.
2.  Confirm `metadata.doc_sync` is `updated` or `none`, and set `updated_at`.
3.  Set `metadata.status: "complete"` in memory. Leave the registry at `[~]`
    until the completion commit.
4.  Do not commit yet.

### 8.2 Generate the PR Body

Read `conductor-implement/assets/pr-template.md` and fill it from:
`metadata.json`, `plan.md`, the phase evidence files, `review.md`, and the final
diff. Write `conductor/tracks/<track-id>/pr.md`.

**Media (optional, visual tracks only):**

1.  Read `pr.media` from the Workflow Config. `never` → skip this whole block.
2.  Decide whether the track is visual: the spec, the plan, or the phase goals
    mention UI, screen, layout, chart, animation, or a rendered result. A
    non-visual track skips this block.
3.  For a visual track: with `pr.media: "always"`, capture the demo without
    asking. With `pr.media: "ask"`, ask once: "Include a visual demo in the PR
    body?" **No** → skip the block and leave the `## Media` section out of
    `pr.md`. **Yes** → continue.
4.  Capture the demo with the tooling the host provides — a browser tool,
    Playwright, or an installed Playwright CLI. Prefer a short GIF of the
    affected flow; a single screenshot is enough for a static layout change.
    -   Save it under `.conductor/media/<track-id>/`. Never commit media to the
        repository: binary files on a long-lived branch bloat every future
        clone.
    -   Keep it small: at or below 10 MB, at most 10 fps, a few seconds long.
        Prefer GIF over MP4 unless the user asks for video.
    -   Capture against the branch under review, and note the commit SHA the
        capture demonstrates.
    -   When the host has no capture tooling, say so and skip the media. Never
        fabricate an image and never reference a file that was not captured.
5.  Reference the file in `pr.md` with a path relative to the repository root
    and an alt text, for example
    `![Login error state](.conductor/media/<track-id>/login-error.png)`.
    Section 8.3 uploads it and rewrites the reference to a hosted URL.

### 8.3 Push and Open the PR

1.  Detect a remote with `git remote`. If there is no remote, go to Section 8.4
    with `pr_url: null` and `pr_state: null`; the completion commit is the
    deliverable.
2.  Push: `git push -u origin <branch>` (or `git push` when the upstream is
    already set).
3.  Read `pr.enabled`. If it is false, go to Section 8.4 with `pr_url: null` and
    `pr_state: null`; the pushed branch is the deliverable.
4.  If `pr.enabled` is true, use `pr.tool` from the Workflow Config. Default:
    `gh`. Build the title `<type>(<scope>): <track title>` and use
    `pr.base or base_branch` as the base.
    -   **Media (GitHub only):** when Section 8.2 captured media, the upload
        needs `gh` 2.99.0 or later. Check `gh --version`.
        -   Too old → tell the user to update GitHub CLI (`gh upgrade`, or
            install from https://cli.github.com) and ask whether to create the
            PR now without the media or to wait for the update. Never look for
            another upload path.
        -   `pr.tool` is not `gh` → skip the media and say so. Media upload is
            GitHub-only.
    -   **Existing PR:** inspect it with `gh pr view <branch>` (or
        `gh pr list --head <branch>`).
        -   `OPEN`: update the body with
            `gh pr edit <url> --body-file conductor/tracks/<track-id>/pr.md`,
            adding `--attach <media path>` when media was captured.
        -   `MERGED`: continue to Section 8.4 with `pr_state: "merged"`.
        -   `CLOSED`: stop and ask whether to reopen it or open a new PR. Do not
            make the completion commit while the PR is closed and unmerged.
    -   **Create:**
        ```bash
        gh pr create \
          --base <pr.base or base_branch> \
          --head <branch> \
          --title "<type>(<scope>): <title>" \
          --body-file conductor/tracks/<track-id>/pr.md \
          --attach .conductor/media/<track-id>/<file>
        ```
        Include `--attach` only when media was captured. Run the command from
        the repository root: `--body-file` paths resolve against the body
        file's directory and then the working directory, and the reference in
        the body must match the `--attach` path.
    -   **`glab`:** use the equivalent `glab mr create` and `glab mr view`/
        `glab mr update` commands with the same source branch, target branch,
        title, and body. Apply the same `OPEN`/`MERGED`/`CLOSED` handling.
        Media is not uploaded for `glab`.
    -   **Other tool:** do not invent commands. Treat PR creation as
        unavailable and continue to Section 8.4 with `pr_state:
        "unavailable"`.
5.  Refresh the PR body file when a PR was created or updated: run
    `gh pr view <url> --json body` and write the `body` value to
    `conductor/tracks/<track-id>/pr.md` with the file write tool, not a shell
    redirect. Do this whenever media was attached — `gh` rewrote the local path
    into the hosted URL — so the archived body keeps working links.
6.  If `gh` exits non-zero but prints a PR URL, the PR exists with the
    attachments that succeeded. Report that, keep the PR URL, and continue.
7.  If the configured tool is missing, unauthenticated, or fails, treat PR
    creation as unavailable and continue to Section 8.4 with
    `pr_state: "unavailable"`. Give the user the host's compare URL:
    -   GitHub:
        `https://github.com/<owner>/<repo>/compare/<base>...<branch>?expand=1`
    -   GitLab: the equivalent merge-request URL for the repository.
8.  Do not poll for merge here. Section 8.5 watches only when `pr.watch_ci` is
    true. Never merge the PR without an explicit confirmation asked via the question tool.

### 8.4 Complete and Archive

One commit finishes the track. It is the last commit on the branch; no commit is
made after it, before or after the merge.

1.  `git mv conductor/tracks/<track-id> conductor/archive/<track-id>`.
2.  Update `conductor/tracks.md`: change `[~]` to `[x]` and rewrite the line's
    link to `./archive/<track-id>/index.md`. Keep the line; registry lines are a
    permanent ledger and are never removed.
3.  Update `conductor/archive/<track-id>/metadata.json`:
    -   `status: "complete"`
    -   `archived_at` and `archive_path: "conductor/archive/<track-id>"`
    -   `updated_at`
    -   `pr_url`: the PR URL from Section 8.3, or `null` when there is no PR.
    -   `pr_state`: `"open"` when the PR was created or updated, `"merged"`
        when it was already merged, `"unavailable"` when creation was
        configured but failed, or `null` when no PR is expected.
4.  Stage the archive directory and `conductor/tracks.md`. Commit:
    `chore(conductor): Complete and archive track '<track-id>'`.
5.  Push when a remote exists. This commit must touch only `conductor/**`;
    cleanup relies on that when it compares the branch tip with the PR head.
6.  Do not poll for merge. Section 8.5 watches only when `pr.watch_ci` is true.
    Never merge the PR without an explicit confirmation asked via the question tool.

### 8.5 Watch CI and Offer a Merge

Run only when `pr.watch_ci` is true, a PR exists, and it has checks. Skip
silently when the flag is false; report and skip when there is no PR or no
checks.

1.  Snapshot the PR:
    `gh pr view <url> --json state,isDraft,mergeable,reviewDecision,statusCheckRollup`.
2.  If `statusCheckRollup` is empty, report "no checks configured" and stop.
3.  Watch with a cap:
    ```bash
    gh pr checks <url> --watch --interval 20
    ```
    Call it once, with the harness timeout set to `pr.watch_timeout_minutes`
    (default 15). `gh` has no timeout flag of its own.
4.  If the call times out or checks are still pending, report the pending checks
    and stop. Say plainly that watching stopped; do not imply CI failed and do
    not promise background monitoring.
5.  If any check failed, report the failing check names and stop. Do not offer a
    merge. The completion commit already exists, so do not add fix commits to
    the archived track. A post-completion CI failure is handled outside this
    flow: fix it on a new track or update the PR manually, then re-run
    `implement watch`.
6.  If every check passed, require all of:
    -   `mergeable: "MERGEABLE"`
    -   `isDraft: false`
    -   `reviewDecision` is neither `"REVIEW_REQUIRED"` nor
        `"CHANGES_REQUESTED"`

    If a condition fails, report which one and stop. Never bypass required
    review, branch protection, or a draft state.
7.  Ask one single-choice question: **Merge now** (Recommended), **Leave open**,
    **Stop**. Use the native question tool on OpenCode; otherwise numbered text
    options, one question at a time. State the order in the question so the
    sequence is explicit: the track is already archived in the completion
    commit and pushed; merging the PR is the second and final step, after
    which the branch is deleted locally and on the remote.
8.  On **Merge now**, merge with the configured method and without deleting
    branches:
    ```bash
    gh pr merge <url> --squash
    ```
    Use `--merge` or `--rebase` when `pr.merge_method` says so; default
    `squash`. Never pass `--admin`, `--auto`, or `--delete-branch`. Branch
    deletion stays in Section 9.3.
9.  For `glab`, use `glab mr view` and `glab mr merge` with the same checks and
    the same confirmation.
10. If the host rejects the merge (protection rules, conflicts, stale head),
    report its message verbatim and stop. Do not retry with elevated flags.
11. On success, report the merge commit, then clean up the branch locally and on
    the remote without asking again: the merge you just performed is the proof.
    -   Refresh state with
        `gh pr view <url> --json state,mergeCommit` and require `state:
        "MERGED"` before deleting anything.
    -   If the current branch is the merged branch, check out the base branch.
        When the base is checked out in another worktree, detach this worktree's
        HEAD (`git checkout --detach`) and continue.
    -   `git branch -d <branch>`. When `-d` refuses because the merge was a
        squash or rebase, use `git branch -D <branch>`.
    -   If deletion fails because the branch is checked out in another
        worktree, detach that worktree when it is not the main worktree and
        retry; if it is the main worktree, report it and leave the branch.
    -   `git push origin --delete <branch>` when
        `git ls-remote --heads origin <branch>` still shows the branch.
    -   Then run Section 9.3 for any other merged branches and for the
        background-process step. Do not re-confirm this branch; it is gone.

---

## 9. Cleanup and Status

### 9.1 `implement status`

Resolve track metadata from `conductor/tracks/<track-id>/metadata.json` first,
then `conductor/archive/<track-id>/metadata.json`.

Report:

-   Track, branch, base, and metadata status.
-   Each phase: status, result, checkpoint, evidence.
-   Current phase and next ready phase.
-   Blocked dependencies.
-   Review verdict and open findings.
-   PR URL, if any.
-   Current run state from `.conductor/runs/<track-id>.json`, if present. Do not
    claim the subagent is live from the file alone.

### 9.2 `implement recover`

Recover an interrupted phase without rewriting history. Recovery never discards
uncommitted work without explicit confirmation.

1.  Select the current `[~]` track or the explicitly named track.
2.  Read `metadata.json`, the plan, and `.conductor/runs/<track-id>.json` when it
    exists. If the run file is missing, rebuild the diagnosis from the plan and
    Git.
3.  Inspect:
    -   Current branch vs `metadata.branch`.
    -   Phase status and `phase_base`.
    -   `git status --porcelain`, ignoring `.conductor/`.
    -   Commits in `<phase_base>..HEAD`.
    -   Whether the phase has a `Checkpoint` and `Evidence`.
    -   Whether the run file has a resumable `session_id`.
4.  Classify the state:
    -   Run status `reported` → the subagent finished, but primary verification
        did not. Verification is pending.
    -   Phase `in_progress` with run status `running` or `rework` → resumable.
    -   Phase `in_progress` without a run file → rebuild the brief and resume.
    -   Phase `verified` but metadata or evidence disagrees → reconcile.
    -   Run file points at a different phase or a completed track → stale.
    -   Uncommitted code changes → stop and ask the user via the question tool to commit or stash.
5.  Present the options that apply:
    -   **Verify Reported Work (Recommended when reported):** run Section 4.7.
    -   **Resume:** continue the phase.
    -   **Restart Phase:** reset the phase to `pending` and run it again.
    -   **Reconcile State:** fix the plan/metadata mismatch.
    -   **Keep Work and Stop:** leave the tree untouched.
    -   **Clean Stale Run State:** remove only the run file.
6.  Execute:
    -   **Verify Reported Work:** continue from Section 4.7 against the existing
        commits and report. Do not relaunch the subagent.
    -   **Resume:** if `session_id` exists and the host supports resuming, resume
        that session with the current failure or next-step context. Otherwise
        launch a fresh subagent with the brief and the current commits. Continue
        from Section 4.7.
    -   **Restart:** set the phase `pending`, remove `Result`, `Checkpoint`, and
        `Evidence`, keep the old evidence file (the new run overwrites it), remove
        the run file, commit `conductor(plan): Restart phase '<name>'`, and start
        from Section 4.4.
    -   **Reconcile:** recompute `metadata.progress` from the plan. Restore a
        missing `Checkpoint` only when the user identifies the phase commit; never
        guess. Commit `conductor(plan): Reconcile state for phase '<name>'`.
    -   **Keep:** stop and list the exact paths that need attention.
    -   **Clean:** remove the run file only when no phase is `in_progress` and
        the user confirms via the question tool that no subagent is active.
7.  Never run `git reset --hard`, `git clean`, or `git checkout -- .`. Never
    delete uncommitted work. If the branch is dirty, stop.

### 9.3 `implement cleanup`

Cleanup is track-independent. Do not select a track. It deletes merged branches;
archival already happened at completion, so cleanup never moves or commits track
files. It works from any worktree, including a detached HEAD.

Resolve track metadata from `conductor/tracks/<track-id>/metadata.json` first,
then `conductor/archive/<track-id>/metadata.json`.

1.  **Preflight:** Require a clean tree. No particular branch is required.
    -   `git status --porcelain`, ignoring `.conductor/`. If anything else is
        dirty, stop and ask the user via the question tool to commit or stash it.
    -   Fetch the base when a remote exists and `git.fetch` is true.
    -   If the current branch is a track or revert branch, Step 5 handles it;
        do not demand a base checkout.

2.  **Refresh PR state:** For every `[x]` track with `pr_url` and every `[-]`
    track with `revert_pr_url`, query the PR with the configured `pr.tool`
    (default `gh`). For `gh`:

    ```bash
    gh pr view <url> --json state,mergeCommit,headRefOid,mergedAt,url
    ```

    For `glab`, use the equivalent merge-request view command. Keep the result
    in memory. Do not write metadata unless the user confirms cleanup via the question tool. If the
    configured tool is missing or unauthenticated, mark the state unknown and
    use local proof only.

3.  **Prove the merge before deleting anything:**
    -   **PR merged:** `state: "MERGED"`. Compare `headRefOid` with the local
        branch tip.
    -   **Local merge or fast-forward:** the branch has no PR, but
        `git merge-base --is-ancestor <branch> <base>` succeeds.
    -   **Squash or rebase with no PR proof:** do not guess. Show
        `git log <base> --grep "<track-id>"` and ask the user to confirm via the question tool. Never
        delete a branch on a guess.

    If the branch tip differs from the PR head, the branch advanced after the PR.
    Accept the difference only when every extra commit touches `conductor/**`
    (`git diff --name-only <headRefOid>..<branch>`); the expected case is the
    completion commit from Section 8.4, which archives the track after the PR
    was opened. Any changed file outside `conductor/**` means real drift: warn
    and leave the branch alone.

4.  **Present the candidates:** one table with track ID, branch, PR, merge proof,
    archive location, and whether a remote branch exists. Candidate branches are
    `metadata.branch` for `[x]` tracks and `revert/<track-id>` for `[-]` tracks.
    Show other prefix branches separately; never delete them without an explicit
    per-branch confirmation. Ask for confirmation separately for:
    -   Deleting local branches.
    -   Deleting remote branches, when the remote branch still exists.

    Allow **All**, **Select**, and **Skip** for each.

    Branches already deleted by Section 8.5 after an approved merge are not
    candidates and are not asked about again.

    On hosts with a native question tool (OpenCode), present these
    confirmations with it: one grouped call containing one single-choice
    question per category (**All**, **Select**, **Skip**), and when the user
    chooses **Select**, a follow-up multi-select question listing that
    category's candidates. Use a plain Yes/No question for the unproven
    squash-or-rebase confirmation in step 3. On other hosts, fall back to the
    Interaction Protocol: numbered options in text, one question at a time.

5.  **Delete local branches:**
    -   `git branch -d <branch>` when the branch is an ancestor of the base or
        its upstream is gone and the PR proved the merge.
    -   `git branch -D <branch>` only with PR-merged proof and explicit
        confirmation.
    -   If the current branch is the candidate, check out the base branch when
        possible. If the base is already checked out in another worktree, detach
        the current worktree's HEAD (`git checkout --detach`) after the deletion
        confirmation.
    -   If deletion fails because the branch is checked out in another
        worktree, locate it with `git worktree list`. If it is not the main
        worktree, detach its HEAD with `git -C <path> checkout --detach` and
        retry the deletion. Never use `--force` there and never delete the
        worktree directory. If it is the main worktree, stop and ask the user via the question tool
        to switch it to another branch first.
    -   Never delete an unmerged branch, a branch whose non-`conductor/**`
        commits are newer than the PR head, or a branch belonging to a dirty
        worktree.

6.  **Delete remote branches:** Check `git ls-remote --heads origin <branch>`.
    If it still exists and the user confirmed, run
    `git push origin --delete <branch>`. Do not delete a remote branch whose PR
    is not merged.

7.  **Stop background processes:** End every background process started from the
    project working directory during this track's work — dev servers, file
    watchers, and watch-mode test runners — so nothing keeps running from a
    deleted branch's checkout. On OpenCode, terminate the session's background
    shells whose working directory is the project root. If a background process
    cannot be attributed to this project, report it and leave it running.

8.  **No purge:** Never permanently delete an archived track. There is no
    automatic retention or purge step. A user who wants deletion must do it
    manually with a separate explicit confirmation.

9.  Report stopped background processes, deleted branches, skipped candidates,
    and any branch whose merge could not be proven.

### 9.4 `implement watch [<track-id>]`

Wait for PR checks and offer a merge without redoing completion.

1.  Resolve the track: the named track, otherwise the `[x]` track on the current
    branch, otherwise ask. Read metadata from `conductor/tracks/<track-id>/`
    first, then `conductor/archive/<track-id>/`.
2.  Require `pr_url` and `pr_state: "open"`. If the PR is already merged, report
    it and offer cleanup instead. If `pr_url` is missing, report that no PR was
    recorded and stop.
3.  Run Section 8.5. Ignore `pr.watch_ci` here: an explicit `watch` request is
    the opt-in.

---

## 10. Hard Rules

-   Do not implement a whole track in the primary agent unless the user
    explicitly asks and no subagent is available.
-   Do not skip the phase verification because the subagent says it passed.
-   Do not mark a phase `verified` with a failed or unrun required check.
-   Do not mark a track complete before review passes, unless every remaining
    blocking finding has an explicit user override recorded in `review.md`.
-   Do not push the completion commit when an existing PR for the branch is
    closed and unmerged.
-   Do not push or open a PR before review and post-review doc sync.
-   Do not delete a branch without proven merge.
-   Do not merge a PR without an explicit confirmation from the user.
-   Never ask the user a decision question in plain text. Every question that
    needs a choice, confirmation, or approval goes through the native
    `question` tool on hosts that provide one; pure status updates stay as
    text.
-   Do not pause between phases, before review, or before the PR to ask whether to continue. The only user stops are the steps that name the `question` tool; everything else proceeds autonomously, and defined failures stop with a report, not a question.
-   Do not use `--admin`, `--auto`, or `--delete-branch` when merging.
-   Do not use `git branch -D` without PR-merged proof and confirmation.
-   Do not permanently delete an archived track or purge history.
-   Do not stage unrelated files.
-   Do not rewrite shared history with `git reset --hard`, `git clean`, or
    force-push.
