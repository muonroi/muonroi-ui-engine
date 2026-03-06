import { describe, expect, it } from "vitest";
import {
  MBuildRenderPlan,
  MDefaultUiRenderAdapter,
  MUiEngineRuntime,
  type MUiEngineManifest,
  type MUiEngineScreen,
  MCanExecuteAction
} from "../src/index.js";

const mManifest: MUiEngineManifest = {
  schemaVersion: "mui.engine.v1",
  generatedAtUtc: new Date().toISOString(),
  userId: "00000000-0000-0000-0000-000000000001",
  tenantId: null,
  componentRegistry: {
    components: {}
  },
  navigationGroups: [
    {
      groupName: "ops",
      groupDisplayName: "Operations",
      items: [
        {
          nodeKey: "node:ops",
          uiKey: "ops",
          title: "Operations",
          route: "/ops",
          type: "menu",
          order: 1,
          isVisible: true,
          isEnabled: true,
          actionKeys: ["action:ops-task-run"],
          children: []
        },
        {
          nodeKey: "node:hidden",
          uiKey: "hidden",
          title: "Hidden",
          route: "/hidden",
          type: "menu",
          order: 2,
          isVisible: false,
          isEnabled: false,
          actionKeys: [],
          children: []
        }
      ]
    }
  ],
  screens: [
    {
      screenKey: "screen:ops",
      uiKey: "ops",
      title: "Operations",
      route: "/ops",
      isVisible: true,
      isEnabled: true,
      actionKeys: ["action:ops-task-run"],
      layout: {
        template: "default-page",
        areas: [
          {
            areaKey: "main",
            purpose: "main",
            order: 0
          }
        ]
      },
      components: [
        {
          componentKey: "component:ops:main",
          uiKey: "ops",
          screenKey: "screen:ops",
          componentType: "page-content",
          slot: "main",
          order: 2,
          actionKeys: [],
          props: {
            test: "x"
          }
        }
      ]
    }
  ],
  actions: [
    {
      actionKey: "action:ops-task-run",
      uiKey: "ops.task.run",
      permissionName: "Ops_Task_Run",
      label: "Run",
      route: "/ops/task/run",
      actionType: "navigate",
      isVisible: true,
      isEnabled: false,
      targetScreenKey: "screen:ops"
    }
  ],
  dataSources: [
    {
      dataSourceKey: "datasource:ops",
      uiKey: "ops",
      screenKey: "screen:ops",
      endpointPath: "/api/v1/ops",
      httpMethod: "GET"
    }
  ]
};

describe("MUiEngineRuntime", () => {
  it("filters invisible navigation nodes", () => {
    const runtime = new MUiEngineRuntime(mManifest);
    const snapshot = runtime.MGetSnapshot();

    expect(snapshot.navigationGroups).toHaveLength(1);
    expect(snapshot.navigationGroups[0].items).toHaveLength(1);
    expect(snapshot.navigationGroups[0].items[0].uiKey).toBe("ops");
  });

  it("resolves screens and actions by keys", () => {
    const runtime = new MUiEngineRuntime(mManifest);

    expect(runtime.MResolveScreenByRoute("/ops")?.screenKey).toBe("screen:ops");
    expect(runtime.MResolveAction("action:ops-task-run")?.label).toBe("Run");
  });

  it("creates render plan using adapter mapping", () => {
    const runtime = new MUiEngineRuntime(mManifest);
    const screen = runtime.MResolveScreenByKey("screen:ops");

    expect(screen).not.toBeNull();
    const adapter = new MDefaultUiRenderAdapter({ "page-content": "PrimeTableShell" });
    const plan = MBuildRenderPlan(screen!, adapter);

    expect(plan).toHaveLength(1);
    expect(plan[0].resolvedComponentType).toBe("PrimeTableShell");
  });

  it("uses registry custom element tag when descriptor provides one", () => {
    const screen: MUiEngineScreen = {
      screenKey: "screen:custom",
      uiKey: "custom",
      title: "Custom",
      route: "/custom",
      isVisible: true,
      isEnabled: true,
      actionKeys: [],
      layout: {
        template: "default-page",
        areas: []
      },
      components: [
        {
          componentKey: "component:custom:main",
          uiKey: "custom",
          screenKey: "screen:custom",
          componentType: "decision-table-editor",
          slot: "main",
          order: 0,
          actionKeys: [],
          props: {}
        }
      ]
    };

    const plan = MBuildRenderPlan(
      screen,
      new MDefaultUiRenderAdapter(),
      {
        ...mManifest,
        componentRegistry: {
          components: {
            "decision-table-editor": {
              componentType: "decision-table-editor",
              bundleUrl: "/assets/muonroi-rule-components.iife.js",
              customElementTag: "mu-decision-table",
              requiredTier: "Professional"
            }
          }
        }
      }
    );

    expect(plan[0].resolvedComponentType).toBe("mu-decision-table");
    expect(plan[0].customElementTag).toBe("mu-decision-table");
  });

  it("keeps execute decision from backend", () => {
    const runtime = new MUiEngineRuntime(mManifest);
    const action = runtime.MResolveAction("action:ops-task-run");

    expect(action).not.toBeNull();
    expect(MCanExecuteAction(action!)).toBe(false);
  });
});
