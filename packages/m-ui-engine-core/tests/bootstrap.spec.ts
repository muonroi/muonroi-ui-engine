import { describe, expect, it } from "vitest";
import { MUiEngineBootstrapper, MUiEngineValidationError, type MUiEngineManifest } from "../src/index.js";

function MCreateManifest(): MUiEngineManifest {
  return {
    schemaVersion: "mui.engine.v1",
    generatedAtUtc: new Date().toISOString(),
    userId: "00000000-0000-0000-0000-000000000001",
    tenantId: null,
    navigationGroups: [],
    screens: [
      {
        screenKey: "screen:dashboard",
        uiKey: "dashboard",
        title: "Dashboard",
        route: "/dashboard",
        isVisible: true,
        isEnabled: true,
        actionKeys: [],
        layout: {
          template: "default-page",
          areas: [{ areaKey: "main", purpose: "main", order: 0 }]
        },
        components: []
      }
    ],
    actions: [],
    dataSources: []
  };
}

describe("MUiEngineBootstrapper", () => {
  it("uses cache within ttl", async () => {
    let callCount = 0;
    const manifest = MCreateManifest();
    let now = 10_000;

    const bootstrapper = new MUiEngineBootstrapper({
      mManifestProvider: {
        MLoadCurrent: async () => {
          callCount += 1;
          return manifest;
        },
        MLoadByUserId: async () => manifest
      },
      mTtlMs: 1_000,
      mNow: () => now
    });

    const runtime1 = await bootstrapper.MLoadCurrentRuntime();
    const runtime2 = await bootstrapper.MLoadCurrentRuntime();

    expect(runtime1).toBe(runtime2);
    expect(callCount).toBe(1);

    now = 20_001;
    const runtime3 = await bootstrapper.MLoadCurrentRuntime();
    expect(runtime3).not.toBe(runtime1);
    expect(callCount).toBe(2);
  });

  it("throws validation error for incompatible manifest", async () => {
    const bootstrapper = new MUiEngineBootstrapper({
      mManifestProvider: {
        MLoadCurrent: async () =>
          ({
            ...MCreateManifest(),
            schemaVersion: "mui.engine.v0"
          }) as unknown as MUiEngineManifest,
        MLoadByUserId: async () => MCreateManifest()
      }
    });

    await expect(bootstrapper.MLoadCurrentRuntime()).rejects.toBeInstanceOf(MUiEngineValidationError);
  });

  it("emits telemetry events for cache and load", async () => {
    const events: string[] = [];
    const manifest = MCreateManifest();
    const bootstrapper = new MUiEngineBootstrapper({
      mManifestProvider: {
        MLoadCurrent: async () => manifest,
        MLoadByUserId: async () => manifest
      },
      mOnTelemetry: (event) => {
        events.push(event.kind);
      }
    });

    await bootstrapper.MLoadCurrentRuntime();
    await bootstrapper.MLoadCurrentRuntime();

    expect(events).toContain("cache_miss");
    expect(events).toContain("manifest_loaded");
    expect(events).toContain("cache_hit");
  });

  it("checks contract compatibility when provider exposes contract info", async () => {
    const manifest = MCreateManifest();
    const bootstrapper = new MUiEngineBootstrapper({
      mManifestProvider: {
        MLoadCurrent: async () => manifest,
        MLoadByUserId: async () => manifest,
        MLoadContractInfo: async () => ({
          runtimeSchemaVersion: "mui.engine.v1",
          supportedSchemaVersions: ["mui.engine.v1"],
          currentManifestEndpoint: "/api/v1/auth/ui-engine/current",
          userManifestEndpointTemplate: "/api/v1/auth/ui-engine/{userId}",
          generatedAtUtc: new Date().toISOString()
        })
      }
    });

    await expect(bootstrapper.MCheckContractCompatibility("mui.engine.v1")).resolves.toBe(true);
    await expect(bootstrapper.MCheckContractCompatibility("mui.engine.v2")).resolves.toBe(false);
  });

  it("resets cache when schema watcher emits schema change", async () => {
    let callCount = 0;
    let onChanged: ((event: { schemaHash?: string }) => void) | undefined;
    const manifest = MCreateManifest();
    const bootstrapper = new MUiEngineBootstrapper({
      mManifestProvider: {
        MLoadCurrent: async () => {
          callCount += 1;
          return manifest;
        },
        MLoadByUserId: async () => manifest
      },
      mSchemaWatcher: {
        MSubscribe: (handler) => {
          onChanged = handler;
          return () => undefined;
        }
      }
    });

    await bootstrapper.MLoadCurrentRuntime();
    await bootstrapper.MLoadCurrentRuntime();
    expect(callCount).toBe(1);

    onChanged?.({ schemaHash: "abc123" });
    await bootstrapper.MLoadCurrentRuntime();
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});
