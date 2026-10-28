import { Command, ComposerPill, Panel, type PanelTab } from "@opencode/plugin/gui"
import type { Plugin } from "@opencode/plugin/gui"
import type { definition } from "./definition"
import { TracksView } from "./panel"
import { STUB_ACTIVE_ID, STUB_TRACKS } from "../stub"

// Window setup (stub): renders STUB_TRACKS. Phase 2 replaces the static
// imports with ctx.client.rpc(ConductorRpc) calls keyed on the session
// directory. No conductor/** writes and no session driving here — only
// layout.draft, which the user reviews and sends.

export const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const tracksTab: PanelTab = {
    id: "tracks",
    get title() {
      return ctx.t("panel.title")
    },
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

  ctx.add(Panel, {
    id: "tracks",
    region: "side",
    mobile: {
      get title() {
        return ctx.t("panel.title")
      },
      order: 45,
      kind: "menu",
      icon: "file-tree",
    },
    list: (input) => (input.open.includes("tracks") ? [tracksTab] : []),
    render: (props) => (
      <TracksView tracks={STUB_TRACKS} directory={props.session.directory} server={props.session.server.id} />
    ),
  })

  ctx.add(ComposerPill, {
    id: "track",
    show: (input) => {
      const active = STUB_TRACKS.find((t) => t.id === STUB_ACTIVE_ID)

      if (!active) return undefined

      return {
        label: `${active.id} · P${active.progress.phases_verified}/${active.progress.phases_total}`,
        title: ctx.t("title"),
        run: () => ctx.layout.open(`${ctx.id}:tracks`, input.session),
      }
    },
  })
}
