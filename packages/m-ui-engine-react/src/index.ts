import {
  MLicenseVerifier,
  type MUiEngineAction,
  type MUiEngineNavigationGroup,
  type MUiEngineScreen
} from "@muonroi/ui-engine-core";
import React from "react";
import { createComponent } from "@lit/react";

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
    try {
      await MLicenseVerifier.initialize(activationProof, {
        publicKeyPem: options?.publicKeyPem
      });
    } catch {
      // RSA verification failed — components will use license-gated defaults
    }
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
  onGraphChange?: (event: Event) => void;
  onPublish?: (event: Event) => void;
}

export interface MRuleFlowComponentEvents extends MRuleComponentEvents {
  onGraphChange?: (event: Event) => void;
  onPublish?: (event: Event) => void;
}

const MDefaultElementClass =
  (typeof customElements !== "undefined" ? customElements.get("mu-decision-table") : undefined) ??
  class extends HTMLElement {};

const MEventMap = {
  onSave: "save",
  onValidate: "validate",
  onChange: "change",
  onGraphChange: "graph-change",
  onPublish: "publish"
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

const MuRuleFlowDesignerBase = createComponent({
  react: React,
  tagName: "mu-rule-flow-designer",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-rule-flow-designer") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    ...MEventMap,
    onGraphChange: "graph-change",
    onPublish: "publish"
  }
});

/**
 * The flow designer's `graph` prop is a complex object (nodes/edges/metadata).
 *
 * `mu-rule-flow-designer` is lazy-registered (via MLoadRuleEngineCustomElements) AFTER this
 * module evaluates, so at `createComponent` time `customElements.get(...)` is `undefined` and a
 * bare fallback `HTMLElement` subclass — with NO reactive `graph` property — is captured.
 * `@lit/react` then has no way to know `graph` is a property, so React serializes the object to a
 * string ATTRIBUTE (`graph="[object Object]"`) instead of setting the DOM property. The Lit element
 * keeps its empty default graph and the canvas renders blank.
 *
 * Fix: never let React stringify `graph` to an attribute. Strip it from the props handed to the
 * createComponent base and assign it to the live element as a DOM PROPERTY via ref. Lit captures
 * pre-upgrade instance properties, so this is correct whether or not the element has upgraded yet.
 * Primitive props (height/catalogApiBase/tenantId) are left to the base — Lit reads their
 * lowercased attributes correctly.
 */
export const MuRuleFlowDesignerReact = React.forwardRef<HTMLElement, Record<string, unknown>>(
  function MuRuleFlowDesignerReact(props, forwardedRef) {
    const { graph, ...rest } = props;
    const innerRef = React.useRef<HTMLElement | null>(null);

    React.useLayoutEffect(() => {
      const el = innerRef.current as (HTMLElement & { graph?: unknown }) | null;
      if (el && graph !== undefined) {
        el.graph = graph;
      }
    }, [graph]);

    const assignRef = React.useCallback(
      (el: HTMLElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") {
          forwardedRef(el);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }
      },
      [forwardedRef]
    );

    return React.createElement(MuRuleFlowDesignerBase as never, { ...rest, ref: assignRef });
  }
);

export const MuLivingDocsReact = createComponent({
  react: React,
  tagName: "mu-living-docs",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-living-docs") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    onNodeTraceRequested: "living-docs-node-trace-requested"
  }
});

export const MuTraceabilityMatrixReact = createComponent({
  react: React,
  tagName: "mu-traceability-matrix",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-traceability-matrix") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    onFilterChange: "matrix-filter-change"
  }
});

export const MuImpactListReact = createComponent({
  react: React,
  tagName: "mu-impact-list",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-impact-list") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    onNodeTraceRequested: "living-docs-node-trace-requested"
  }
});

export const MuJourneyHomeReact = createComponent({
  react: React,
  tagName: "mu-journey-home",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-journey-home") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    onStageNavigate: "journey-stage-navigate",
  },
});

// Phase 19 — BA Workspace Shell components (display-only badges, no events)

export const MuBaStatusBadgeReact = createComponent({
  react: React,
  tagName: "mu-ba-status-badge",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-ba-status-badge") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
});

export const MuSourceBadgeReact = createComponent({
  react: React,
  tagName: "mu-source-badge",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-source-badge") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
});

export const MuCoverageBadgeReact = createComponent({
  react: React,
  tagName: "mu-coverage-badge",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-coverage-badge") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
});

export const MuDocumentListReact = createComponent({
  react: React,
  tagName: "mu-document-list",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-document-list") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    onDocumentCreate: "document-create",
    onDocumentOpen: "document-open",
  },
});

export const MuEmptyStateReact = createComponent({
  react: React,
  tagName: "mu-empty-state",
  elementClass:
    ((typeof customElements !== "undefined" ? customElements.get("mu-empty-state") : undefined) ??
      class extends HTMLElement {}) as typeof HTMLElement,
  events: {
    onEmptyCta: "empty-cta",
  },
});
