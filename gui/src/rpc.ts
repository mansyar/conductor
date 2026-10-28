import { Rpc } from "@opencode/plugin/rpc"
import type { JsonSchema } from "effect"

const trackSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    type: { type: "string" },
    priority: { type: "string" },
    marker: { type: "string" },
    state: { type: "string" },
    progress: {
      type: "object",
      properties: {
        phases_total: { type: "number" },
        phases_verified: { type: "number" },
        tasks_total: { type: "number" },
        tasks_done: { type: "number" },
      },
      required: ["phases_total", "phases_verified", "tasks_total", "tasks_done"],
      additionalProperties: false,
    },
    branch: { type: "string" },
    base_branch: { type: "string" },
    pr_url: { type: ["string", "null"] },
    pr_state: { type: ["string", "null"] },
    archived: { type: "boolean" },
    nextAction: { type: "string" },
  },
  required: [
    "id",
    "title",
    "type",
    "priority",
    "marker",
    "state",
    "progress",
    "branch",
    "base_branch",
    "pr_url",
    "pr_state",
    "archived",
    "nextAction",
  ],
  additionalProperties: false,
} as const satisfies JsonSchema.JsonSchema

export const ConductorRpc = Rpc.define({
  id: "conductor",
  methods: {
    listTracks: {
      input: {
        type: "object",
        properties: { directory: { type: "string" } },
        required: ["directory"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          initialized: { type: "boolean" },
          activeId: { type: ["string", "null"] },
          tracks: { type: "array", items: trackSchema },
        },
        required: ["initialized", "activeId", "tracks"],
        additionalProperties: false,
      },
    },
    activeTrack: {
      input: {
        type: "object",
        properties: { directory: { type: "string" } },
        required: ["directory"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          initialized: { type: "boolean" },
          activeId: { type: ["string", "null"] },
          progress: {
            type: ["object", "null"],
            properties: {
              phases_total: { type: "number" },
              phases_verified: { type: "number" },
            },
            required: ["phases_total", "phases_verified"],
            additionalProperties: false,
          },
        },
        required: ["initialized", "activeId", "progress"],
        additionalProperties: false,
      },
    },
    trackDetail: {      input: {
        type: "object",
        properties: {
          directory: { type: "string" },
          id: { type: "string" },
        },
        required: ["directory", "id"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          found: { type: "boolean" },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                status: { type: "string" },
              },
              required: ["id", "name", "status"],
              additionalProperties: false,
            },
          },
          pr: {
            type: ["object", "null"],
            properties: {
              state: { type: "string" },
              mergeable: { type: ["string", "null"] },
              checks: { type: "string" },
              url: { type: "string" },
            },
            required: ["state", "checks", "url"],
            additionalProperties: false,
          },
        },
        required: ["found", "phases", "pr"],
        additionalProperties: false,
      },
    },
  },
  events: {},
} as const)
