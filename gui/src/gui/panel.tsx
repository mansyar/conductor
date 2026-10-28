import { For, Show, createEffect, createSignal } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import { ConductorRpc } from "../rpc.js"
import type { definition } from "./definition"

const ACCENT = "#7c9aff"
const STATE_COLOR: Record<string, string> = {
  complete: "#4ade80",
  reverted: "#8a8f98",
  in_progress: ACCENT,
  fixes: "#fbbf24",
  blocked: "#f87171",
  in_review: "#c084fc",
  pr_open: "#22d3ee",
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
  hasMetadata: boolean
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
  activeId: string | null
  tracks: Track[]
  skipped: number
}

async function fetchTracks(ctx: TrackContext, directory: string): Promise<TrackList> {
  const result = (await ctx.client.rpc(ConductorRpc).listTracks({ directory })) as unknown as {
    initialized: boolean
    activeId: string | null
    tracks: Track[]
    skipped: number
  }

  return result.initialized
    ? {
        initialized: true,
        activeId: result.activeId,
        tracks: result.tracks,
        skipped: result.skipped ?? 0,
      }
    : { initialized: false, activeId: null, tracks: [], skipped: 0 }
}

type TrackContext = ReturnType<typeof usePlugin<typeof definition>>

const container: Record<string, string> = {
  display: "flex",
  "flex-direction": "column",
  gap: "10px",
  padding: "12px 14px 20px",
  "font-size": "13px",
  "line-height": "1.45",
}

const header: Record<string, string> = {
  display: "flex",
  "align-items": "center",
  gap: "8px",
}

const wordmark: Record<string, string> = {
  "font-size": "11px",
  "font-weight": "700",
  "letter-spacing": "0.14em",
  opacity: "0.55",
}

const countPill: Record<string, string> = {
  "font-size": "11px",
  "font-weight": "600",
  padding: "1px 8px",
  "border-radius": "999px",
  background: "rgba(127,127,127,0.14)",
  opacity: "0.85",
  "white-space": "nowrap",
}

const iconButton: Record<string, string> = {
  background: "transparent",
  border: "1px solid rgba(127,127,127,0.25)",
  "border-radius": "6px",
  color: "inherit",
  cursor: "pointer",
  "font-size": "12px",
  padding: "2px 9px",
  opacity: "0.75",
}

const ghostButton: Record<string, string> = {
  background: "transparent",
  border: "1px solid rgba(127,127,127,0.28)",
  "border-radius": "6px",
  color: "inherit",
  cursor: "pointer",
  "font-size": "12px",
  padding: "3px 11px",
  "white-space": "nowrap",
}

const primaryButton: Record<string, string> = {
  ...ghostButton,
  background: "rgba(124,154,255,0.16)",
  "border-color": "rgba(124,154,255,0.55)",
  "font-weight": "600",
}

const card: Record<string, string> = {
  display: "flex",
  "flex-direction": "column",
  gap: "7px",
  padding: "11px 13px",
  "border-radius": "10px",
  background: "rgba(127,127,127,0.08)",
  border: "1px solid rgba(127,127,127,0.16)",
}

const activeCard: Record<string, string> = {
  ...card,
  "border-left": `3px solid ${ACCENT}`,
}

const archivedCard: Record<string, string> = {
  ...card,
  padding: "8px 11px",
  gap: "5px",
  opacity: "0.92",
}

const titleRow: Record<string, string> = {
  display: "flex",
  gap: "8px",
  "align-items": "flex-start",
}

const titleText: Record<string, string> = {
  margin: "0",
  "font-size": "13px",
  "font-weight": "650",
  display: "-webkit-box",
  "-webkit-line-clamp": "2",
  "-webkit-box-orient": "vertical",
  overflow: "hidden",
}

const chip: Record<string, string> = {
  "font-size": "11px",
  "font-weight": "600",
  padding: "1px 8px",
  "border-radius": "999px",
  background: "rgba(127,127,127,0.14)",
  "white-space": "nowrap",
  "flex-shrink": "0",
}

const meta: Record<string, string> = {
  "font-size": "11.5px",
  opacity: "0.6",
  display: "flex",
  gap: "8px",
  "flex-wrap": "wrap",
}

const actions: Record<string, string> = {
  display: "flex",
  gap: "6px",
  "flex-wrap": "wrap",
}

const barTrack: Record<string, string> = {
  height: "4px",
  "border-radius": "2px",
  background: "rgba(127,127,127,0.22)",
  overflow: "hidden",
}

const sectionToggle: Record<string, string> = {
  ...ghostButton,
  display: "flex",
  "align-items": "center",
  gap: "6px",
  "align-self": "flex-start",
  "font-weight": "600",
}

const detailBox: Record<string, string> = {
  display: "flex",
  "flex-direction": "column",
  gap: "3px",
  padding: "8px 10px",
  "border-radius": "8px",
  background: "rgba(127,127,127,0.07)",
  "font-size": "12px",
}

function dot(state: string): string {
  return STATE_COLOR[state] ?? "rgba(127,127,127,0.6)"
}

export function TracksView(props: { directory: string; server: string }) {
  const ctx = usePlugin<typeof definition>()
  const [tracks, setTracks] = createSignal<TrackList | null>(null)
  const [failed, setFailed] = createSignal(false)
  const [loading, setLoading] = createSignal(false)

  // Ref identity is stable across identical payloads: Solid's <For> tracks
  // rows by reference, so a fresh object tree on every refresh would
  // re-render all rows (and flash the window) even when nothing changed.
  const load = async (directory: string) => {
    setLoading(true)
    try {
      const fresh = await fetchTracks(ctx, directory)
      setTracks((prev) => (JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  createEffect(() => {
    setTracks(null)
    setSelected(null)
    setDetailCache({})
    setDetailPending(null)
    load(props.directory)
  })
  const [selected, setSelected] = createSignal<string | null>(null)
  const [showArchived, setShowArchived] = createSignal(false)
  const [query, setQuery] = createSignal("")
  const [mode, setMode] = createSignal<"all" | "live" | "archived">("all")
  // Detail results are cached per track id with stable references: every
  // expansion otherwise swaps a large loader for fresh objects (a `gh`
  // network call can take seconds) and flashes the window.
  const [detailCache, setDetailCache] = createSignal<Record<string, Detail>>({})
  const [detailPending, setDetailPending] = createSignal<string | null>(null)

  createEffect(() => {
    const dir = props.directory
    const id = selected()

    if (!id || detailCache()[id] || detailPending() === id) return
    setDetailPending(id)
    ctx.client
      .rpc(ConductorRpc)
      .trackDetail({ directory: dir, id })
      .then((result) => {
        const d = result as unknown as Detail

        if (d && d.found) {
          setDetailCache((prev) => {
            const next = { ...prev, [id]: d }
            return JSON.stringify(prev[id]) === JSON.stringify(d) ? prev : next
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setDetailPending((cur) => (cur === id ? null : cur))
      })
  })

  const trigger = (prompt: string) => {
    // Prefer the mounted session's composer: the prompt lands as editable
    // text, nothing is sent. Without a mounted session, fall back to a
    // review-and-send draft.
    const screen = ctx.screen.current()

    if (screen) {
      const prior = screen.composer.text()
      const sep = prior !== "" && !prior.endsWith("\n") ? "\n" : ""
      screen.composer.insert(`${sep}${prompt}`)
      screen.composer.focus()
    } else {
      ctx.layout.draft({ server: props.server, directory: props.directory, prompt })
    }
  }

  const list = () => tracks()?.tracks ?? []
  const q = () => query().trim().toLowerCase()
  const matches = (t: Track) =>
    (mode() === "all" ||
      (mode() === "live" ? !t.archived : t.archived)) &&
    (q() === "" ||
      t.title.toLowerCase().includes(q()) ||
      t.id.toLowerCase().includes(q()))
  const allLive = () => list().filter((t) => !t.archived)
  const allArchived = () => list().filter((t) => t.archived)
  const live = () => allLive().filter(matches)
  const archived = () => allArchived().filter(matches)
  const filtering = () => q() !== "" || mode() !== "all"
  const visibleCount = () => live().length + archived().length
  const archOpen = () => showArchived() || q() !== ""
  const active = () => {
    const t = list().find((x) => x.id === tracks()?.activeId) ?? allLive()[0]
    return t && matches(t) ? t : undefined
  }

  const progressLine = (t: Track) =>
    t.hasMetadata
      ? `P${t.progress.phases_verified}/${t.progress.phases_total} · T${t.progress.tasks_done}/${t.progress.tasks_total}`
      : ctx.t("panel.noMetadata")

  const phasePct = (t: Track) =>
    t.progress.phases_total > 0
      ? Math.round((t.progress.phases_verified / t.progress.phases_total) * 100)
      : 0

  const buttons = (t: Track, primary: boolean) => (
    <div style={actions}>
      <button
        style={primary ? primaryButton : ghostButton}
        onClick={() => trigger(`conductor implement ${t.id}`)}
      >
        {ctx.t("panel.implement")}
      </button>
      <button style={ghostButton} onClick={() => trigger(`conductor status ${t.id}`)}>
        {ctx.t("panel.status")}
      </button>
      <Show when={t.pr_url}>
        <button style={ghostButton} onClick={() => ctx.system.openExternal(t.pr_url!)}>
          {ctx.t("panel.openPR")}
        </button>
        <button style={ghostButton} onClick={() => trigger(`conductor implement watch ${t.id}`)}>
          {ctx.t("panel.watch")}
        </button>
      </Show>
      <button
        style={ghostButton}
        onClick={() => setSelected((id) => (id === t.id ? null : t.id))}
      >
        {ctx.t("panel.detail")}
      </button>
    </div>
  )

  const detailView = (t: Track) => (
    <Show when={selected() === t.id}>
      <Show
        when={detailCache()[t.id]}
        fallback={
          <Show when={detailPending() === t.id}>
            <div style={detailBox}>
              <span style={meta}>{ctx.t("panel.detailLoading")}</span>
            </div>
          </Show>
        }
      >
        {(liveDetail) => (
          <div style={detailBox}>
            <For each={liveDetail().phases}>
              {(phase) => (
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ opacity: "0.55" }}>{phase.id}</span>
                  <span style={{ flex: "1" }}>{phase.name}</span>
                  <span style={{ color: dot(phase.status), "white-space": "nowrap" }}>
                    {phase.status}
                  </span>
                </div>
              )}
            </For>
            <Show when={liveDetail().pr}>
              {(pr) => (
                <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
                  <span>
                    PR: <strong>{pr().state}</strong>
                  </span>
                  <Show when={pr().mergeable}>
                    <span style={{ opacity: "0.7" }}>{pr().mergeable}</span>
                  </Show>
                  <span style={{ opacity: "0.7" }}>
                    {ctx.t("panel.checks")}: {pr().checks}
                  </span>
                </div>
              )}
            </Show>
          </div>
        )}
      </Show>
    </Show>
  )

  const ui = ctx.ui
  return (
    <div style={container}>
      <div style={header}>
        <span style={wordmark}>{ctx.t("panel.title").toUpperCase()}</span>
        <span style={countPill}>
          {filtering()
            ? `${visibleCount()} ${ctx.t("panel.matches")}`
            : `${list().length} · ${allLive().length} ${ctx.t("panel.live")}`}
        </span>
        <span style={{ flex: "1" }} />
        <button style={ghostButton} onClick={() => trigger("conductor implement cleanup")}>
          {ctx.t("panel.cleanup")}
        </button>
        <button
          style={{ ...iconButton, opacity: loading() ? "0.4" : "0.75" }}
          onClick={() => {
            if (!loading()) load(props.directory)
          }}
          title={ctx.t("panel.refresh")}
        >
          ⟳
        </button>
      </div>

      <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
        <input
          type="text"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder={ctx.t("panel.search")}
          style={{
            width: "100%",
            "box-sizing": "border-box",
            background: "rgba(127,127,127,0.1)",
            border: "1px solid rgba(127,127,127,0.25)",
            "border-radius": "8px",
            color: "inherit",
            "font-size": "12.5px",
            padding: "6px 10px",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "live", "archived"] as const).map((m) => (
            <button
              style={
                mode() === m
                  ? {
                      ...ghostButton,
                      "border-color": "rgba(124,154,255,0.55)",
                      background: "rgba(124,154,255,0.16)",
                      "font-weight": "600",
                    }
                  : ghostButton
              }
              onClick={() => setMode(m)}
            >
              {m === "all"
                ? ctx.t("panel.filterAll")
                : m === "live"
                  ? ctx.t("panel.filterLive")
                  : ctx.t("panel.filterArchived")}
            </button>
          ))}
        </div>
      </div>

      <Show when={loading() && !tracks()}>
        <ui.Loader size="large" />
      </Show>
      <Show when={failed()}>
        <p style={meta}>{ctx.t("panel.error")}</p>
      </Show>
      <Show when={!loading() && list().length === 0}>
        <p style={meta}>{ctx.t("panel.empty")}</p>
      </Show>
      <Show when={!loading() && list().length > 0 && visibleCount() === 0}>
        <p style={meta}>{ctx.t("panel.noMatches")}</p>
      </Show>
      <Show when={(tracks()?.skipped ?? 0) > 0}>
        <p style={meta}>
          {tracks()!.skipped} {ctx.t("panel.skipped")}
        </p>
      </Show>

      <Show when={active()}>
        {(t) => (
          <div style={activeCard}>
            <div style={titleRow}>
              <span style={{ color: dot(t().state), "font-size": "12px", "margin-top": "2px" }}>
                ●
              </span>
              <p style={{ ...titleText, "font-size": "13.5px" }}>{t().title}</p>
            </div>
            <div style={meta}>
              <span style={chip}>{t().state}</span>
              <Show when={t().type}>
                <span>{t().type}</span>
              </Show>
              <Show when={t().priority}>
                <span>{t().priority}</span>
              </Show>
              <span>{progressLine(t())}</span>
            </div>
            <Show when={t().hasMetadata && t().progress.phases_total > 0}>
              <div style={barTrack}>
                <div
                  style={{
                    height: "100%",
                    width: `${phasePct(t())}%`,
                    background: dot(t().state),
                    "border-radius": "2px",
                  }}
                />
              </div>
            </Show>
            <div style={{ ...meta, opacity: "0.85" }}>{t().nextAction}</div>
            {buttons(t(), true)}
            {detailView(t())}
          </div>
        )}
      </Show>

      <Show when={live().filter((t) => t.id !== active()?.id).length > 0}>
        <For each={live().filter((t) => t.id !== active()?.id)}>
          {(t) => (
            <div style={card}>
              <div style={titleRow}>
                <span style={{ color: dot(t.state), "font-size": "11px", "margin-top": "3px" }}>
                  ●
                </span>
                <p style={titleText}>{t.title}</p>
                <span style={{ flex: "1" }} />
                <span style={{ ...chip, color: dot(t.state) }}>{t.state}</span>
              </div>
              <div style={meta}>
                <Show when={t.type}>
                  <span>{t.type}</span>
                </Show>
                <Show when={t.priority}>
                  <span>{t.priority}</span>
                </Show>
                <span>{progressLine(t)}</span>
                <span>{t.nextAction}</span>
              </div>
              {buttons(t, false)}
              {detailView(t)}
            </div>
          )}
        </For>
      </Show>

      <Show when={archived().length > 0}>
        <button style={sectionToggle} onClick={() => setShowArchived((v) => !v)}>
          <span>{showArchived() ? "▾" : "▸"}</span>
          <span>
            {ctx.t("panel.archived")} · {archived().length}
          </span>
        </button>
        <Show when={archOpen()}>
          <For each={archived()}>
            {(t) => (
              <div style={archivedCard}>
                <div style={titleRow}>
                  <span style={{ color: dot(t.state), "font-size": "10px", "margin-top": "4px" }}>
                    ●
                  </span>
                  <p style={{ ...titleText, "font-size": "12.5px", "font-weight": "550" }}>
                    {t.title}
                  </p>
                </div>
                <div style={meta}>
                  <Show when={t.type}>
                    <span>{t.type}</span>
                  </Show>
                  <Show when={t.priority}>
                    <span>{t.priority}</span>
                  </Show>
                  <span>{progressLine(t)}</span>
                </div>
                <div style={actions}>
                  <button
                    style={ghostButton}
                    onClick={() => setSelected((id) => (id === t.id ? null : t.id))}
                  >
                    {ctx.t("panel.detail")}
                  </button>
                  <Show when={t.pr_url}>
                    <button style={ghostButton} onClick={() => ctx.system.openExternal(t.pr_url!)}>
                      {ctx.t("panel.openPR")}
                    </button>
                  </Show>
                </div>
                {detailView(t)}
              </div>
            )}
          </For>
        </Show>
      </Show>
    </div>
  )
}
