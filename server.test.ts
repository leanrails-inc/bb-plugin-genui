import { describe, expect, it } from "vitest";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { agentInstructions } from "./instructions";
import plugin from "./server";

type ConfigureCallback = (context: unknown) => { instructions?: string };

/** A BB whose saved settings arrive only after `release()`, like a cold settings store. */
function fakeBb(saved: Record<string, unknown>) {
  let release!: () => void;
  const loaded = new Promise<void>((resolve) => (release = resolve));
  let configure: ConfigureCallback | null = null;
  const noop = () => {};
  const bb = {
    settings: {
      define: (defs: Record<string, { default: unknown }>) => ({
        get: async () => {
          await loaded;
          return Object.fromEntries(Object.entries(defs).map(([key, def]) => [key, saved[key] ?? def.default]));
        },
        onChange: noop,
      }),
    },
    agents: {
      registerTool: noop,
      configure: (callback: ConfigureCallback) => void (configure = callback),
      contributeInstructions: noop,
    },
    rpc: { register: noop },
    cli: { register: noop },
    sdk: {},
    storage: { kv: {} },
  } as unknown as BbPluginApi;
  const context = { pluginMetadata: { audience: "person" }, thread: { id: "thr_1", parentThreadId: null }, origin: { pluginId: null } };
  return { bb, release, configuredInstructions: () => configure!(context).instructions };
}

describe("plugin factory", () => {
  // A session resolved right after startup must not get the proactive text while the saved style is still loading.
  it("loads the saved interactionStyle before registering configure", async () => {
    const { bb, release, configuredInstructions } = fakeBb({ interactionStyle: "visual-only", webLookups: true });
    const starting = plugin(bb);
    release();
    await starting;
    expect(configuredInstructions()).toBe(agentInstructions("visual-only", true));
  });
});
