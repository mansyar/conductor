import { For, Show } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "./definition"
import type { StubTrack } from "../stub"

const MARKER: Record<string, string> = {
  pending: "○",
  active: "◐",
  complete: "●",
  reverted: "✕",
}

export function TracksView(props: { tracks: StubTrack[]; directory: string; server: string }) {
  const ctx = usePlugin<typeof definition>()
  const draft = (prompt: string) => ctx.layout.draft({ server: props.server, directory: props.directory, prompt })

  return (
    <div>
      <p>{ctx.t("panel.stub")}</p>
      <Show when={props.tracks.length === 0} fallback={
        <For each={props.tracks}>
          {(track) => (
            <div>
              <span>{MARKER[track.marker] ?? "?"}</span>
              <strong>{track.title}</strong>
              <span>{track.state}</span>
              <span>
                P{track.progress.phases_verified}/{track.progress.phases_total}
              </span>
              <span>{track.nextAction}</span>
              <Show when={track.pr_url}>
                <button onClick={() => ctx.system.openExternal(track.pr_url!)}>{ctx.t("panel.openPR")}</button>
              </Show>
              <button onClick={() => draft(`conductor implement ${track.id}`)}>{ctx.t("panel.implement")}</button>
              <button onClick={() => draft(`conductor status ${track.id}`)}>{ctx.t("panel.status")}</button>
            </div>
          )}
        </For>
      }>
        <p>{ctx.t("panel.empty")}</p>
      </Show>
    </div>
  )
}
