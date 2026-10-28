import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { Plugin } from "@opencode/plugin"
import { ConductorRpc } from "./rpc.js"

// Server part: live reads of conductor/tracks.md, conductor/tracks|archive/*/
// metadata.json + plan.md, and on-demand `gh pr view`.
//
// READ-ONLY CONTRACT (mirrors gui/README.md guardrails):
// - node:fs reads only, never writes.
// - git: `branch --show-current` only.
// - gh: `pr view` only (no create/merge/edit/comment).
// State derivation mirrors the skills: registry markers ([ ]/[~]/[x]/[-]),
// archive-is-storage, metadata progress as written by conductor-implement.

const execFileAsync = promisify(execFile)

const TRACK_LINE =
  /^- \[( |~|x|-)\] \*\*Track: (.+?)\*\* — \[(.+?)\]\(\.\/(tracks|archive)\/(.+?)\/index\.md\) — (\S+) — (\S+)\s*$/

const ID_SAFE = /^[0-9A-Za-z][0-9A-Za-z_-]*$/

const MARKER: Record<string, string> = {
  " ": "pending",
  "~": "active",
  x: "complete",
  "-": "reverted",
}

const NEXT_ACTION: Record<string, string> = {
  new: "Start implementation.",
  ready: "Start implementation.",
  in_progress: "Implement the next phase.",
  blocked: "Unblock the track.",
  in_review: "Review is running.",
  fixes: "Apply review fixes.",
  doc_sync: "Synchronize docs.",
  pr_open: "Watch CI, then merge.",
  complete: "Done.",
  reverted: "Reverted.",
  abandoned: "Abandoned.",
}

interface RegistryEntry {
  marker: string
  title: string
  id: string
  type: string
  priority: string
}

function parseRegistry(text: string): RegistryEntry[] {
  const entries: RegistryEntry[] = []

  for (const line of text.split(/\r?\n/)) {
    const m = TRACK_LINE.exec(line.trim())

    if (!m || !ID_SAFE.test(m[5])) continue

    entries.push({
      marker: MARKER[m[1]] ?? "pending",
      title: m[2],
      id: m[3],
      type: m[6],
      priority: m[7],
    })
  }

  return entries
}

async function readJson(file: string): Promise<Record<string, any> | null> {
  try {
    return JSON.parse(await readFile(file, "utf-8"))
  } catch {
    return null
  }
}

async function run(cmd: string, args: string[], cwd: string, timeout: number): Promise<string> {
  // windowsHide: without it every spawn flashes a console window on Windows
  // (one flash per git/gh call: tab open fires listTracks twice, session
  // switches re-fire it via the composer pill).
  const { stdout } = await execFileAsync(cmd, args, { cwd, timeout, windowsHide: true })

  return stdout.trim()
}

async function readTrackMeta(
  directory: string,
  id: string,
): Promise<Record<string, any> | null> {
  const inTracks = path.join(directory, "conductor", "tracks", id, "metadata.json")
  const inArchive = path.join(directory, "conductor", "archive", id, "metadata.json")

  return (await readJson(inTracks)) ?? (await readJson(inArchive))
}

function zeroProgress() {
  return { phases_total: 0, phases_verified: 0, tasks_total: 0, tasks_done: 0 }
}

// Branch lookups spawn a process (~100ms on Windows). Cache them briefly per
// directory: branch changes only on checkout, and the composer pill re-fires
// on every session switch, so uncached this is the hot-path cost.
const branchCache = new Map<string, { at: number; branch: string | null }>()
const BRANCH_TTL = 10_000

async function getBranch(directory: string): Promise<string | null> {
  const cached = branchCache.get(directory)

  if (cached && Date.now() - cached.at < BRANCH_TTL) return cached.branch

  let branch: string | null = null

  try {
    branch = await run("git", ["branch", "--show-current"], directory, 10_000)
  } catch {
    branch = null
  }

  branchCache.set(directory, { at: Date.now(), branch })

  return branch
}

export default Plugin.define({
  id: "conductor",
  async setup(ctx) {
    await ctx.rpc.register(ConductorRpc, {
      listTracks: async (input: unknown) => {
        const { directory } = input as { directory: string }
        let registry: string

        try {
          registry = await readFile(path.join(directory, "conductor", "tracks.md"), "utf-8")
        } catch {
          return { initialized: false, activeId: null, tracks: [] }
        }

        let currentBranch: string | null = null

        try {
          currentBranch = await getBranch(directory)
        } catch {
          currentBranch = null
        }

        const tracks = []

        for (const entry of parseRegistry(registry)) {
          const inTracks = path.join(directory, "conductor", "tracks", entry.id, "metadata.json")
          const inArchive = path.join(directory, "conductor", "archive", entry.id, "metadata.json")
          const archived = (await readJson(inTracks)) === null
          const metadata = archived ? await readJson(inArchive) : await readJson(inTracks)
          const progress = metadata?.progress ?? zeroProgress()

          tracks.push({
            id: entry.id,
            title: metadata?.title ?? entry.title,
            type: metadata?.type ?? entry.type,
            priority: metadata?.priority ?? entry.priority,
            marker: entry.marker,
            state: metadata?.status ?? "unknown",
            progress: {
              phases_total: progress.phases_total ?? 0,
              phases_verified: progress.phases_verified ?? 0,
              tasks_total: progress.tasks_total ?? 0,
              tasks_done: progress.tasks_done ?? 0,
            },
            branch: metadata?.branch ?? "",
            base_branch: metadata?.base_branch ?? "",
            pr_url: metadata?.pr_url ?? null,
            pr_state: metadata?.pr_state ?? null,
            archived,
            nextAction: NEXT_ACTION[metadata?.status] ?? "",
          })
        }

        const activeId =
          currentBranch !== null
            ? (tracks.find((t) => t.branch === currentBranch)?.id ?? null)
            : null

        return { initialized: true, activeId, tracks }
      },

      activeTrack: async (input: unknown) => {
        const { directory } = input as { directory: string }
        let registry: string

        try {
          registry = await readFile(path.join(directory, "conductor", "tracks.md"), "utf-8")
        } catch {
          return { initialized: false, activeId: null, progress: null }
        }

        const branch = await getBranch(directory)

        if (branch === null) return { initialized: true, activeId: null, progress: null }

        const entries = parseRegistry(registry)

        // Fast path: new-track branches are `<prefix>/<track-id>`.
        const tail = branch.split("/").pop() ?? ""
        let match = entries.find((candidate) => candidate.id === tail)
        let metadata: Record<string, any> | null = null

        // Fallback: match metadata branch fields (covers renamed branches).
        if (!match) {
          for (const candidate of entries) {
            const meta = await readTrackMeta(directory, candidate.id)

            if (meta?.branch === branch) {
              match = candidate
              metadata = meta
              break
            }
          }
        }

        if (!match) return { initialized: true, activeId: null, progress: null }

        metadata ??= await readTrackMeta(directory, match.id)
        const progress = metadata?.progress

        return {
          initialized: true,
          activeId: match.id,
          progress:
            typeof progress?.phases_total === "number" &&
            typeof progress?.phases_verified === "number"
              ? { phases_total: progress.phases_total, phases_verified: progress.phases_verified }
              : null,
        }
      },

      trackDetail: async (input: unknown) => {
        const { directory, id } = input as { directory: string; id: string }

        if (!ID_SAFE.test(id)) return { found: false, phases: [], pr: null }

        const trackDir = path.join(directory, "conductor", "tracks", id)
        const archiveDir = path.join(directory, "conductor", "archive", id)
        const metadata = (await readJson(path.join(trackDir, "metadata.json"))) ??
          (await readJson(path.join(archiveDir, "metadata.json")))

        if (!metadata) return { found: false, phases: [], pr: null }

        const base = (await readJson(path.join(trackDir, "metadata.json")))
          ? trackDir
          : archiveDir
        const phases: Array<{ id: string; name: string; status: string }> = []

        try {
          const plan = await readFile(path.join(base, metadata.plan ?? "plan.md"), "utf-8")
          let current: { id: string; name: string } | null = null

          for (const line of plan.split(/\r?\n/)) {
            const head = /^## (Phase [\w]+):\s*(.+?)\s*$/.exec(line.trim())

            if (head) {
              current = { id: head[1], name: head[2] }
              continue
            }

            const status = /^-\s*\*\*Status:\*\*\s*(\S+)/.exec(line.trim())

            if (status && current) {
              phases.push({ id: current.id, name: current.name, status: status[1] })
              current = null
            }
          }
        } catch {
          // No readable plan: phases stay empty, metadata still reported.
        }

        let pr: { state: string; mergeable: string | null; checks: string; url: string } | null =
          null

        if (typeof metadata.pr_url === "string" && metadata.pr_url.length > 0) {
          const url: string = metadata.pr_url

          try {
            const out = await run(
              "gh",
              ["pr", "view", url, "--json", "state,mergeable,reviewDecision,statusCheckRollup"],
              directory,
              20_000,
            )
            const view = JSON.parse(out) as {
              state?: string
              mergeable?: string | null
              reviewDecision?: string | null
              statusCheckRollup?: Array<{ conclusion?: string | null; status?: string | null }>
            }
            const rollup = view.statusCheckRollup ?? []
            let failing = 0
            let pending = 0
            let passing = 0

            for (const check of rollup) {
              if (check.conclusion === "SUCCESS" || check.conclusion === "NEUTRAL") passing++
              else if (
                check.status === "IN_PROGRESS" ||
                check.status === "QUEUED" ||
                check.status === "PENDING" ||
                check.status === "WAITING"
              )
                pending++
              else failing++
            }

            const checks =
              rollup.length === 0
                ? "none"
                : [
                    failing > 0 ? `${failing} failing` : null,
                    pending > 0 ? `${pending} pending` : null,
                    passing > 0 ? `${passing} passing` : null,
                  ]
                    .filter((part): part is string => part !== null)
                    .join(", ")

            pr = {
              state: view.state ?? metadata.pr_state ?? "unknown",
              mergeable: view.mergeable ?? null,
              checks,
              url,
            }
          } catch {
            pr = {
              state: metadata.pr_state ?? "unknown",
              mergeable: null,
              checks: "unknown",
              url,
            }
          }
        }

        return { found: true, phases, pr }
      },
    })
  },
})
