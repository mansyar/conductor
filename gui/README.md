# conductor-gui (spike, read-only)

OpenCode Desktop GUI plugin for Conductor: a tracks side panel and a composer
pill for the active track. Built on the experimental `gui-experimental` API —
expect maintenance when the SDK stabilizes.

## Status

Scaffold with static preview data (`src/stub.ts`). The panel renders, the pill
renders, the command toggles the panel. No live data yet.

## Guardrails (non-negotiable)

1. No writes to `conductor/**` from any plugin code, GUI or server.
2. No session driving — only `layout.draft` (the user reviews and sends).
3. State derivation mirrors the skills (markers, archive-is-storage,
   `[x]`-keeps-line). Divergence is a plugin bug, never fixed by writing metadata.
4. `listTracks` stays local-only (files + `git branch --show-current`); the only
   network call is `trackDetail`'s PR lookup, on demand.

## Build

```bash
cd gui
npm install
npm run build   # emits dist/gui-experimental.cjs (gitignored)
```

## Install (local directory)

```jsonc title="opencode.jsonc"
{
  "plugin": ["D:/Projects/conductor/gui"],
}
```

Rebuild with `npm run dev` (`vite build --watch`); the desktop app reloads the
GUI in every window on each rebuild.

## Roadmap

- Phase 2: replace `stub.ts` with RPC reads of `conductor/tracks.md`,
  `conductor/tracks|archive/*/metadata.json`, and on-demand `gh pr view`.
- Later: commands with keybinds, Workflow Config settings page.
- Much later, if ever: merge-approval dialog (skill stays the gate).
