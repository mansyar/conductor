import { Plugin } from "@opencode/plugin"
import { ConductorRpc } from "./rpc.js"
import { STUB_ACTIVE_ID, STUB_TRACKS } from "./stub.js"

// Server part (stub): registers the RPC with static preview data.
// Phase 2 replaces the bodies with reads of conductor/tracks.md,
// conductor/tracks|archive/*/metadata.json, and `gh pr view` on demand.
// Read-only: this file must never write conductor/** or run gh write commands.

export default Plugin.define({
  id: "conductor",
  async setup(ctx) {
    await ctx.rpc.register(ConductorRpc, {
      listTracks: async () => ({
        initialized: true,
        activeId: STUB_ACTIVE_ID,
        tracks: STUB_TRACKS,
      }),
      trackDetail: async (input) => {
        const { id } = input as { id: string }
        const track = STUB_TRACKS.find((t) => t.id === id)

        if (!track) return { found: false, phases: [], pr: null }

        return {
          found: true,
          phases: [],
          pr: track.pr_url
            ? { state: track.pr_state ?? "unknown", mergeable: null, checks: "unknown", url: track.pr_url }
            : null,
        }
      },
    })
  },
})
