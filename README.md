# Conductor Plugin

**Measure twice, code once.**

Conductor is a set of Agent Skills for **Spec-Driven Development**. It turns an
AI coding agent into a project manager that specifies, plans, implements, reviews,
and ships work through a repeatable protocol.

The lifecycle is:

```text
Setup -> Spec & Plan -> Branch -> Phases -> Evidence -> Review -> PR
```

Conductor is host-agnostic Markdown. It works with Antigravity, Claude Code, and
OpenCode, with native UI adapters where the host provides them.

--------------------------------------------------------------------------------

## What changed in this fork

This fork replaces the original prose-heavy, manual-checkpoint workflow with a
branch-and-evidence workflow:

-   **Setup interviews to coverage.** Product, tech-stack, and product-guideline
    interviews continue until every checklist dimension is answered or recorded
    as an assumption. Setup no longer stops after one round.
-   **Safe upgrade from 1.x.** Setup detects legacy artifacts, backs them up,
    regenerates the workflow, merges the index, and marks incompatible tracks
    `legacy` instead of silently running them.
-   **One branch per track.** `feat/<track-id>`, `fix/<track-id>`,
    `chore/<track-id>`, or `refactor/<track-id>`, based on `origin/main`,
    `origin/master`, `main`, or `master`.
-   **Stable spec and plan IDs.** Requirements are `FR-1`, `NFR-1`, and `AC-1`;
    tasks are `P1.T1`. Review can trace a requirement to a task and a test.
-   **Phase subagents.** The primary agent orchestrates. A `conductor-phase`
    subagent executes one phase, commits task-level work, and writes an evidence
    file. The primary independently re-runs verification and accepts, reworks, or
    blocks the phase.
-   **Evidence, not manual prompts.** Each phase writes
    `conductor/tracks/<id>/verification/phase-<n>.md`. The old "please verify this
    manually" checkpoint is gone.
-   **Review is mandatory before shipping.** A read-only reviewer checks
    requirements, plan compliance, style, tests, and security. Fixable findings
    become a `Review Fixes` phase; unresolved work becomes a GitHub issue.
-   **Status is factual and branch-aware.** No invented "On Track" or "Behind
    Schedule" labels. It reports state, progress, dependencies, review, PR, and
    drift.
-   **Revert is safe.** Phase reverts use checkpoints. Unmerged tracks are undone
    by deleting the branch. Merged tracks are undone by a reviewed revert PR.
    There is no hard reset and no task-level revert.
-   **Recovery, not guesswork.** Phase run state and briefs live under
    `.conductor/runs/`. `conductor-implement recover` inspects an interrupted
    phase, and `conductor-status --doctor` checks the environment without
    changing it.
-   **PR and CI visibility.** `conductor-status --pr` shows PR state, mergeability,
    review decision, and checks without polling.
-   **No git notes.** Task summaries live in the plan and the evidence files.

--------------------------------------------------------------------------------

## Installation

### 1. Antigravity

End-user installation:

```bash
agy plugins install https://github.com/mansyar/conductor
```

Developer installation (live-sync):

```bash
git clone https://github.com/mansyar/conductor.git
cd conductor
mkdir -p ~/.gemini/config/plugins/ && ln -sfn "$(pwd)" ~/.gemini/config/plugins/conductor
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$HOME\.gemini\config\plugins" | Out-Null
New-Item -ItemType Junction -Path "$HOME\.gemini\config\plugins\conductor" -Target (Get-Location)
```

Workspace-level isolation:

```bash
mkdir -p .agents/plugins/
ln -sfn /absolute/path/to/cloned/conductor .agents/plugins/conductor
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force ".agents\plugins" | Out-Null
New-Item -ItemType Junction -Path ".agents\plugins\conductor" -Target "D:\path\to\conductor"
```

### 2. Claude Code

```bash
/plugin marketplace add mansyar/conductor
/plugin install conductor
```

### 3. OpenCode

The skills are plain Markdown. Copy or link each `skills/conductor-*` folder into
a directory listed in your OpenCode `skills` config. For the default global
skills directory on Windows:

```powershell
New-Item -ItemType Directory -Force "$HOME\.config\opencode\skills" | Out-Null
Copy-Item -Recurse skills\conductor-* "$HOME\.config\opencode\skills\"
```

Use `.opencode/skills/` for a project-local install, or the equivalent `cp -R` on
macOS/Linux. During setup, Conductor also writes project-local subagents to
`.opencode/agents/`:

-   `conductor-phase.md` — executes one phase and returns a structured report.
-   `conductor-reviewer.md` — reviews a track read-only and returns findings.

Setup fills their shell allowlists from the commands in `conductor/workflow.md`.
On other hosts, Conductor falls back to the host's general subagent.

### Prerequisites

-   Git, with a repository in the project root.
-   Python 3 for the setup resume check.
-   Optional: `gh` for review issues and pull requests.

--------------------------------------------------------------------------------

## Upgrading from Conductor 1.x

If the project already has a `conductor/` directory created by the original
Conductor, run:

```text
/conductor:conductor-setup upgrade
```

The upgrade is deliberately conservative:

1. Backs up `conductor/` to `.conductor/backups/conductor-v1-<timestamp>/`.
2. Preserves `product.md`, `tech-stack.md`, and `product-guidelines.md`.
3. Regenerates `workflow.md` with the Workflow Config and Verification Strategy.
4. Merges the version marker, Tracks section, and Capabilities into
   `conductor/index.md` without discarding custom sections.
5. Installs the current OpenCode subagents when applicable.
6. Adds v2 metadata fields to existing tracks and writes
   `conductor/migration-report.md`.

Old specs and plans are **not** rewritten automatically. Tracks that do not meet
the v2 spec/plan contract are marked `legacy: true`. `conductor-implement`,
`conductor-review`, and phase revert refuse them until you recreate the track
with `conductor-new-track` (using the old spec as an import source) or repair it
manually. `conductor-status` shows them as `legacy`.

A **fresh start** option is also offered: it backs up the old directory, then
runs setup from the beginning.

--------------------------------------------------------------------------------

## Uninstallation

-   **Antigravity:** `agy plugins uninstall conductor`, or remove the symlink.
-   **Claude Code:** `/plugin remove conductor` and
    `/plugin marketplace remove mansyar/conductor`.
-   **Project artifacts:** delete `conductor/` and `.opencode/agents/` when you no
    longer use Conductor in that project. If setup added the managed block, remove
    it from `AGENTS.md`.

--------------------------------------------------------------------------------

## Usage & Lifecycle

### 1. Set Up the Project (Run Once)

```bash
/conductor:conductor-setup
```

Setup:

1. Detects greenfield vs. brownfield and scans an existing repository.
2. Runs coverage-loop interviews for:
   - **Product** — problem, users, use cases, goals, flows, scope, constraints,
     integrations, risks, open questions.
   - **Tech stack** — languages, frameworks, package manager, data stores,
     services, hosting, commands, local environment, constraints, rejected
     alternatives, upgrade policy, open questions.
   - **Product guidelines** — voice, UX principles, accessibility, design system,
     content style, platform conventions, i18n, legal/privacy, open questions.
3. Copies applicable code style guides.
4. Infers the project profile and generates a filled `workflow.md` with:
   - `## Workflow Config` — commands, coverage gate, verification layers,
     evidence paths, git/PR policy, review and issue settings.
   - `## Verification Strategy` — layers, services, pass criteria, evidence
     format, fallback ladder, retry policy, human-only exceptions.
5. Optionally installs recommended agent skills.
6. On OpenCode, installs the phase and reviewer subagents.
7. Optionally adds a managed Conductor block to `AGENTS.md`; existing content is
   preserved.

**Generated artifacts:**

-   `conductor/index.md`
-   `conductor/product.md`
-   `conductor/product-guidelines.md`
-   `conductor/tech-stack.md`
-   `conductor/workflow.md`
-   `conductor/code_styleguides/`
-   `conductor/tracks.md`
-   `.opencode/agents/conductor-phase.md` (OpenCode)
-   `.opencode/agents/conductor-reviewer.md` (OpenCode)
-   `AGENTS.md` with a managed Conductor block (OpenCode, optional)

### 2. Start a New Track

```bash
/conductor:conductor-new-track
# or
/conductor:conductor-new-track "Add a dark mode toggle to settings"
```

New-track asks for a description, infers the type (`mvp`, `feature`, `bug`,
`chore`, `refactor`), and proposes a stable ID:

```text
YYYYMMDD-<slug>
```

It can import an existing PRD, issue, or design document, or interview you with a
spec coverage checklist. The spec uses stable IDs:

-   `FR-1` — functional requirement
-   `NFR-1` — non-functional requirement
-   `AC-1` — acceptance criterion, mapped to a requirement

Bug tracks also capture reproduction steps, expected vs. actual behavior,
root-cause hypothesis, and the regression test.

After the spec and plan are approved, Conductor:

1. Resolves the base branch and fetches it.
2. Checks out `<prefix>/<track-id>` in the current worktree.
3. Writes `metadata.json`, `spec.md`, `plan.md`, and the track `index.md`.
4. Adds the track to `tracks.md` and ensures the Tracks section exists in
   `conductor/index.md`.
5. Commits the scaffold on the new branch.

**Generated artifacts:**

-   `conductor/tracks/<track-id>/spec.md`
-   `conductor/tracks/<track-id>/plan.md`
-   `conductor/tracks/<track-id>/metadata.json`
-   `conductor/tracks/<track-id>/index.md`
-   `conductor/tracks.md`

The plan is strict Markdown. Each phase has:

```markdown
## Phase 1: Session storage

- **Goal:** Persist sessions across restarts.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `src/auth/`, `tests/auth/`
- **Verification:** `npm test -- auth`
- **Status:** pending

- [ ] **P1.T1: Implement the session store** — covers: FR-1
```

### 3. Implement the Track

```bash
/conductor:conductor-implement
# or scope it
/conductor:conductor-implement phase 2
/conductor:conductor-implement next
/conductor:conductor-implement task P2.T3
```

The primary agent:

1. Checks out the track branch and verifies the recorded base.
2. Marks the track `[~]` and commits the state.
3. For each phase:
   - marks it `in_progress`
   - writes the phase brief and run state under `.conductor/runs/`
   - launches the `conductor-phase` subagent with the brief path
   - waits for the structured report
   - independently re-runs verification
   - checks the diff against `Goal`, `Covers`, and `Touches`
   - accepts, reworks (max 2 attempts), or blocks
4. On acceptance, squashes the phase into one commit, records the checkpoint and
   evidence in the plan, updates `metadata.json`, and commits the state.
5. After all phases, runs integrated verification.
6. Syncs the docs.
7. Runs `conductor-review`.
8. Applies review fixes, re-reviews, and runs the post-review doc sync.
9. Pushes, opens a PR, then marks the track complete.

If a phase is interrupted, run:

```bash
/conductor:conductor-implement recover
```

It inspects the branch, plan, tree, checkpoint, and run file, then offers Resume,
Restart, Reconcile, Keep Work, or Clean Stale Run State. It never runs
`git reset --hard` or discards uncommitted work.

Phase evidence is committed:

```text
conductor/tracks/<track-id>/verification/phase-1.md
conductor/tracks/<track-id>/verification/integrated.md
```

Large binaries and screenshots go to `.conductor/evidence/`, which is gitignored.

### 4. Review

```bash
/conductor:conductor-review
```

Review is read-only at first:

-   **Scope:** `base_sha..HEAD` (or a phase range).
-   **Checks:** the commands configured in `workflow.md`; no inferred "probably
    npm test" when a command is configured.
-   **Requirements:** every `FR`, `NFR`, and `AC` is traced to an implementation
    and a test or evidence artifact.
-   **Style:** applicable style guides for changed lines, with calibrated
    severity.
-   **Findings:** `Critical`, `High`, `Medium`, `Low`, each with `file:line`,
    impact, and a concrete fix.

Critical and High findings block. Fixable findings are appended as
`## Phase R<n>: Review Fixes` and executed by the phase subagent. After two
rounds, unresolved blocking findings become GitHub issues and the PR stays
blocked; non-blocking items become issues and the PR can proceed.

The review report is written to:

```text
conductor/tracks/<track-id>/review.md
```

Review never archives or deletes a track.

### 5. Status

```bash
/conductor:conductor-status
/conductor:conductor-status <track-id>
/conductor:conductor-status --all
/conductor:conductor-status --verify
/conductor:conductor-status --doctor
/conductor:conductor-status --pr
```

Status is a factual, read-only report:

-   state: `new`, `legacy`, `ready`, `in_progress`, `blocked`, `in_review`,
    `fixes`, `doc_sync`, `pr_open`, `complete`, `reverted`, `abandoned`, or
    `drift`
-   phase and task progress
-   current and next ready phase
-   dependencies
-   review verdict and rounds
-   PR and CI state
-   current phase run state
-   drift warnings

The default reads active plans and trusts the metadata cache for completed
tracks. `--all` scans local track branches read-only, including branches whose
registry is not visible on the current branch. `--verify` recomputes every plan.

`--doctor` checks Git, setup artifacts, Workflow Config, track metadata, plan
grammar, OpenCode agents, tooling, and runtime state. It prints exact repair
commands but never applies them.

`--pr` queries PR state, mergeability, review decision, and checks for tracks
with a PR URL. It does not poll or rerun checks.

### 6. Revert

```bash
/conductor:conductor-revert phase 2
/conductor:conductor-revert review
/conductor:conductor-revert track
```

-   **Phase revert** uses the phase checkpoint. The default is a cascade: phase N
    and every verified phase after it, newest first. The plan is reset to
    `pending`, tasks are unchecked, evidence is kept, and a revert record is
    written.
-   **Review-fix revert** reverts the latest `Phase R<n>` checkpoint and marks the
    review `SUPERSEDED`.
-   **Unmerged track revert** deletes the track branch after confirming that its
    PR is closed or intentionally kept. No history rewrite.
-   **Merged track revert** creates `revert/<track-id>`, reverts the merge or
    squash commit, marks the track `[-]`, runs review, and opens a revert PR.
-   **Task revert is not supported.** Squashing removes task commits; revert the
    phase and redo the task.

There is no `git reset --hard` path.

--------------------------------------------------------------------------------

## Generated Artifacts

| Artifact | Purpose |
| --- | --- |
| `conductor/index.md` | Handshake and map of context, workflow, and capabilities. |
| `conductor/product.md` | Product definition and assumptions. |
| `conductor/product-guidelines.md` | UX, voice, accessibility, and design rules. |
| `conductor/tech-stack.md` | Languages, frameworks, services, commands, constraints. |
| `conductor/workflow.md` | Workflow Config, verification strategy, quality gates. |
| `conductor/code_styleguides/` | Applicable style guides. |
| `conductor/tracks.md` | Registry: `[ ]`, `[~]`, `[x]`, `[-]`. |
| `conductor/tracks/<id>/spec.md` | Stable `FR`/`NFR`/`AC` requirements. |
| `conductor/tracks/<id>/plan.md` | Phases, tasks, checkpoints, results, evidence. |
| `conductor/tracks/<id>/metadata.json` | Branch, base, progress cache, review/PR state. |
| `conductor/tracks/<id>/index.md` | Track links and summary. |
| `conductor/tracks/<id>/verification/` | Per-phase, integrated, and revert evidence. |
| `conductor/tracks/<id>/review.md` | Findings, coverage, verdict, debt. |
| `conductor/tracks/<id>/pr.md` | Pull request body. |
| `conductor/archive/` | Post-merge archive. |
| `conductor/migration-report.md` | Legacy track inventory created by a 1.x upgrade. |
| `.conductor/evidence/` | Large artifacts; gitignored. |
| `.conductor/runs/` | Phase briefs and run state; gitignored. |
| `.conductor/backups/` | Pre-upgrade backups; gitignored. |

--------------------------------------------------------------------------------

## Commands Reference

| Command | Description |
| --- | --- |
| `/conductor:conductor-setup` | Initialize context, workflow, style guides, and subagents. |
| `/conductor:conductor-setup upgrade` | Upgrade a Conductor 1.x project without rewriting its context docs. |
| `/conductor:conductor-new-track` | Create a spec, plan, branch, and registry entry. |
| `/conductor:conductor-implement` | Execute all remaining phases with subagents and verify each. |
| `/conductor:conductor-implement next` | Execute only the next phase. |
| `/conductor:conductor-implement phase N` | Execute one phase. |
| `/conductor:conductor-implement task P2.T3` | Execute one task inside a phase. |
| `/conductor:conductor-implement status` | Show implementation state. |
| `/conductor:conductor-implement recover` | Inspect and resume an interrupted phase. |
| `/conductor:conductor-implement cleanup` | Clean merged branches and archive merged tracks. |
| `/conductor:conductor-review` | Review the current track. |
| `/conductor:conductor-review phase N` | Review one phase. |
| `/conductor:conductor-review current` | Review uncommitted changes. |
| `/conductor:conductor-status` | Current branch summary. |
| `/conductor:conductor-status --all` | Scan local track branches. |
| `/conductor:conductor-status --verify` | Recompute every plan. |
| `/conductor:conductor-status --doctor` | Check environment and Conductor integrity. |
| `/conductor:conductor-status --pr` | Show PR, review, mergeability, and CI state. |
| `/conductor:conductor-revert phase N` | Revert a phase and later verified phases. |
| `/conductor:conductor-revert review` | Revert the latest review-fix phase. |
| `/conductor:conductor-revert track` | Delete an unmerged track or open a revert PR. |

--------------------------------------------------------------------------------

## Host Support

-   **Antigravity:** native interactive modals through the rule adapter.
-   **Claude Code:** structured text choice menus.
-   **OpenCode:** project-local `conductor-phase` and `conductor-reviewer`
    subagents, with a `general` fallback when the agent files are absent, plus an
    optional managed `AGENTS.md` block.

All hosts use the same artifacts. The difference is only how the agent asks
questions and which subagent it can launch.

--------------------------------------------------------------------------------

## Repository Structure

-   `skills/` — one `SKILL.md` per command, plus templates and setup assets.
-   `skills/conductor-setup/assets/agents/` — OpenCode subagent profiles.
-   `skills/conductor-*/assets/` — spec, plan, metadata, review, verification,
    and PR templates.
-   `rules/` — host-specific interaction rules.
-   `plugin.json` — plugin manifest.

--------------------------------------------------------------------------------

## Resources

-   [Antigravity Plugins Documentation](https://antigravity.google/docs/plugins)
-   [Claude Code Plugins Documentation](https://code.claude.com/docs/en/discover-plugins)
-   [GitHub Issues](https://github.com/mansyar/conductor/issues)
-   Keith Ballinger's original
    [.conductor](https://github.com/keithballinger/.conductor) project.

--------------------------------------------------------------------------------

## License

Apache License 2.0. See [LICENSE](LICENSE).
