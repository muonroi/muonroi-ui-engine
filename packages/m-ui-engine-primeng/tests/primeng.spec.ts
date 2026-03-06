import { describe, expect, it } from "vitest";
import {
  MMapActionsToPrimeNgButtons,
  MMapNavigationGroupsToPrimeNgMenu,
  MPrimeNgFreyaMenuLayoutStrategy,
  MPrimeNgRenderAdapter,
  MResolvePrimeNgMenuLayoutStrategy
} from "../src/index.js";
import { MBuildRenderPlan, type MUiEngineScreen } from "@muonroi/ui-engine-core";

describe("PrimeNG adapter", () => {
  it("maps navigation groups to PrimeNG menu model", () => {
    const menu = MMapNavigationGroupsToPrimeNgMenu([
      {
        groupName: "admin",
        groupDisplayName: "Administration",
        items: [
          {
            nodeKey: "node:admin",
            uiKey: "admin",
            title: "Admin",
            route: "/admin",
            type: "menu",
            order: 1,
            isVisible: true,
            isEnabled: true,
            actionKeys: [],
            children: []
          }
        ]
      }
    ]);

    expect(menu).toHaveLength(1);
    expect(menu[0].label).toBe("Administration");
    expect(menu[0].items?.[0].routerLink).toBe("/admin");
  });

  it("maps actions to PrimeNG button model", () => {
    const buttons = MMapActionsToPrimeNgButtons([
      {
        actionKey: "action:a",
        uiKey: "a",
        permissionName: "A",
        label: "Go",
        route: "/go",
        actionType: "navigate",
        isVisible: true,
        isEnabled: false
      }
    ]);

    expect(buttons).toHaveLength(1);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[0].icon).toBe("pi pi-arrow-right");
  });

  it("provides default component mapping for render plan", () => {
    const screen: MUiEngineScreen = {
      screenKey: "screen:s",
      uiKey: "s",
      title: "S",
      route: "/s",
      isVisible: true,
      isEnabled: true,
      actionKeys: [],
      layout: {
        template: "default-page",
        areas: []
      },
      components: [
        {
          componentKey: "component:s:main",
          uiKey: "s",
          screenKey: "screen:s",
          componentType: "page-content",
          slot: "main",
          order: 0,
          actionKeys: [],
          props: {}
        }
      ]
    };

    const plan = MBuildRenderPlan(screen, new MPrimeNgRenderAdapter());
    expect(plan[0].resolvedComponentType).toBe("MPrimeNgPageContent");
  });

  it("maps metadata menu and runtime routes with Freya strategy", () => {
    const strategy = new MPrimeNgFreyaMenuLayoutStrategy();

    const runtimeMenu = strategy.MMapRuntimeGroups([
      {
        groupName: "admin",
        groupDisplayName: "Admin",
        items: [
          {
            nodeKey: "node:roles",
            uiKey: "admin.roles.view",
            title: "Roles",
            route: "/admin/roles",
            type: "menu",
            order: 1,
            isVisible: true,
            isEnabled: true,
            actionKeys: [],
            children: []
          }
        ]
      }
    ]);

    const metadataMenu = strategy.MMapMetadataGroups([
      {
        groupName: "ops",
        groupDisplayName: "Operations",
        actions: [
          {
            name: "Notifications",
            uiKey: "ops.notification",
            type: "menu",
            isGranted: true,
            children: []
          }
        ]
      }
    ]);

    expect(runtimeMenu[0].items?.[0].routerLink).toEqual(["/muonroi/admin/roles"]);
    expect(metadataMenu[0].items?.[0].routerLink).toEqual(["/muonroi/ops/notification"]);
  });

  it("resolves menu strategy by alias and falls back to default", () => {
    const strategy = new MPrimeNgFreyaMenuLayoutStrategy();

    const byAlias = MResolvePrimeNgMenuLayoutStrategy("freya", [strategy]);
    const fallback = MResolvePrimeNgMenuLayoutStrategy("unknown-layout", [strategy]);

    expect(byAlias.mLayoutId).toBe("primeng-freya");
    expect(fallback.mLayoutId).toBe("primeng-freya");
  });
});
