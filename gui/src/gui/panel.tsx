import { For, Show, createResource, createSignal } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import { ConductorRpc } from "../rpc.js"
import type { definition } from "./definition"

const MARKER: Record<string, string> = {
  pending: "○",
  active: "◐",
  complete: "●",
  reverted: "✕",
}

interface Progress {
  phases_total: number
  phases_verified: number
  tasks_total: number
  tasks_done: number
}

interface Track {
  id: string
  title: string
  type: string
  priority: string
  marker: string
  state: string
  progress: Progress
  branch: string
  base_branch: string
  pr_url: string | null
  pr_state: string | null
  archived: boolean
  nextAction: string
}

interface Phase {
  id: string
  name: string
  status: string
}

interface Detail {
  found: boolean
  phases: Phase[]
  pr: { state: string; mergeable: string | null; checks: string; url: string } | null
}

interface TrackList {
  initialized: boolean
  tracks: Track[]
  skipped: number
}

async function fetchTracks(ctx: TrackContext, directory: string): Promise<TrackList> {
  const result = (await ctx.client.rpc(ConductorRpc).listTracks({ directory })) as unknown as {
    initialized: boolean
    tracks: Track[]
    skipped: number
  }

  return result.initialized
    ? { initialized: true, tracks: result.tracks, skipped: result.skipped ?? 0 }
    : { initialized: false, tracks: [], skipped: 0 }
}

type TrackContext = ReturnType<typeof usePlugin<typeof definition>>

export function TracksView(props: { directory: string; server: string }) {
  const ctx = usePlugin<typeof definition>()
  const ui = ctx.ui
  const [tracks] = createResource(() => props.directory, (dir) => fetchTracks(ctx, dir))
  const [selected, setSelected] = createSignal<string | null>(null)
  const [detail] = createResource(selected, async (id) => {
    if (!id) return null

    const result = (await ctx.client
      .rpc(ConductorRpc)
      .trackDetail({ directory: props.directory, id })) as unknown as Detail

    return result.found ? result : null
  })

  const draft = (prompt: string) =>
    ctx.layout.draft({ server: props.server, directory: props.directory, prompt })

  const row: Record<string, string> = {
    display: "flex",
    "flex-direction": "column",
    gap: "2px",
    padding: "6px 0",
    "border-bottom": "1px solid var(--border, #333)",
  }

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "4px", padding: "4px 8px" }}>
      <Show when={tracks.loading}>
        <ui.Loader size="large" />
      </Show>
      <Show when={tracks.error}>
        <p>{ctx.t("panel.error")}</p>
      </Show>
      <Show when={tracks()?.tracks.length === 0}>
        <p>{ctx.t("panel.empty")}</p>
      </Show>
      <Show when={(tracks()?.skipped ?? 0) > 0}>
        <p>
          {tracks()!.skipped} {ctx.t("panel.skipped")}
        </p>
      </Show>
      <For each={tracks()?.tracks ?? []}>
        {(track) => (
          <div style={row}>
            <div style={{ display: "flex", gap: "6px", "align-items": "baseline" }}>
              <span>{MARKER[track.marker] ?? "?"}</span>
              <strong>{track.title}</strong>
              <span>
                {track.state}
                {track.archived ? ` · ${ctx.t("panel.archived")}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <span>
                P{track.progress.phases_verified}/{track.progress.phases_total}
              </span>
              <span>
                T{track.progress.tasks_done}/{track.progress.tasks_total}
              </span>
              <span>{track.nextAction}</span>
            </div>
            <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
              <button onClick={() => setSelected((id) => (id === track.id ? null : track.id))}>
                {ctx.t("panel.detail")}
              </button>
              <Show when={track.pr_url}>
                <button onClick={() => ctx.system.openExternal(track.pr_url!)}>
                  {ctx.t("panel.openPR")}
                </button>
              </Show>
              <button onClick={() => draft(`conductor implement ${track.id}`)}>
                {ctx.t("panel.implement")}
              </button>
              <button onClick={() => draft(`conductor status ${track.id}`)}>
                {ctx.t("panel.status")}
              </button>
            </div>
            <Show when={selected() === track.id}>
              <Show when={detail.loading}>
                <ui.Loader size="large" />
              </Show>
              <Show when={detail()}>
                {(live) => (
                  <div style={{ display: "flex", "flex-direction": "column", gap: "2px" }}>
                    <For each={live().phases}>
                      {(phase) => (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <span>{phase.id}</span>
                          <span>{phase.name}</span>
                          <span>{phase.status}</span>
                        </div>
                      )}
                    </For>
                    <Show when={live().pr}>
                      {(pr) => (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <span>PR: {pr().state}</span>
                          <Show when={pr().mergeable}>
                            <span>{pr().mergeable}</span>
                          </Show>
                          <span>{ctx.t("panel.checks")}: {pr().checks}</span>
                        </div>
                      )}
                    </Show>
                  </div>
                )}
              </Show>
            </Show>
          </div>
        )}
      </For>
    </div>
  )
}
