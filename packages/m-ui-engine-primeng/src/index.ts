import {
  MDefaultUiRenderAdapter,
  type MUiEngineAction,
  type MUiEngineNavigationGroup,
  type MUiEngineNavigationNode
} from "@muonroi/ui-engine-core";

export interface MPrimeNgMenuItem {
  label: string;
  icon?: string;
  routerLink?: string;
  disabled?: boolean;
  items?: MPrimeNgMenuItem[];
  badge?: string;
}

export interface MPrimeNgCommandButton {
  id: string;
  label: string;
  icon?: string;
  disabled: boolean;
  actionType: string;
  route: string;
}

export class MPrimeNgRenderAdapter extends MDefaultUiRenderAdapter {
  constructor(componentMap?: Record<string, string>) {
    super({
      "page-content": "MPrimeNgPageContent",
      "tab-content": "MPrimeNgTabContent",
      panel: "MPrimeNgPanel",
      "decision-table-editor": "mu-decision-table",
      "decision-table-list": "mu-decision-table-list",
      "nrules-editor": "mu-nrules-editor",
      "cep-window-config": "mu-cep-window-config",
      "feel-playground": "mu-feel-playground",
      "rule-flow-designer": "mu-rule-flow-designer",
      ...(componentMap ?? {})
    });
  }
}

export function MMapNavigationGroupsToPrimeNgMenu(groups: MUiEngineNavigationGroup[]): MPrimeNgMenuItem[] {
  return groups
    .filter((group) => group.items.some((item) => item.isVisible))
    .map((group) => ({
      label: group.groupDisplayName,
      items: MMapNavigationNodesToPrimeNgMenu(group.items)
    }));
}

export function MMapNavigationNodesToPrimeNgMenu(nodes: MUiEngineNavigationNode[]): MPrimeNgMenuItem[] {
  return nodes
    .filter((node) => node.isVisible)
    .sort((left, right) => left.order - right.order)
    .map((node) => ({
      label: node.title,
      icon: node.icon ?? undefined,
      routerLink: node.route,
      disabled: !node.isEnabled,
      items: MMapNavigationNodesToPrimeNgMenu(node.children)
    }));
}

export function MMapActionsToPrimeNgButtons(actions: MUiEngineAction[]): MPrimeNgCommandButton[] {
  return actions
    .filter((action) => action.isVisible)
    .map((action) => ({
      id: action.actionKey,
      label: action.label,
      icon: MResolvePrimeNgActionIcon(action),
      disabled: !action.isEnabled,
      actionType: action.actionType,
      route: action.route
    }));
}

function MResolvePrimeNgActionIcon(action: MUiEngineAction): string {
  if (action.actionType === "navigate") {
    return "pi pi-arrow-right";
  }

  if (action.actionType === "submit") {
    return "pi pi-check";
  }

  return "pi pi-bolt";
}

export * from "./menu-layout.js";
