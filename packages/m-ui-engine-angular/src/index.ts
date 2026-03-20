import type {
  MUiEngineAuthProfile,
  MUiEngineComponent,
  MUiEngineNavigationNode,
  MUiEngineScreen
} from "@muonroi/ui-engine-core";
import { MLicenseVerifier } from "@muonroi/ui-engine-core";

export interface MAngularRouteDefinition {
  path: string;
  screenKey: string;
  canActivate: boolean;
  isVisible: boolean;
  layoutTemplate: string;
  dataSourceKey?: string | null;
  actionKeys: string[];
  components: MAngularScreenComponent[];
}

export interface MAngularScreenComponent {
  componentKey: string;
  componentType: string;
  slot: string;
  order: number;
  dataSourceKey?: string | null;
  props: Record<string, string>;
}

export interface MAngularMenuItem {
  key: string;
  label: string;
  icon?: string | null;
  route: string;
  disabled: boolean;
  children: MAngularMenuItem[];
}

export interface MAngularMenuNode extends MAngularMenuItem {
  nodeKey: string;
  screenKey?: string | null;
  actionKeys: string[];
  isVisible: boolean;
}

export function MMapScreensToAngularRoutes(screens: MUiEngineScreen[]): MAngularRouteDefinition[] {
  return screens
    .map((screen) => ({
      path: screen.route.startsWith("/") ? screen.route.slice(1) : screen.route,
      screenKey: screen.screenKey,
      canActivate: screen.isEnabled,
      isVisible: screen.isVisible,
      layoutTemplate: screen.layout.template,
      dataSourceKey: screen.dataSourceKey,
      actionKeys: screen.actionKeys.slice(),
      components: screen.components
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((component: MUiEngineComponent) => ({
          componentKey: component.componentKey,
          componentType: component.componentType,
          slot: component.slot,
          order: component.order,
          dataSourceKey: component.dataSourceKey,
          props: { ...component.props }
        }))
    }));
}

export function MMapNavigationToAngularMenu(nodes: MUiEngineNavigationNode[]): MAngularMenuItem[] {
  return MMapNavigationToAngularMenuNodes(nodes).map((node) => ({
    key: node.key,
    label: node.label,
    icon: node.icon,
    route: node.route,
    disabled: node.disabled,
    children: node.children
  }));
}

export function MMapNavigationToAngularMenuNodes(nodes: MUiEngineNavigationNode[]): MAngularMenuNode[] {
  return nodes
    .filter((node) => node.isVisible)
    .sort((left, right) => left.order - right.order)
    .map((node) => ({
      key: node.nodeKey,
      nodeKey: node.nodeKey,
      label: node.title,
      icon: node.icon,
      route: node.route,
      disabled: !node.isEnabled,
      screenKey: node.screenKey,
      actionKeys: node.actionKeys.slice(),
      isVisible: node.isVisible,
      children: MMapNavigationToAngularMenuNodes(node.children)
    }));
}

export const MUiEngineCustomElementSchema = "CUSTOM_ELEMENTS_SCHEMA";

export interface MUiEngineAuthContext {
  mGetToken?: () => string | null;
  mGetTenantId?: () => string | null;
}

export abstract class MUiEngineAngularServiceBase {
  protected constructor(
    protected readonly mBaseApiUrl: string,
    protected readonly mAuthProfile: MUiEngineAuthProfile,
    protected readonly mAuthContext?: MUiEngineAuthContext
  ) {}

  protected mBuildUrl(
    path: string,
    pathParams?: Record<string, string | number>,
    query?: Record<string, string | number | boolean | null | undefined>
  ): string {
    let normalized = path.startsWith("/") ? path : `/${path}`;
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        normalized = normalized.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }

    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === null || value === undefined) {
          continue;
        }

        params.set(key, String(value));
      }
    }

    const queryString = params.toString();
    const base = this.mBaseApiUrl.replace(/\/$/, "");
    return queryString.length > 0 ? `${base}${normalized}?${queryString}` : `${base}${normalized}`;
  }

  protected mHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...(extraHeaders ?? {}) };

    const token = this.mAuthContext?.mGetToken?.();
    if (token && this.mAuthProfile.tokenSource === "header") {
      const normalized = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      headers[this.mAuthProfile.tokenKey || "Authorization"] = normalized;
    }

    const tenantId = this.mAuthContext?.mGetTenantId?.();
    if (tenantId) {
      headers[this.mAuthProfile.tenantHeaderKey || "X-Tenant-Id"] = tenantId;
    }

    const correlationKey = this.mAuthProfile.correlationIdKey || "X-Correlation-Id";
    const correlationValue = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    headers[correlationKey] = correlationValue;
    return headers;
  }
}

export function MAngularApiServiceFactory<TService>(
  create: (baseApiUrl: string, authProfile: MUiEngineAuthProfile, authContext?: MUiEngineAuthContext) => TService,
  options: {
    baseApiUrl: string;
    authProfile: MUiEngineAuthProfile;
    authContext?: MUiEngineAuthContext;
  }
): TService {
  return create(options.baseApiUrl, options.authProfile, options.authContext);
}

export interface MLoadRuleEngineCustomElementsOptions {
  activationProof?: string | null;
  publicKeyPem?: string;
  tenantId?: string | null;
  mGetTenantId?: () => string | null;
  headers?: Record<string, string> | null;
  mGetHeaders?: () => Record<string, string> | null;
}

export async function MLoadRuleEngineCustomElements(options?: MLoadRuleEngineCustomElementsOptions): Promise<void> {
  const activationProof = options?.activationProof?.trim() ?? "";
  console.info("[muonroi-debug] MLoadRuleEngineCustomElements start", {
    hasActivationProof: activationProof.length > 0,
    tenantId: options?.tenantId ?? options?.mGetTenantId?.() ?? null
  });
  if (activationProof) {
    console.info("[muonroi-debug] before MLicenseVerifier.initialize");
    await MLicenseVerifier.initialize(activationProof, {
      publicKeyPem: options?.publicKeyPem
    });
    console.info("[muonroi-debug] after MLicenseVerifier.initialize", MLicenseVerifier.current);
  }

  console.info("[muonroi-debug] before runtime import");
  const runtime = await import("@muonroi/ui-engine-rule-components");
  console.info("[muonroi-debug] after runtime import");
  runtime.MConfigureRuleComponentRuntime({
    tenantId: options?.tenantId,
    mGetTenantId: options?.mGetTenantId,
    headers: options?.headers ?? undefined,
    mGetHeaders: options?.mGetHeaders
  });
  console.info("[muonroi-debug] runtime configured");

  // Patch Shadow DOM :host tokens — LightningCSS (Vite 6+) strips :host
  // selectors from CSS during dep pre-bundling. This observer patches
  // mu-* custom elements after they connect to the DOM.
  MPatchShadowDomTokens();
}

/**
 * Patches mu-* Shadow DOM elements so design tokens (:host custom properties)
 * are available even when LightningCSS strips :host selectors during Vite
 * dependency pre-bundling.
 *
 * Uses MutationObserver to watch for mu-* elements added to the DOM,
 * then injects :host{} rules cloned from :root{} rules in adoptedStyleSheets.
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/738
 */
const M_PATCHED_ROOTS = new WeakSet<ShadowRoot>();

function MPatchShadowDomTokens(): void {
  const patchElement = (el: Element) => {
    const sr = el.shadowRoot;
    if (!sr || M_PATCHED_ROOTS.has(sr)) return;

    const sheets = sr.adoptedStyleSheets;
    if (!sheets || sheets.length === 0) return;
    const sheet = sheets[0];
    const rules = sheet.cssRules;
    if (!rules || rules.length === 0) return;

    // Skip if :host already has --mu- tokens
    for (let i = 0; i < rules.length; i++) {
      if (rules[i].cssText.startsWith(":host") && rules[i].cssText.includes("--mu-surface-canvas")) {
        M_PATCHED_ROOTS.add(sr);
        return;
      }
    }

    // Clone :root --mu- token blocks as :host rules
    let injected = false;
    for (let i = 0; i < rules.length; i++) {
      const text = rules[i].cssText;
      if (!text.includes("--mu-") || !text.startsWith(":root")) continue;
      const match = text.match(/\{([^}]+)\}/);
      if (match) {
        try { sheet.insertRule(`:host{${match[1]}}`, rules.length); injected = true; } catch { /* ignore */ }
      }
    }
    if (injected) M_PATCHED_ROOTS.add(sr);
  };

  const patchAll = () => {
    document.querySelectorAll("mu-rule-flow-designer, mu-decision-table, mu-decision-table-list, mu-rule-trace-viewer, mu-rule-result-panel, mu-nrules-editor, mu-feel-playground, mu-rule-test-runner, mu-ui-engine-app, mu-dt-version-diff, mu-cep-window-config, mu-cep-event-stream, mu-quota-indicator, mu-schema-watcher, mu-upgrade-prompt")
      .forEach(patchElement);
  };

  // Patch existing elements — defer to let Lit finish first render
  setTimeout(patchAll, 500);
  setTimeout(patchAll, 1500);
  setTimeout(patchAll, 3000);

  // Watch for future mu-* elements
  const observer = new MutationObserver((mutations) => {
    let hasMu = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof Element && node.tagName.startsWith("MU-")) {
          hasMu = true;
          break;
        }
      }
      if (hasMu) break;
    }
    if (hasMu) {
      // Defer to let Lit finish rendering shadow DOM
      requestAnimationFrame(() => setTimeout(patchAll, 100));
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function MBindCustomElementEvent<T>(
  callback: (detail: T, event: CustomEvent<T>) => void
): (event: Event) => void {
  return (event: Event) => {
    const customEvent = event as CustomEvent<T>;
    callback(customEvent.detail, customEvent);
  };
}
