import { Command, ComposerPill, MenuItem, Panel, createLatest, type PanelTab } from "@opencode/plugin/gui"
import type { Plugin } from "@opencode/plugin/gui"
import { ConductorRpc } from "../rpc.js"
import type { definition } from "./definition"
import { TracksView } from "./panel"

// Window setup: live track data over RPC, pinned side tab, + menu shortcut,
// live composer pill. No conductor/** writes and no session driving here —
// only layout.draft, which the user reviews and sends.

interface LiveTrack {
  id: string
  progress: {
    phases_total: number
    phases_verified: number
  }
}

interface LiveList {
  initialized: boolean
  activeId: string | null
  tracks: LiveTrack[]
}

export const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const tracks = createLatest(
    () => ctx.sessions.current()?.directory,
    (directory, _signal) =>
      ctx.client
        .rpc(ConductorRpc)
        .listTracks({ directory })
        .then((result) => result as unknown as LiveList),
  )

  const tracksTab: PanelTab = {
    id: "tracks",
    get title() {
      return ctx.t("panel.title")
    },
    pinned: true,
    closable: "compact",
    fallback: true,
  }

  ctx.add(
    Command,
    (): Command => ({
      id: "tracks",
      title: ctx.t("command.tracks"),
      run: () => {
        const session = ctx.sessions.current()

        if (session) ctx.layout.toggle(`${ctx.id}:tracks`, session)
      },
    }),
  )

  ctx.add(MenuItem, () => ({
    menu: "session.panel" as const,
    id: "tracks",
    title: ctx.t("menu.tracks"),
    icon: "file-tree" as const,
    run: () => {
      const session = ctx.sessions.current()

      if (session) ctx.layout.open(`${ctx.id}:tracks`, session)
    },
  }))

  ctx.add(Panel, {
    id: "tracks",
    region: "side",
    mobile: {
      get title() {
        return ctx.t("panel.title")
      },
      order: 45,
      kind: "menu",
      icon: "file-tree" as const,
    },
    list: (input) => (input.open.includes("tracks") ? [tracksTab] : []),
    render: (props) => (
      <TracksView directory={props.session.directory} server={props.session.server.id} />
    ),
  })

  ctx.add(ComposerPill, {
    id: "track",
    show: (input) => {
      const live = tracks.latest
      const active = live?.tracks.find((track) => track.id === live.activeId)

      if (!active) return undefined

      return {
        label: `${active.id} · P${active.progress.phases_verified}/${active.progress.phases_total}`,
        title: ctx.t("title"),
        run: () => ctx.layout.open(`${ctx.id}:tracks`, input.session),
      }
    },
  })
}
