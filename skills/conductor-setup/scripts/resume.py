"""Determines setup or upgrade state and the next unblocked step."""

import json
import os
import re
import sys

SCHEMA_VERSION = 2
CONDUCTOR_DIR = "conductor"
CORE_FILES = [
    "product.md",
    "tech-stack.md",
    "product-guidelines.md",
    "code_styleguides",
    "workflow.md",
    "tracks.md",
    "index.md",
]
VERSION_RE = re.compile(r"conductor[-_ ]?version\s*:\s*(\d+)", re.IGNORECASE)
TRACK_FIELDS = [
    "branch",
    "base_branch",
    "base_sha",
    "progress",
    "review_verdict",
    "doc_sync",
]


def _read(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            return handle.read()
    except OSError:
        return ""


def _load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return None


def _has_runtime_ignore():
    lines = [line.strip() for line in _read(".gitignore").splitlines()]
    return any(
        line
        and not line.startswith("#")
        and line.lstrip("/").rstrip("/") == ".conductor"
        for line in lines
    )


def _is_opencode_project():
    return bool(
        os.path.isdir(".opencode")
        or os.path.isfile("opencode.json")
        or os.path.isfile("opencode.jsonc")
    )


def _track_issues():
    """Returns legacy or incomplete v2 tracks found under conductor/tracks/."""
    tracks_dir = os.path.join(CONDUCTOR_DIR, "tracks")
    if not os.path.isdir(tracks_dir):
        return []

    issues = []
    for name in sorted(os.listdir(tracks_dir)):
        track_dir = os.path.join(tracks_dir, name)
        metadata_path = os.path.join(track_dir, "metadata.json")
        if not os.path.isfile(metadata_path):
            continue

        metadata = _load_json(metadata_path) or {}
        missing = [field for field in TRACK_FIELDS if field not in metadata]
        plan_text = _read(os.path.join(track_dir, "plan.md"))
        spec_text = _read(os.path.join(track_dir, "spec.md"))
        plan_v2 = "**Status:**" in plan_text and "covers:" in plan_text
        spec_v2 = "AC-" in spec_text

        if missing or not plan_v2 or not spec_v2:
            issues.append(
                {
                    "id": metadata.get("id", name),
                    "path": os.path.join(CONDUCTOR_DIR, "tracks", name),
                    "missing_metadata": missing,
                    "plan_v2": plan_v2,
                    "spec_v2": spec_v2,
                }
            )
    return issues


def determine_resumption():
    """Checks existing setup artifacts and returns the next unblocked step."""
    checklist = {
        filename: os.path.exists(os.path.join(CONDUCTOR_DIR, filename))
        for filename in CORE_FILES
    }

    index_text = _read(os.path.join(CONDUCTOR_DIR, "index.md"))
    workflow_text = _read(os.path.join(CONDUCTOR_DIR, "workflow.md"))

    version_match = VERSION_RE.search(index_text)
    schema_version = int(version_match.group(1)) if version_match else None
    has_workflow_config = "## Workflow Config" in workflow_text
    has_tracks_section = (
        "## Tracks" in index_text and "tracks.md" in index_text
    )
    has_runtime_ignore = _has_runtime_ignore()
    opencode_detected = _is_opencode_project()
    agents_installed = all(
        os.path.exists(path)
        for path in (
            os.path.join(".opencode", "agents", "conductor-phase.md"),
            os.path.join(".opencode", "agents", "conductor-reviewer.md"),
        )
    )
    track_issues = _track_issues()

    # A missing version marker on an existing index means this is a pre-v2
    # project. A v1 workflow without an index marker is also legacy. A v2
    # partial setup that has not written the index yet is not.
    legacy = bool(
        (checklist["index.md"] and schema_version != SCHEMA_VERSION)
        or (checklist["workflow.md"] and not has_workflow_config)
    )
    upgrade_required = bool(legacy)

    setup_complete = bool(
        all(checklist.values())
        and schema_version == SCHEMA_VERSION
        and has_workflow_config
        and has_tracks_section
        and has_runtime_ignore
        and (not opencode_detected or agents_installed)
    )

    next_step = None
    if upgrade_required:
        next_step = {
            "step": "Upgrade Legacy Conductor",
            "file": "conductor/index.md",
        }
    elif opencode_detected and not agents_installed:
        next_step = {
            "step": "Conductor Subagents",
            "file": ".opencode/agents/conductor-phase.md",
        }
    elif not setup_complete:
        chain = [
            ("product.md", "Product Definition"),
            ("tech-stack.md", "Technology Stack"),
            ("product-guidelines.md", "Product Guidelines"),
            ("code_styleguides", "Code Style Guides"),
            ("workflow.md", "Workflow Configuration"),
            ("tracks.md", "Tracks Registry"),
            ("index.md", "Index & Finalization"),
        ]
        for filename, step_name in chain:
            if not checklist[filename]:
                next_step = {"step": step_name, "file": filename}
                break
        if next_step is None:
            next_step = {
                "step": "Index & Finalization",
                "file": "conductor/index.md",
            }

    return {
        "setup_complete": setup_complete,
        "upgrade_required": upgrade_required,
        "schema_version": schema_version,
        "checks": {
            "workflow_config": has_workflow_config,
            "tracks_section": has_tracks_section,
            "runtime_ignore": has_runtime_ignore,
            "opencode_detected": opencode_detected,
            "agents_installed": agents_installed,
            "track_issues": track_issues,
        },
        "checklist": checklist,
        "next_step": next_step,
    }


if __name__ == "__main__":
    print(json.dumps(determine_resumption(), indent=2))
    sys.exit(0)
