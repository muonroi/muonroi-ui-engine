import {
  MLicenseVerifier,
  type MUiEngineAction,
  type MUiEngineNavigationGroup,
  type MUiEngineScreen
} from "@muonroi/ui-engine-core";
import React from "react";
import { createComponent } from "@lit/react";
import "@muonroi/ui-engine-rule-components";

export interface MReactNavigationItem {
  id: string;
  title: string;
  route: string;
  disabled: boolean;
  children: MReactNavigationItem[];
}

export interface MReactNavigationGroup {
  id: string;
  title: string;
  items: MReactNavigationItem[];
}

export interface MReactUiModel {
  navigation: MReactNavigationGroup[];
  screens: MUiEngineScreen[];
  actions: MUiEngineAction[];
}

export interface MLoadRuleEngineCustomElementsOptions {
  activationProof?: string | null;
  publicKeyPem?: string;
}

export async function MLoadRuleEngineCustomElements(options?: MLoadRuleEngineCustomElementsOptions): Promise<void> {
  const activationProof = options?.activationProof?.trim() ?? "";
  if (activationProof) {
    await MLicenseVerifier.initialize(activationProof, {
      publicKeyPem: options?.publicKeyPem
    });
  }

  await import("@muonroi/ui-engine-rule-components");
}

export function MCreateReactUiModel(
  groups: MUiEngineNavigationGroup[],
  screens: MUiEngineScreen[],
  actions: MUiEngineAction[]
): MReactUiModel {
  return {
    navigation: groups.map((group) => ({
      id: group.groupName,
      title: group.groupDisplayName,
      items: MMapNavigation(group.items)
    })),
    screens: screens.filter((screen) => screen.isVisible),
    actions: actions.filter((action) => action.isVisible)
  };
}

function MMapNavigation(nodes: MUiEngineNavigationGroup["items"]): MReactNavigationItem[] {
  return nodes
    .filter((node) => node.isVisible)
    .sort((left, right) => left.order - right.order)
    .map((node) => ({
      id: node.nodeKey,
      title: node.title,
      route: node.route,
      disabled: !node.isEnabled,
      children: MMapNavigation(node.children)
    }));
}

export interface MRuleComponentEvents {
  onSave?: (event: Event) => void;
  onValidate?: (event: Event) => void;
  onChange?: (event: Event) => void;
}

const MDefaultElementClass =
  (typeof customElements !== "undefined" ? customElements.get("mu-decision-table") : undefined) ??
  class extends HTMLElement {};

const MEventMap = {
  onSave: "save",
  onValidate: "validate",
  onChange: "change"
} as const;

export const MuDecisionTableReact = createComponent({
  react: React,
  tagName: "mu-decision-table",
  elementClass: MDefaultElementClass as typeof HTMLElement,
  events: MEventMap
});

export const MuNRulesEditorReact = createComponent({
  react: React,
  tagName: "mu-nrules-editor",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-nrules-editor") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: MEventMap
});

export const MuCepWindowConfigReact = createComponent({
  react: React,
  tagName: "mu-cep-window-config",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-cep-window-config") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: MEventMap
});

export const MuFeelPlaygroundReact = createComponent({
  react: React,
  tagName: "mu-feel-playground",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-feel-playground") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: MEventMap
});

export const MuRuleFlowDesignerReact = createComponent({
  react: React,
  tagName: "mu-rule-flow-designer",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-rule-flow-designer") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: MEventMap
});
