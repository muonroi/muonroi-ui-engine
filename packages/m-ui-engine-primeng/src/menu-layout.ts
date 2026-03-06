import type { MUiEngineNavigationGroup, MUiEngineNavigationNode } from "@muonroi/ui-engine-core";

export interface MUiMenuActionMetadata {
  name: string;
  uiKey: string;
  type: string;
  isGranted: boolean;
  children: MUiMenuActionMetadata[];
}

export interface MUiMenuMetadataGroup {
  groupName: string;
  groupDisplayName: string;
  actions: MUiMenuActionMetadata[];
}

export interface MPrimeNgTemplateMenuItem {
  label: string;
  icon?: string;
  routerLink?: string[];
  items?: MPrimeNgTemplateMenuItem[];
  separator?: boolean;
  visible?: boolean;
  disabled?: boolean;
}

export interface MPrimeNgMenuLayoutStrategy {
  readonly mLayoutId: string;
  readonly mAliases?: readonly string[];
  MMapRuntimeGroups(groups: MUiEngineNavigationGroup[]): MPrimeNgTemplateMenuItem[];
  MMapMetadataGroups(groups: MUiMenuMetadataGroup[]): MPrimeNgTemplateMenuItem[];
}

export class MPrimeNgFreyaMenuLayoutStrategy implements MPrimeNgMenuLayoutStrategy {
  public readonly mLayoutId = "primeng-freya";
  public readonly mAliases = ["freya", "primeng", "default"];

  public MMapRuntimeGroups(groups: MUiEngineNavigationGroup[]): MPrimeNgTemplateMenuItem[] {
    return groups
      .map((group) => ({
        label: group.groupDisplayName || group.groupName || "System",
        icon: "pi pi-fw pi-sitemap",
        items: this.MMapRuntimeNodes(group.items ?? [])
      }))
      .filter((group) => (group.items?.length ?? 0) > 0);
  }

  public MMapMetadataGroups(groups: MUiMenuMetadataGroup[]): MPrimeNgTemplateMenuItem[] {
    return groups
      .map((group) => ({
        label: group.groupDisplayName || group.groupName || "System",
        icon: "pi pi-fw pi-sitemap",
        items: this.MMapMetadataActions(group.actions ?? [])
      }))
      .filter((group) => (group.items?.length ?? 0) > 0);
  }

  private MMapRuntimeNodes(nodes: MUiEngineNavigationNode[]): MPrimeNgTemplateMenuItem[] {
    return nodes
      .filter((node) => node.isVisible)
      .sort((left, right) => left.order - right.order)
      .map((node) => this.MCreateRuntimeMenuItem(node))
      .filter((item): item is MPrimeNgTemplateMenuItem => item !== null);
  }

  private MCreateRuntimeMenuItem(node: MUiEngineNavigationNode): MPrimeNgTemplateMenuItem | null {
    const children = this.MMapRuntimeNodes(node.children ?? []);
    const routerLink = this.MMapRouteToRouterLink(node.route ?? "");

    if (!routerLink && children.length === 0) {
      return null;
    }

    const item: MPrimeNgTemplateMenuItem = {
      label: node.title || node.uiKey || "Untitled",
      icon: node.icon ?? "pi pi-circle",
      disabled: !node.isEnabled
    };

    if (routerLink) {
      item.routerLink = routerLink;
    }

    if (children.length > 0) {
      item.items = children;
    }

    return item;
  }

  private MMapMetadataActions(actions: MUiMenuActionMetadata[]): MPrimeNgTemplateMenuItem[] {
    return actions
      .map((action) => this.MCreateMetadataMenuItem(action))
      .filter((item): item is MPrimeNgTemplateMenuItem => item !== null);
  }

  private MCreateMetadataMenuItem(action: MUiMenuActionMetadata): MPrimeNgTemplateMenuItem | null {
    if (!action.isGranted) {
      return null;
    }

    const children = this.MMapMetadataActions(action.children ?? []);
    const isMenuType = (action.type ?? "").trim().toLowerCase() === "menu";
    const route = this.MBuildLegacyRoute(action.uiKey ?? "");

    if (!isMenuType && children.length === 0) {
      return null;
    }

    const item: MPrimeNgTemplateMenuItem = {
      label: action.name || action.uiKey || "Untitled",
      icon: "pi pi-fw pi-circle"
    };

    if (isMenuType) {
      item.routerLink = route ? [`/muonroi/${route}`] : ["/muonroi"];
    }

    if (children.length > 0) {
      item.items = children;
    }

    return item;
  }

  private MMapRouteToRouterLink(route: string): string[] | undefined {
    if (!route) {
      return undefined;
    }

    const normalized = route.startsWith("/") ? route : `/${route}`;
    if (normalized === "/" || normalized === "/muonroi") {
      return ["/muonroi"];
    }

    if (normalized.startsWith("/muonroi/")) {
      return [normalized];
    }

    return [`/muonroi${normalized}`];
  }

  private MBuildLegacyRoute(uiKey: string): string {
    if (!uiKey) {
      return "";
    }

    let path = uiKey
      .trim()
      .replace(/_/g, "/")
      .replace(/\./g, "/")
      .replace(/ /g, "-")
      .toLowerCase();

    while (path.includes("//")) {
      path = path.replace("//", "/");
    }

    return path.replace(/^\/+|\/+$/g, "");
  }
}

const M_DEFAULT_MENU_LAYOUT_STRATEGIES: readonly MPrimeNgMenuLayoutStrategy[] = [new MPrimeNgFreyaMenuLayoutStrategy()];

export function MResolvePrimeNgMenuLayoutStrategy(
  requestedLayoutId: string,
  strategies: readonly MPrimeNgMenuLayoutStrategy[] = M_DEFAULT_MENU_LAYOUT_STRATEGIES
): MPrimeNgMenuLayoutStrategy {
  if (strategies.length === 0) {
    throw new Error("No PrimeNG menu strategy registered.");
  }

  const requested = (requestedLayoutId ?? "").trim().toLowerCase();
  if (!requested) {
    return strategies[0];
  }

  const matched = strategies.find((strategy) => {
    if (strategy.mLayoutId.toLowerCase() === requested) {
      return true;
    }

    return (strategy.mAliases ?? []).some((alias) => alias.toLowerCase() === requested);
  });

  return matched ?? strategies[0];
}
