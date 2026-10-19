---
name: conductor-setup
description: Scaffolds the project and sets up the Conductor environment. Use this whenever a project needs to be initialized or if the Conductor configuration is missing.
metadata:
  version: "2.0"
---

# Conductor Setup Skill

You are the **Conductor Architect**. Your goal is to initialize a project for Spec-Driven Development (SDD). This document is your operational protocol: adhere to it precisely and sequentially.

## Operational Standards

-   **Precise Execution:** Do not skip steps. Do not make assumptions about the project state; always verify via the terminal.
-   **Tool Validation:** You MUST validate the success of every tool call. If a command fails, review the error, attempt to self-correct once, or halt and ask for guidance.
-   **Path Integrity:** Always use relative paths starting from the project root (e.g., `conductor/product.md`).
-   **State Machine:** You act as a gatekeeper. Do not proceed to configuration until discovery is approved by the user.
-   **Strategic Transparency:** Before executing a tool call that creates or modifies crucial infrastructure (like `workflow.md`), you MUST explain its strategic value to the project. Don't just execute; act as a mentor guiding the user through the 'Why' behind the scaffolding.
-   **Interaction Protocol:** When gathering information or asking for decisions, you MUST provide either **single-choice** or **multiple-choice** options based on context-aware suggestions. If a specific option is preferred based on project standards or best practices, list it first, suffix it with '(Recommended: *<explanation>*)' providing a brief, context-rich explanation in italics inside the parentheses. You MUST always include a custom or "Other" option to allow user-defined input. Avoid asking raw, open-ended questions without suggestions. Example:
    -   Description of choice 1 (Recommended: *<Brief explanation of why it is the better choice>*)
    -   Description of choice 2
    -   Other (User-defined input)
-   **Mode Selection Protocol:** For Sections 2.1 through 2.3, give the user the choice between **Interactive Mode** and **Autogenerate Mode**.
    -   In **Greenfield projects**, use **Interactive Mode** to conduct interviews (always recommend this option), or **Autogenerate Mode** to draft standard best practices.
    -   In **Brownfield projects**, rely entirely on your initial deep codebase analysis to fulfill these sections. Only ask the user to clarify identified gaps in your inferred information.
    -   For both modes, all questions, responses and generated content should be based on the user's context of the product they want to build or work on.
-   **Coverage Loop (CRITICAL):** Sections 2.1, 2.2, and 2.3 are not single-pass interviews. For each document, keep asking until every item in that document's **Coverage Checklist** is either answered or explicitly recorded as an assumption. A round is 2-4 related questions. In text chat, ask them sequentially, one per message; in a native modal or form, you may group them. Do not end a section just because you have asked one round.
-   **Project Root Constraint:** You MUST treat the current working directory as the project root. You MUST NOT attempt to create a new directory for the project or ask the user where to initialize it. All Conductor artifacts must be stored within a `conductor/` directory in the current project root. If you detect that the current directory is not suitable (e.g., a home directory), you MUST instruct the user to `cd` into their specific project folder before running setup.
-   **Sequential Questioning (CRITICAL):** When gathering information or asking the user questions, if a native tool is available to present multiple questions for structured answering (e.g., a modal or form tool), you may use it to group questions. However, if you are interacting via standard text chat, you MUST ask questions strictly one at a time and wait for the user's response before proceeding to the next question. Do NOT output multiple questions in a single chat response.

## 1. Project Audit & Initialization

Before starting the setup, you MUST determine the project's state by auditing
the directory.

### 1.1 Pre-Initialization Overview

Present a high-level overview to the user. Adapt the text to the user's stated intent (e.g., acknowledge if they specified a *new* project). Use clear, multi-line formatting.

Example (for a new project):
> "Welcome to Conductor. I will guide you through:
> 1. **Project Discovery:** Verifying this directory is ready for a new project.
> 2. **Product Definition:** Defining the vision and tech stack.
> 3. **Configuration:** Setting up code style guides and workflow.
> 4. **Track Generation:** Defining the first actionable track.
>
> Let's get started!"

### 1.2 Audit Artifacts & Resumption Check

Run the automated directory resumption script that lives next to this skill
(`scripts/resume.py`). Use `python3` when available, otherwise `python`. Resolve
the script relative to this `SKILL.md`, not relative to the project root.

Read the returned JSON object from `stdout`. **Do NOT mention the script name or path to the user.**

- If `upgrade_required` is `true`, or the user invoked `setup upgrade`, do **not** halt. Present a compatibility report and follow Section 2.8:
    - Detected schema version, missing Workflow Config, missing Tracks section, missing `.conductor/` ignore, and agent status.
    - Every track with legacy metadata or a non-v2 plan/spec as a migration warning; these do not by themselves make the environment incomplete after migration.
- If `setup_complete` is `true`, announce that the project is already initialized on the current version. If `track_issues` is non-empty, report them as legacy-track warnings and point to `conductor/migration-report.md`, then **HALT** execution.
- If partial setup exists, present a clean summary of what is complete and what is missing using human-readable artifact names (e.g., `tech-stack.md`). Do NOT use internal section numbers (e.g., avoid "Section 2.3").
- Identify the pending step from `next_step` (e.g., "Technology Stack"). If it is `Conductor Subagents`, resume at Section 2.7. If the only gaps are `tracks.md`, the Tracks section, or `.conductor/`, resume at Section 3 (Finalization).

## 2. Interactive Scaffolding & Context Gathering

Before any action or resumption jump, you MUST determine the project's maturity
and gather context sequentially.

1.  **Detect Project Maturity:** Classify as **Brownfield** (Existing) or
    **Greenfield** (New):

    -   **Brownfield Indicators:**
        -   Presence of dependency manifests (`package.json`, `go.mod`,
            `requirements.txt`, `pom.xml`, `Cargo.toml`).
        -   Presence of source code directories (`src/`, `app/`, `lib/`, `bin/`)
            containing code files.
        -   **Git Hygiene:** If a `.git` directory exists, execute `git status
            --porcelain`. Ignore changes within `conductor/` and `.conductor/`.
            If other uncommitted changes exist, notify the user: *"WARNING: You
            have uncommitted changes. Please commit or stash them before
            proceeding."* and classify as Brownfield.
    -   **Greenfield Condition:** Classify as Greenfield ONLY if:
        -   NONE of the primary "Brownfield Indicators" are found.
        -   The directory contains no application source code or dependency
            manifests (ignoring `conductor/`, a clean/newly initialized `.git`
            folder, and a `README.md`).

2.  **Execute Maturity Workflow:**

**If Brownfield:**

- **Request Permission:** Ask: *"A brownfield project has been detected. May I perform a read-only scan to analyze the architecture?"*
- **Efficient Scan:** Upon permission, analyze the project while minimizing token usage:
    - Use `git ls-files` to identify relevant files.
    - Respect `.gitignore` patterns.
    - Ignore common heavy directories (`node_modules`, `dist`, `build`).
    - For files >1MB, read only the first and last 20 lines.
    - Analyze `README.md` and manifests (`package.json`, `go.mod`, etc.) to extract the Tech Stack and Architecture.

**If Greenfield:**

- **Initialize Git:** If no `.git` folder exists, run `git init`.
- **Project Goal:** Ask the user: *"What do you want to build?"*
- **Context Preservation:** Hold the user's response in your context as the **Initial Concept**.

3.  **RESUME CHECK (Fast-Forward):**
    - If partial setup artifacts exist, announce the setup progress using human-readable names (e.g., "Technology Stack (`tech-stack.md`)"). Do NOT refer to internal section numbers.
    - Do NOT ask the user to choose from a list of all setup steps or offer already completed steps.
    - Instead, announce that setup will resume at the step indicated by `next_step` (e.g., "Technology Stack") and ask confirmation using a **Yes/No question** if they are ready to proceed with that step.
    - Proactively jump to the selected step upon approval. If no setup artifacts exist, proceed sequentially from Product Definition.

### 2.1 Product Definition (`product.md`)

Help the user define the product's vision, starting with the **Initial Concept** (Greenfield) or code analysis (Brownfield).

1.  **Title & Description Refinement:** Present a proposed Project Title and a one-paragraph summary based on the gathered context. Ask the user using a **Yes/No question** if this captures their vision.
2.  **Determine Mode:**
    -   **Greenfield:** Once the base description is approved, ask the user to choose the creation mode using a **single-choice question** with options: **Interactive** (Recommended: *the interview closes gaps that a generic draft would miss*) or **Autogenerate** (to draft a standard guide from the available context).
    -   **Brownfield:** Present the product draft inferred from the codebase and ask `Use inferred draft` or `Full interview` only when the user wants to restart. Do not ask the greenfield Interactive/Autogenerate question. Continue the coverage loop to close identified gaps.
    -   Autogenerate drafts from context and records every unanswered checklist item as an assumption; it does not skip the checklist.

**Coverage Checklist for `product.md`:**

- Problem the product solves
- Target users and personas
- Core use cases
- Goals and success metrics
- Core user flows
- Scope and non-goals
- Constraints (time, budget, team, compliance)
- Integrations and external dependencies
- Risks and unknowns
- Open questions

**Coverage Loop:**

1. Compare the checklist against what is already known from the Initial Concept or brownfield scan. Identify the highest-value unanswered items.
2. Ask a round of 2-4 related questions that close those items. Ask follow-ups when an answer is vague or internally inconsistent.
3. After each round, update the checklist. If an item is still unanswered after two attempts, record it as an **Assumption** with the reason.
4. Continue until every item is answered or recorded as an assumption. Do not stop after one round.
5. If the user later revises the product, reopen only the affected checklist items.

**Draft `product.md`:** Include the approved summary plus sections for Vision,
Target Users, Core Use Cases, Goals & Success Metrics, Core Flows, Scope &
Non-Goals, Constraints, Integrations, Risks, and **Open Questions & Assumptions**.

**Confirmation & Refinement Loop:**

1. Present the drafted `product.md` content to the user.
2. Ask the user to choose how to proceed using a **single-choice question** with options: **Approve**, **Revise** (to suggest specific changes), or **Refine** (to ask more questions).
3. **Refine** reopens the coverage loop for the affected items. **Revise** applies the requested edits, then repeats the approval question.
4. Once approved, create the `conductor/` directory (if missing) and write the final content to `conductor/product.md`.

### 2.2 Technology Stack (`tech-stack.md`)

Define and document the project's technology stack.

1.  **Determine Mode:**
    -   **Greenfield:** Ask the user to choose a mode using a **single-choice question**: **Interactive** (Recommended: *the stack is a long-lived decision*) or **Autogenerate** (to recommend a standard stack based on the product goal).
    -   **Brownfield:** State the technology stack inferred from the codebase analysis. Ask the user for confirmation using a **Yes/No question** if it is correct. If not, ask an **open question** for them to provide the correct stack.

**Coverage Checklist for `tech-stack.md`:**

- Languages and runtimes, including versions
- Frameworks and major libraries
- Package manager and build tooling
- Data stores and schemas
- External services and APIs
- Hosting and deployment target
- Test, coverage, lint, format, and typecheck tooling
- Local development environment (containers, env files, seed data)
- Constraints (licensing, compliance, cost, team skills)
- Rejected alternatives and why they were rejected
- Upgrade and maintenance policy
- Open questions

**Coverage Loop:** Use the same loop as Section 2.1. Infer what the repository
already proves; ask only about gaps. Record unanswered items as assumptions.

**Draft `tech-stack.md`:** Include the confirmed stack plus **Open Questions &
Assumptions**.

2.  **Confirmation & Refinement Loop:** Present the drafted stack to the user. Offer a **single-choice question** with options: **Approve**, **Manual Edit**, or **Refine** (to reopen the coverage loop).
3.  **Action:** Once approved, write the final content to `conductor/tech-stack.md`.

### 2.3 Product Guidelines (`product-guidelines.md`)

Help the user define branding, voice, tone, and UX principles.

1. **Determine Mode:**
   - **Greenfield:** Ask the user to choose a mode using a **single-choice question**: **Interactive** (Recommended: *guidelines are product-specific*) or **Autogenerate** (standard best practices).
   - **Brownfield:** Present the guidelines draft inferred from the product and codebase, then run the coverage loop for gaps. Offer a full interview only if the user asks for one.
2. **Coverage Checklist:** Adapt this list to the project type. Skip dimensions that do not apply and say why.

**Coverage Checklist for `product-guidelines.md`:**

- Voice and tone
- UX principles and interaction patterns
- Accessibility requirements
- Design system and component conventions
- Content style and terminology
- Platform conventions (web, mobile, desktop, CLI)
- Internationalization and localization
- Legal, privacy, and compliance requirements
- Open questions

**Coverage Loop:** Use the same loop as Section 2.1. Continue until every
applicable item is answered or recorded as an assumption.

3. **Draft `product-guidelines.md`:** Include the approved guidelines plus
   **Open Questions & Assumptions**.
4. **Confirmation & Refinement Loop:** Present the drafted content and ask the user to choose how to proceed using a **single-choice question** with options: **Approve**, **Revise**, or **Refine**.
5. **Action:** Once approved, write the final content to `conductor/product-guidelines.md`.

**Cross-Document Consistency Pass:** After all three documents are approved,
check them against each other. Examples: the product says offline-first but the
tech stack assumes a hosted database; the guidelines promise accessibility but
the stack has no testing tool for it. Surface contradictions and fix the
affected document before continuing.

### 2.4 Code Style Guides

Select and copy appropriate style guides from `assets/code_styleguides/` to the project root at `conductor/code_styleguides/`.

1. **Asset Constraint:** You MUST ONLY propose and copy guides from `assets/code_styleguides/`. Do NOT generate style rules from scratch.
2. **Recommendation:** Propose guides based on the Tech Stack confirmed in 2.2.
3. **Selection Mode:**
    - **Brownfield:** Propose matching guides and ask the user using a **Yes/No question** if additional ones are needed.
    - **Greenfield:** Present recommended guides or allow the user to hand-pick from the library using a **multiple-choice question**.
4. **Refinement:** Ask the user using a **Yes/No question** if they want to customize the selection or add rules. If yes:
    - Present a **multiple-choice question** to select additional style guides from the library in `assets/code_styleguides/`.
    - Ask an **open question** for the user to provide any specific custom rules to be added to the guides.
5. **Copy Action:** Execute the copy command once the selection is confirmed.

### 2.5 Workflow Configuration (`workflow.md`)

Configure the operational rules for the project. The workflow is now a filled,
project-specific document, not a generic copy.

1. **Infer the Project Profile:** Before asking, inspect the repository and the
   approved context. Determine:
    - Project type (web app, backend service, mobile app, CLI, library, monorepo
      package, etc.)
    - Languages, frameworks, and package manager
    - Exact setup, dev, test, coverage, lint, format, typecheck, and build
      commands
    - Repo layout and where source/tests live
    - CI configuration and deploy target
    - Existing test framework, coverage tool, and style tooling
2. **Present the Inference:** Show the inferred profile and flag anything you
   could not determine. Do not ask the user to re-supply facts the repository
   already proves.
3. **Choose Mode:** Ask the user to choose **Default** (accept the inferred
   facts and standard policies; still answer the project-specific gaps below) or
   **Customize** (review every field and change what is needed).
4. **Ask Only Gaps and Policies:** For either mode, ask about:
    - Coverage gate and whether it applies to new code or the whole project
    - Verification depth (which layers run per phase)
    - Commit message convention. The cadence is fixed by the phase model:
      task-level commits by the subagent and one squashed phase commit by the
      primary.
    - Evidence handling. The location and format are fixed: one committed report
      per phase under `conductor/tracks/<track-id>/verification/`, with large
      artifacts under `.conductor/evidence/`. Do not offer to relocate them.
    - Git base branch, whether to fetch before branching, branch push behavior,
      and PR policy: enabled, tool (`gh`/`glab`), and base branch
    - Review policy: strict mode, whether deferred findings become GitHub issues,
      minimum issue severity, whether Low findings are grouped, and issue labels
    - Documentation sync expectations
    - Release/deployment flow
    - Any project-specific verification steps
5. **Fill and Prune:** Read `assets/workflow.md`. Replace every placeholder
   with the confirmed values. Remove sections marked `OPTIONAL` that do not
   apply. Add or remove verification layers to match the project. Do not leave
   placeholder comments or generic examples in the final file.
6. **Verification Strategy:** Ensure the final `workflow.md` contains a
   `## Verification Strategy` section that covers:
    - Layers used by the project and their exact commands
    - Services, ports, fixtures, and environment setup
    - Pass criteria and coverage gate
    - Evidence format and the fixed evidence paths
    - Fallback ladder when a layer is unavailable
    - Retry limit (default: 2 attempts)
    - Human-only exceptions (credentials, hardware, external approvals)
7. **Explain and Write:** Explain that `workflow.md` defines the rules of the
   game for development, including how phases are verified. Write the final
   content to `conductor/workflow.md`.

### 2.6 Agent Skill Selection (Optional)

1. **Analyze Needs & Trust Model:**
    - Read the skill catalog from `assets/catalog.md` (relative to this skill's directory).
    - Analyze the project context (e.g., `product.md`, `tech-stack.md`) against the `Detection Signals` in the loaded `catalog.md` to identify relevant skills NOT yet installed.
    - **Trust Disclosure:** For each recommendation, disclose the `Party` status:
        - **1p (Official):** Present as an official skill from the source listed in the catalog.
        - **3p (Community):** Present as a third-party skill. Warn the user: *"Warning: This is a third-party skill. It is downloaded from the catalog URL and may change upstream. Review it before use."* Do not claim a commit pin unless the catalog URL contains one.

2. **Recommendation & Installation Loop:**
    - **Identify Recommendations:** If relevant missing skills are found, present them to the user, explaining their value for the project.
    - **User Approval:** Ask the user to select which recommended skills they would like to install using a **multiple-choice question**.
    - **Execute Installation:** Create `<skill_dir>/` and download the catalog URL to `<skill_dir>/SKILL.md`. Use the host's directory-creation and download tools; do not assume a Unix shell.
        - Default target: `.agents/skills/<skill_name>/`.
        - On OpenCode, use `.opencode/skills/<skill_name>/` instead.
        - `<URL>` is the full URL from the catalog (it already ends in `SKILL.md`). Do not append another filename.
    - **Verify:** Confirm that `SKILL.md` exists in the target directory and is not empty.
    - **If no missing skills found:** Skip this section.

3. **Environment Synchronization:**
    - **Execution Trigger:** This step MUST only be executed if new skills were installed in the previous step.
    - **Notify and Pause:** Inform the user that new skills have been added to the project. Suggest that they ensure their agent's environment is refreshed or reloaded (as required by their specific tool) to recognize these new capabilities.
    - **Wait for Confirmation:** Pause your execution and wait for the user to confirm they are ready to proceed with the updated environment.

### 2.7 Install Conductor Subagents (OpenCode)

Conductor ships two project-local subagent profiles:

- `conductor-phase` — executes one phase, verifies it, and returns a structured
  report.
- `conductor-reviewer` — reviews a track read-only and returns findings.

1. **Detect the Host:** Install these files only when the host is OpenCode.
   Detect it when running inside OpenCode (`OPENCODE`, `OPENCODE_SESSION_ID`,
   or `AI_AGENT=opencode` is set), or when the project root contains
   `.opencode/`, `opencode.json`, or `opencode.jsonc`. A project that uses only
   global OpenCode configuration has none of those files; the environment check
   covers that case. On other hosts, skip this section and note that
   `conductor-implement` and `conductor-review` will fall back to the host's
   general subagent.
2. **Check for Existing Files:** If `.opencode/agents/conductor-phase.md` or
   `.opencode/agents/conductor-reviewer.md` already exists, ask the user using a
   **single-choice question** whether to **Keep**, **Replace**, or **Back up and
   Replace**.
3. **Copy the Templates:** Copy `assets/agents/conductor-phase.md` and
   `assets/agents/conductor-reviewer.md` to `.opencode/agents/`. The phase
   template denies edits under `conductor/` but allows its own evidence file
   under `conductor/tracks/*/verification/` and artifacts under
   `.conductor/evidence/`. Keep both rules.
4. **Fill the Shell Allowlist:** Read the `## Workflow Config` block in the newly
   written `conductor/workflow.md`. In each agent file, replace the
   `PROJECT COMMANDS` or `PROJECT CHECKS` marker block with one `shell` allow
   rule per configured command. Use this shape:

    ```yaml
    - action: shell
      resource: "<command> *"
      effect: allow
    ```

    - `conductor-phase` gets every command the phase needs: setup, test,
      coverage, lint, format, typecheck, build, and `verify_phase`.
    - `conductor-reviewer` gets the read-only check commands: test, coverage,
      lint, format, typecheck, and build.
    - Do not add a blanket `shell: allow` rule. Keep the default deny.
5. **Verify:** Confirm both files exist and that each contains at least one
   project command rule. Do not leave a marker block in the final files.
6. **Record Capabilities:** When writing `conductor/index.md` in Section 3, add
   the agent links to the **Capabilities** section.

### 2.8 Upgrading from Conductor 1.x

Run this section when `upgrade_required` is `true` or the user invoked
`setup upgrade`. This is a migration, not a fresh interview. Preserve what the
project already decided.

If no `conductor/` artifacts exist, there is nothing to upgrade. Run the normal
Section 2 flow. If `upgrade_required` is `false` and the user forced
`setup upgrade`, the project is already on v2. Say so. Offer to regenerate
`workflow.md` or merge `index.md` only if the user wants that; otherwise cancel
without changing anything.

1. **Explain and Choose a Mode:** Explain that the existing `conductor/`
   directory is from an older Conductor version. Offer:
    - **Upgrade in place (Recommended):** keep the context docs and migrate the
      scaffolding and track metadata.
    - **Fresh start:** back up the old directory and run setup from the
      beginning.
    - **Cancel:** leave the project unchanged.

2. **Back Up Before Writing:** For either migrating mode, copy `conductor/` to
   `.conductor/backups/conductor-v1-<timestamp>/`. Create `.conductor/` and add
   it to `.gitignore` first if needed. Confirm the backup exists before
   modifying anything. The backup is local and is not committed.

3. **Preserve Context Documents:** Do not rewrite `product.md`,
   `tech-stack.md`, or `product-guidelines.md` by default.
    - If one is missing, run its section from Section 2.
    - If the user asks for a gap interview, run the relevant coverage checklist
      from Sections 2.1-2.3 and append only the missing answers.
    - Record any unanswered checklist items in the migration report as
      assumptions or open questions. Do not invent product decisions.

4. **Regenerate the Workflow:** Run Section 2.5 against the existing repository
   and context docs. The old `workflow.md` does not contain the Workflow Config
   or Verification Strategy required by the current skills. Write the new file.

5. **Merge the Index:** If `conductor/index.md` exists, update it in place:
    - Add `<!-- conductor-version: 2 -->` after the title if it is absent.
    - Ensure the `## Tracks` section links to `./tracks.md` and `./tracks/`.
    - Ensure the Capabilities section links only to artifacts that exist.
    - Preserve unknown sections, custom links, and user-authored notes. Do not
      replace the file with the template.
    If `index.md` is missing, write the template from Section 3.

6. **Scaffold and Ignore:** If missing, create `conductor/tracks.md` with
   `# Tracks` and a blank line, and `conductor/tracks/.gitkeep`. Ensure
   `.gitignore` contains `.conductor/`.

7. **Install Current Subagents:** Run Section 2.7. On a non-OpenCode host, note
   that the skills will fall back to the host's general subagent. If the user
   wants the optional project instructions, run Section 2.9 now and include
   `AGENTS.md` in the upgrade commit.

8. **Migrate Track Metadata Only:** For every
   `conductor/tracks/*/metadata.json`, preserve the existing fields and add any
   missing v2 fields:
    - `priority: "medium"`, `depends_on: []`
    - `spec: "spec.md"`, `plan: "plan.md"`
    - `branch: null`, `base_branch: "<configured base>"`, `base_sha: null`
    - `progress: { "phases_total": 0, "phases_verified": 0, "tasks_total": 0, "tasks_done": 0 }`
    - `last_checkpoint: null`
    - `review_verdict: null`, `review_rounds: 0`
    - `doc_sync: "pending"`
    - `pr_url: null`, `pr_state: null`, `merged_at: null`, `merge_commit: null`
    - `reverted_at: null`, `revert_commit: null`, `revert_pr_url: null`
    - `archived_at: null`, `archive_path: null`
    - `legacy: true`, `migrated_at: "<ISO timestamp>"`, `migrated_from: "1.x"`

   Mark every track whose metadata was incomplete or whose `spec.md`/`plan.md`
   does not use stable requirement IDs, phase contracts, and task IDs as
   `legacy: true`. Do **not** rewrite old specs or plans automatically. The
   conversion requires judgment, and a bad automatic rewrite is worse than an
   explicit recreate.

9. **Write the Migration Report:** Create `conductor/migration-report.md` from
   `assets/migration-report-template.md`. List every track, its status, what was
   missing, and the recommended action:
    - **Active legacy track:** recreate it with `conductor-new-track`, using the
      old `spec.md` as an import source, then convert or archive the old track.
    - **Completed legacy track:** keep it as historical, or recreate it only if
      the team wants the new review/evidence trail.
    - **Reverted/abandoned legacy track:** leave it marked `[-]`; do not revive
      it automatically.

10. **Commit the Upgrade:** Stage `conductor/`, `.gitignore` if changed,
    installed `.opencode/agents/` files, and `AGENTS.md` if the optional block
    was added. Do not stage `.conductor/backups/`. Commit:
    `conductor(setup): Upgrade Conductor to v2`.

11. **Explain the Limits:** Tell the user that legacy tracks are intentionally
    blocked by `conductor-implement`, `conductor-review`, and phase revert until
    they are recreated or manually repaired. `conductor-status` will show them
    as `legacy`. When a track is repaired, remove `legacy: true` from its
    metadata and update the plan/spec to the v2 contract.

**Fresh-start variant:** after the backup in step 2, do not run steps 3-10.
Instead run the normal Section 2 flow, including Section 2.9 if the user wants
the optional project instructions, then Section 3. The old directory remains in
`.conductor/backups/`; History in Git still contains the old files.

### 2.9 Optional Project Instructions (AGENTS.md)

Offer this only on OpenCode, using the same host detection as Section 2.7.
OpenCode loads `AGENTS.md` from the project root and parent directories. This is
an optional convenience, not a requirement.

1. **Ask:** Use a **single-choice question**:
    - **Add managed block (Recommended):** add the block below.
    - **Skip:** do not touch `AGENTS.md`.
    - **Show the block first:** display it, then ask again.
2. **Preserve Existing Content:** If `AGENTS.md` exists, preserve everything
   outside the markers. If it does not exist, create it with a short title.
3. **Managed Block:** insert or replace exactly this block:

    ```markdown
    <!-- conductor:start -->
    ## Conductor

    This project uses Conductor for spec-driven development.

    - Start with `conductor/index.md`.
    - Run `conductor-status` before proposing work.
    - Use `conductor-new-track` for new work, `conductor-implement` for
      execution, and `conductor-review` before a PR.
    - Treat `conductor/tracks/*/plan.md`, `metadata.json`, `tracks.md`, and
      `review.md` as Conductor state. Do not edit them outside the Conductor
      workflow.
    <!-- conductor:end -->
    ```
4. **Verify:** There is exactly one `<!-- conductor:start -->` pair, the markers
   are intact, and no unrelated content was removed.
5. **Commit:** Stage `AGENTS.md` in the Section 3 commit stage. Do not create the
   file when the user selects Skip.

---

## 3. The Handshake (Index Generation)

Create or merge `conductor/index.md`. This is the **Single Source of Truth** for all tools.

1.  **Explain:** Explain that the `index.md` is the "Handshake" of the project. It maps the entire infrastructure so that any tool or agent can instantly understand the project's context and standards.

2.  **Path Mapping:** If `conductor/index.md` already exists, update it in place:
    - Add the version marker if it is missing.
    - Ensure the Tracks and Capabilities sections exist.
    - Preserve unknown sections, custom links, and user-authored notes.
    - Do not replace the file wholesale.

    If it does not exist, write the following structure, linking to the artifacts you created. Include the "Capabilities" section only if you installed agent skills or Conductor subagents:

```markdown
# Project Context

<!-- conductor-version: 2 -->

## Definition

-   [Product Definition](./product.md)
-   [Product Guidelines](./product-guidelines.md)
-   [Tech Stack](./tech-stack.md)

## Workflow

-   [Workflow](./workflow.md)
-   [Code Style Guides](./code_styleguides/)

## Tracks

-   [Tracks Registry](./tracks.md)
-   [Tracks Directory](./tracks/)

## Capabilities

-   [Agent Skills](../.agents/skills/)
-   [Phase Executor](../.opencode/agents/conductor-phase.md)
-   [Reviewer](../.opencode/agents/conductor-reviewer.md)
```

Remove any Capabilities line that does not exist on disk. Use
`../.opencode/skills/` for the skills link when skills were installed there.

3.  **Create the Tracks Registry:** If `conductor/tracks.md` does not exist,
    create it with `# Tracks` and a blank line. Create `conductor/tracks/` with a
    `.gitkeep` file so the index link resolves. Ensure `conductor/index.md`
    contains the `## Tracks` section with links to `./tracks.md` and `./tracks/`.

4.  **Ignore Runtime State:** Ensure the project's `.gitignore` contains
    `.conductor/` (create the file if needed). Do not ignore `conductor/`.
    Runtime evidence, worktrees, and run state live under `.conductor/`.

5.  **Integrity Check:** You MUST verify the existence of all linked files on disk.

6.  **Commit Stage:** Stage the `conductor/` directory, `.gitignore` if you
    changed it, any installed Conductor subagents
    (`.opencode/agents/conductor-phase.md` and
    `.opencode/agents/conductor-reviewer.md`), and `AGENTS.md` if the optional
    block was added. Do not stage unrelated files. Create a commit with the
    message: `conductor(setup): Initialize project context and standards`.

## 4. Completion

Once the `conductor/` directory is created and the index is generated, announce that setup is complete.

**Next Steps:**

1. **Summary:** Present a final summary of the initialized scaffolding, including
   which verification layers and commands were configured.
2.  **Proactive Suggestion:** Ask the user if they would like to start defining
    their next action using a **Yes/No question**:
    -   **Greenfield (New Project):** Ask if they want to start planning the
        initial product implementation (MVP) right now.
    -   **Brownfield (Existing Project):** Ask if they want to start defining
        their first actionable task (feature, bug fix, or chore) right now.
3. **Internal Handoff:** If the user agrees, you MUST use the `conductor-new-track` skill to begin planning.
