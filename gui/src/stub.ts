// STUB DATA — static preview tracks for the scaffold. Phase 2 (RPC wiring)
// deletes this file and reads conductor/tracks.md + metadata.json instead.

export interface StubTrack {
  id: string
  title: string
  type: string
  priority: string
  marker: "pending" | "active" | "complete" | "reverted"
  state: string
  progress: {
    phases_total: number
    phases_verified: number
    tasks_total: number
    tasks_done: number
  }
  branch: string
  base_branch: string
  pr_url: string | null
  pr_state: string | null
  archived: boolean
  nextAction: string
}

export const STUB_TRACKS: StubTrack[] = [
  {
    id: "20261026-gui-spike",
    title: "GUI spike",
    type: "feature",
    priority: "high",
    marker: "active",
    state: "in_progress",
    progress: { phases_total: 3, phases_verified: 1, tasks_total: 9, tasks_done: 4 },
    branch: "feat/20261026-gui-spike",
    base_branch: "main",
    pr_url: null,
    pr_state: null,
    archived: false,
    nextAction: "Implement phase 2.",
  },
  {
    id: "20261020-ci-watch",
    title: "CI watch",
    type: "feature",
    priority: "medium",
    marker: "complete",
    state: "pr_open",
    progress: { phases_total: 2, phases_verified: 2, tasks_total: 6, tasks_done: 6 },
    branch: "feat/20261020-ci-watch",
    base_branch: "main",
    pr_url: "https://github.com/example/repo/pull/42",
    pr_state: "open",
    archived: true,
    nextAction: "Watch CI, then merge.",
  },
]

export const STUB_ACTIVE_ID = "20261026-gui-spike"
