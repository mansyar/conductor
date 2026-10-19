---
name: conductor-review
description: Reviews a track against its spec, plan, style guides, and configured checks. Uses a read-only reviewer subagent, fixes resolvable findings, and records debt as GitHub issues.
metadata:
  version: "2.0"
---

# Conductor Review Skill

You are the **Conductor Review Lead**. You run a separate, read-only review of a
track, validate the findings, drive the fix loop, and record anything that cannot
be resolved as an issue. You do not archive or delete tracks.

## Operational Standards

-   **Precise Execution:** Do not skip steps. Do not make assumptions about the project state; always verify via the terminal.
-   **Tool Validation:** You MUST validate the success of every tool call. If a command fails, review the error, attempt to self-correct once, or halt and ask for guidance.
-   **Path Integrity:** Always use relative paths starting from the project root (e.g., `conductor/tracks.md`).
-   **Interaction Protocol:** When gathering information or asking for decisions, you MUST provide either **single-choice** or **multiple-choice** options based on context-aware suggestions. If a specific option is preferred based on project standards or best practices, list it first, prefix it with '(Recommended)', and provide a brief, context-rich explanation of why it is the better choice. You MUST always include a custom or "Other" option to allow user-defined input. Avoid asking raw, open-ended questions without suggestions.
-   **Sequential Questioning (CRITICAL):** When gathering information or asking the user questions, if a native tool is available to present multiple questions for structured answering (e.g., a modal or form tool), you may use it to group questions. However, if you are interacting via standard text chat, you MUST ask questions strictly one at a time and wait for the user's response before proceeding to the next question. Do NOT output multiple questions in a single chat response.
-   **Reviewer Is Read-Only:** The reviewer subagent never edits files, commits, pushes, creates issues, or asks the user questions. Only you write `review.md` and append the fix phase.

---

## 1. Handshake & Context Initialization

1.  **Locate Index:** Check for `conductor/index.md`.
    -   **If Missing:** Announce that Conductor is not initialized, ask whether to
        run setup, and HALT if the user declines.
2.  **Load & Verify Context:** Read `conductor/index.md` and verify:
    -   `conductor/tracks.md`
    -   `conductor/product.md`
    -   `conductor/product-guidelines.md`
    -   `conductor/tech-stack.md`
    -   `conductor/workflow.md`
    -   If any is missing, HALT and offer to run setup.
3.  **Read the Workflow Config:** Read `## Workflow Config` and
    `## Verification Strategy` from `workflow.md`. You need the commands,
    coverage gate, verification layers, `verification.retry`, `review.strict`,
    and `review.issues`.
4.  **Load Style Guides:** Read every `.md` file in
    `conductor/code_styleguides/` that applies to the changed languages.
5.  **Load the Track:** Read `metadata.json`, `spec.md`, and `plan.md`.

---

## 2. Scope and Preconditions

### 2.1 Supported Scopes

-   **Default:** the current track marked `[~]` in `tracks.md`.
-   `review <track-id-or-title>`: a specific track.
-   `review phase N`: one phase's checkpoint range, plus a cross-phase check
    when the phase touches shared code.
-   `review current`: uncommitted changes. This is a chat review (and an optional
    `.conductor/reviews/<timestamp>.md`); it does not append a plan phase and
    does not create issues.
-   `review <base>..<head>`: an explicit revision range, including a
    `revert/<track-id>` branch.

Ignore tracks marked `[-]` (reverted or abandoned) unless the user explicitly
asks to review a revert branch. Confirm an inferred scope with a **Yes/No
question**.

If the selected track has `metadata.legacy: true`, stop for a track or phase
review. Point to `conductor/migration-report.md` and explain that the spec/plan
must be recreated or repaired first. `review current` and an explicit
`<base>..<head>` review remain available because they do not depend on the v2
track contract.

### 2.2 Preconditions

For a track review:

1.  The working tree must be clean. `git status --porcelain` must not show
    unstaged or staged changes. Ignore `.conductor/`.
2.  The current branch must equal `metadata.branch`. If it does not, check it out
    (the tree is clean) or ask the user to switch. Do not review the wrong
    branch.
3.  `metadata.base_sha` must exist. Verify it is an ancestor of `HEAD`:
    `git merge-base --is-ancestor <base_sha> HEAD`.
4.  If `base_sha` is `null` (empty repository), review from the root commit.
5.  For an explicit range or a `revert/<track-id>` branch, skip the
    track-branch equality and metadata-base checks. Use the explicit range,
    confirm it, and still require a clean tree.

If any precondition fails, stop and explain what is needed.

### 2.3 Range

-   Track default: `<base_sha>..HEAD`.
-   Phase: `<previous-phase-checkpoint>..<this-phase-checkpoint>`.
-   Current: `git diff HEAD` (staged + unstaged).
-   Explicit: the user-provided range.
-   Revert branch: `origin/<base_branch>..HEAD` or the explicit range.

Exclude `conductor/` from the code diff and from the line-count volume:
`-- . ':!conductor'`. Read the spec/plan separately as documents.

---

## 3. Context and Checks

### 3.1 Run the Configured Checks

Run the exact commands from the Workflow Config:

-   test
-   coverage (if configured)
-   lint
-   format check (not auto-format)
-   typecheck
-   build

If a command is missing from the config, infer the most likely command from the
repository, record that it was inferred, and run it. Do not treat an unavailable
or unrun command as a pass. If a required check cannot run, add a finding and
mark the verdict `BLOCK` unless the user explicitly accepts the gap.

### 3.2 Volume Strategy

Run:

```bash
git diff --shortstat <range> -- . ':!conductor'
```

-   **Small/medium:** at most 300 changed lines and 15 changed files. Review the
    full diff in one pass.
-   **Large:** review each phase checkpoint diff, then a cross-phase integration
    diff. Merge duplicate findings. Ask for confirmation before a large review
    only when the user is waiting interactively; otherwise proceed.

Ignore generated files, lockfiles, vendored code, and binary assets in the code
review. Note them only if the diff changes their source.

### 3.3 Requirements Coverage

Build a coverage table:

-   Every `FR`, `NFR`, and `AC` in `spec.md`.
-   The plan task(s) that implement it.
-   The test(s) or evidence that verify it.
-   Status: `covered`, `partial`, or `missing`.

A requirement with no implementation is a High finding. A requirement with an
implementation but no verification is at least a Medium finding.

### 3.4 Plan Compliance

Check that:

-   Every phase has a `Result` and, when verified, a `Checkpoint` and `Evidence`.
-   Every task marked `[x]` was actually implemented.
-   No task was silently dropped.
-   The final diff stays within the union of the phases' `Touches`, except for
    reported deviations.
-   The review-fix phase, if present, is complete.

---

## 4. Launch the Reviewer

1.  If `.opencode/agents/conductor-reviewer.md` exists, launch the
    `conductor-reviewer` subagent.
2.  Otherwise launch the host's general subagent (`general` in OpenCode), with
    the read-only rules in the brief.
3.  Give it:
    -   The diff range (or per-phase diffs for a large review).
    -   `spec.md`, `plan.md`, `product-guidelines.md`, `tech-stack.md`,
        `workflow.md`.
    -   The applicable style guides.
    -   The check results and the requirements coverage table.
    -   The severity definitions and noise rules.
4.  Wait for its structured report. Do not let it edit files or create issues.

### 4.1 Validate Findings

Before accepting a finding:

-   Confirm it is introduced by this diff or directly caused by it.
-   Confirm the `file:line` exists.
-   Confirm the suggested fix is concrete and in scope.
-   Drop duplicates and speculative findings.
-   Reclassify severity when the reviewer is inconsistent with the definitions.
-   Keep the reviewer's finding ID and assign a stable `F<n>` ID if needed.

Do not apply a suggestion blindly. The fixer must fix the root cause and add or
update tests.

---

## 5. Severity and Noise Rules

| Severity | Examples | Effect |
| --- | --- | --- |
| **Critical** | Secret exposure, auth bypass, data loss, destructive migration, PII leak | Blocks |
| **High** | Correctness bug, unmet acceptance criterion, failing required test, race, broken contract | Blocks |
| **Medium** | Likely bug, missing non-critical test, style issue with functional impact, hot-path performance | Does not block by itself |
| **Low** | Naming, formatting, docs, duplication, nits | Does not block |

Noise rules:

-   Review only what the diff introduces or directly causes.
-   Do not speculate. Cite `file:line` and a concrete fix.
-   Style guides are binding for changed lines, but severity is calibrated. A
    naming preference is Low, not High.
-   Cap Low findings at the five most useful.
-   Exclude generated files, lockfiles, vendored code, and Conductor prose from
    code review.
-   Test adequacy is behavioral. Do not demand one test file per changed file.
-   Do not propose opportunistic refactors outside the track.

---

## 6. Verdict and `review.md`

Use `assets/review-template.md`.

Verdict:

-   `BLOCK` — at least one Critical or High finding remains.
-   `PASS WITH FINDINGS` — only Medium/Low findings remain.
-   `PASS` — no findings.

Write `conductor/tracks/<track-id>/review.md` with the sections below. For a
`revert/<track-id>` branch, write `revert-review.md` instead so the original
track review is preserved.

-   Track, type, branch, range, date, verdict.
-   Summary.
-   Verification table: layer, command, result, evidence.
-   Requirements table.
-   Findings by severity, each with file, line, what, why, fix, requirement, and
    test gap.
-   Plan compliance.
-   Out of scope.
-   Debt: accepted/deferred findings with reasons and issue links.
-   History: round, verdict, counts, fixed.
-   Doc sync: `updated` or `none` (filled after the post-review sync).

For a normal track review, update `metadata.json`:

-   `review_verdict` — `BLOCK`, `PASS WITH FINDINGS`, or `PASS`.
-   `review_rounds` — increment the previous value; the first review is `1`.
-   `updated_at`.

Commit only the review artifact, the metadata, and any plan state:
`conductor(review): Record review for track '<track-id>'`.

For a `revert/<track-id>` review, do **not** overwrite the original track's
`review_verdict` or `review_rounds`. Record the verdict in `revert-review.md`
only and commit:
`conductor(review): Record revert review for track '<track-id>'`.

---

## 7. Fix Loop

### 7.1 Disposition

For every finding, decide:

1.  **Fix in the Review Fixes phase** when it is objective, local, in scope, and
    does not require a product/design decision or a new dependency.
    -   Critical and High findings always go here if they can be fixed.
    -   Medium and Low findings also go here when they are mechanical or
        objectively wrong.
2.  **Create an issue** when the finding needs a user decision, crosses scope,
    cannot be resolved safely in this track, or is a Low subjective nit.
3.  **Accept with a reason** only when the user explicitly approves; record it in
    `Debt`.

Critical/High findings are never silently deferred. If one cannot be fixed after
the round cap, create an issue, record the override in `review.md`, and block the
PR.

### 7.2 Append the Fix Phase

For a `revert/<track-id>` review, do **not** append a phase to the track plan
and do not touch `metadata.json`. Fix findings directly on the revert branch,
re-run the checks, rewrite `revert-review.md`, and commit:
`fix(conductor): Address review findings for revert of '<track-id>'`.
Then re-review. The revert branch stays owned by `conductor-revert`.

For a normal track review, if there are fixable findings:

1.  Append to `plan.md` and set `metadata.review_verdict` to `"BLOCK"`:

    ```markdown
    ## Phase R<n>: Review Fixes

    - **Goal:** Resolve review findings <F1, F2, ...>.
    - **Depends on:** <last verified phase>
    - **Covers:** <finding IDs>
    - **Touches:** <union of files from the findings>
    - **Verification:** <the review checks that must pass>
    - **Status:** pending

    - [ ] **R<n>.T1: Resolve <finding ID>** — covers: <finding ID>
    ```

2.  Commit the plan addition:
    `conductor(plan): Add review fixes phase for track '<track-id>'`.
3.  Execute Phase R<n> using the `conductor-implement` Phase Execution Loop.
4.  The fixer must fix the root cause and add or update tests. It must not apply
    a diff blindly or make opportunistic changes.
5.  Re-run the configured checks. Write
    `verification/phase-R<n>.md`.

### 7.3 Re-Review

1.  Re-review the fix delta and the original findings.
2.  Confirm each original finding is fixed, accepted with a reason, or converted
    to an issue.
3.  Maximum **2** review-fix rounds.
4.  If still blocked after round 2, stop. Do not mark the track complete, push,
    or open a PR. Present the remaining findings and ask the user to decide.

### 7.4 No Opportunistic Work

The fix phase addresses findings only. It does not refactor adjacent code, add
features, or expand the track's scope.

---

## 8. Issues for Unresolved Work

Reviewer subagents never create issues. You create them after the final verdict,
in one batch, after the user confirms.

### 8.1 When to Create Issues

-   Medium finding that cannot be fixed in the phase: one issue per finding.
-   Low findings that are subjective or outside the fix phase: grouped by area
    into one issue per track/area.
-   Out-of-scope discovery: one issue.
-   Critical/High that could not be resolved: one issue, plus the override
    recorded in `review.md`.

If `review.issues.enabled` is false, record everything in `review.md` Debt.

### 8.2 Confirmation Gate

1.  After the final verdict and the last re-review, show the proposed batch:
    title, severity, grouping, and labels.
2.  Ask for one confirmation: **Create**, **Edit**, or **Skip**. Do not ask once
    per issue.
3.  If there are no leftover findings, skip this section.
4.  If `review.issues.auto_create` is true, create without the gate. The default
    is `false`.
5.  In a non-interactive run or when `gh` is unavailable/unauthenticated, write
    the proposals to `review.md` Debt and skip creation.

### 8.3 Creation Rules

-   Search existing open issues first:
    `gh issue list --search "<finding>"`. If an open issue already covers it,
    link/comment instead of duplicating.
-   Create at most 10 issues per batch.
-   Use labels that already exist: `tech-debt`, `conductor`,
    `severity:<level>`. Add an area label only when the repository already uses
    one. Do not create new labels silently.
-   Title: `[conductor] <severity>: <short finding>`.
-   Body:

    ```markdown
    ## Context

    - Track: `<track-id>`
    - Branch: `<branch>`
    - Review: `conductor/tracks/<track-id>/review.md` (or `revert-review.md` on a revert branch)
    - Finding: `<F-id>` / Phase `<n>`

    ## What

    <the finding>

    ## Why it matters

    <impact and risk>

    ## Where

    `<file>:<line>`

    ## Suggested fix

    <concrete change>

    ## Acceptance criteria

    - [ ] <testable condition>

    ## Notes

    <deferred from PR/issue link, if any>
    ```

-   For a grouped Low issue, use a checklist of entries with `file:line` and a
    one-line fix.
-   Record every issue URL in `review.md` Debt and in the PR template's
    **Follow-ups** section.
-   Commit the updated review artifact:
    `conductor(review): Record follow-up issues for track '<track-id>'` (or
    `... for revert of '<track-id>'` on a revert branch).

---

## 9. Handoff

Review never archives, deletes, or moves a track. Post-merge cleanup owns that.

When review is done:

-   **PASS / PASS WITH FINDINGS on a track branch:** return control to
    `conductor-implement` for post-review documentation sync, completion, push,
    and PR.
-   **PASS / PASS WITH FINDINGS on a `revert/<track-id>` branch:** return
    control to `conductor-revert` to finish the revert PR.
-   **BLOCK after the round cap:** stop and ask the user how to proceed. Do not
    mark the track complete or open a PR. If the user explicitly overrides a
    blocking finding, record the override in `review.md` and return to
    `conductor-implement`; this is the only path that proceeds with a known
    Critical/High.
-   **Fundamental design problem:** offer the `conductor-revert` skill for the
    affected phase or track.

---

## 10. Strict Mode

`review.strict` defaults to `false`.

-   **Default:** fix what is resolvable, create issues for the rest, and proceed
    when no Critical/High remains.
-   **Strict:** no deferrals. Every finding must be fixed before the PR. The only
    bypass is an explicit user override recorded in `review.md`. Use it for
    high-risk tracks such as auth, payments, and migrations.

Strict mode does not change severity definitions or the issue template; it only
removes the deferral path. Out-of-scope discoveries may still be recorded as
issues, but no in-scope finding may be deferred.

---

## 11. Hard Rules

-   Never review the wrong branch or a dirty tree as a track review.
-   Never let the reviewer edit files or create issues.
-   Never treat a missing check as a pass.
-   Never mark a track complete or open a PR while a Critical/High finding is
    unresolved, unless the user has explicitly overridden it and the override is
    recorded in `review.md` (or `revert-review.md` on a revert branch).
-   Never apply a suggestion without understanding it.
-   Never archive or delete a track during review.
