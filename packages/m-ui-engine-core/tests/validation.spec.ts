import { describe, expect, it } from "vitest";
import { MAssertUiEngineManifest, MValidateUiEngineManifest } from "../src/index.js";
import type { MUiEngineManifest } from "../src/contracts.js";

function MCreateValidManifest(): MUiEngineManifest {
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
          areas: []
        },
        components: []
      }
    ],
    actions: [],
    dataSources: []
  };
}

describe("MValidateUiEngineManifest", () => {
  it("returns no issues for valid manifest", () => {
    const issues = MValidateUiEngineManifest(MCreateValidManifest());
    expect(issues).toHaveLength(0);
  });

  it("returns issues for invalid schema version and missing arrays", () => {
    const issues = MValidateUiEngineManifest({
      schemaVersion: "mui.engine.v0",
      screens: "invalid"
    });

    expect(issues.length).toBeGreaterThanOrEqual(4);
    expect(issues.some((issue) => issue.path === "schemaVersion")).toBe(true);
    expect(issues.some((issue) => issue.path === "navigationGroups")).toBe(true);
  });

  it("assert helper throws for invalid manifest", () => {
    expect(() => MAssertUiEngineManifest({ schemaVersion: "bad" })).toThrowError(
      "Invalid MUiEngineManifest"
    );
  });
});
