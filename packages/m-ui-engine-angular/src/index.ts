import type {
  MUiEngineAuthProfile,
  MUiEngineComponent,
  MUiEngineNavigationNode,
  MUiEngineScreen
} from "@muonroi/ui-engine-core";

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

export async function MLoadRuleEngineCustomElements(): Promise<void> {
  await import("@muonroi/ui-engine-rule-components");
}

export function MBindCustomElementEvent<T>(
  callback: (detail: T, event: CustomEvent<T>) => void
): (event: Event) => void {
  return (event: Event) => {
    const customEvent = event as CustomEvent<T>;
    callback(customEvent.detail, customEvent);
  };
}
