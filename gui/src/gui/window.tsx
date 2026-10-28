import { Command, ComposerPill, MenuItem, Panel, createLatest, type PanelTab } from "@opencode/plugin/gui"
import type { Plugin } from "@opencode/plugin/gui"
import { ConductorRpc } from "../rpc.js"
import type { definition } from "./definition"
import { TracksView } from "./panel"

// Window setup: live track data over RPC, pinned side tab, + menu shortcut,
// live composer pill. No conductor/** writes and no session driving here —
// only layout.draft, which the user reviews and sends.

interface ActiveInfo {
  initialized: boolean
  activeId: string | null
  progress: {
    phases_total: number
    phases_verified: number
  } | null
}

export const setup: Plugin.Setup<typeof definition> = (ctx) => {
  // Pill data stays cheap on session switches: one registry read plus the
  // active track's metadata, no full scan. The full list loads only when the
  // tab itself renders.
  const active = createLatest(
    () => ctx.sessions.current()?.directory,
    (directory, _signal) =>
      ctx.client
        .rpc(ConductorRpc)
        .activeTrack({ directory })
        .then((result) => result as unknown as ActiveInfo),
  )

  const tracksTab: PanelTab = {
    id: "tracks",
    get title() {
      return ctx.t("panel.title")
    },
    closable: "compact",
  }

  ctx.add(
    Command,
    (): Command => ({
      id: "tracks",
      title: ctx.t("command.tracks"),
      run: () => {
        const session = ctx.sessions.current()

        if (!session) {
          ctx.toast.show({ title: ctx.t("menu.noSession"), description: ctx.t("menu.noSessionDetail") })
          return
        }
        ctx.layout.toggle(`${ctx.id}:tracks`, session)
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

      if (!session) {
        ctx.toast.show({ title: ctx.t("menu.noSession"), description: ctx.t("menu.noSessionDetail") })
        return
      }
      ctx.layout.open(`${ctx.id}:tracks`, session)
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
      const live = active.latest

      if (!live?.activeId) return undefined

      const progress = live.progress

      return {
        label: progress
          ? `${live.activeId} · P${progress.phases_verified}/${progress.phases_total}`
          : live.activeId,
        title: ctx.t("title"),
        run: () => ctx.layout.open(`${ctx.id}:tracks`, input.session),
      }
    },
  })
}
