export type MPermissionType = "menu" | "tab" | "action";
export type MUiEngineSchemaVersion = "mui.engine.v1" | "mui.engine.v2";

export interface MUiEngineManifest {
  schemaVersion: MUiEngineSchemaVersion;
  generatedAtUtc: string;
  userId: string;
  tenantId?: string | null;
  licenseTier?: string;
  capabilities?: MUiEngineCapability[];
  navigationGroups: MUiEngineNavigationGroup[];
  screens: MUiEngineScreen[];
  actions: MUiEngineAction[];
  dataSources: MUiEngineDataSource[];
  componentRegistry?: MUiEngineComponentRegistry;
  appShell?: MUiEngineAppShell | null;
  authProfile?: MUiEngineAuthProfile | null;
  apiContracts?: MUiEngineApiContract[] | null;
  ruleBindings?: MUiEngineRuleBinding[] | null;
  generationHints?: MUiEngineGenerationHints | null;
}

export interface MUiEngineManifestV2 extends MUiEngineManifest {
  schemaVersion: "mui.engine.v2";
  appShell?: MUiEngineAppShell | null;
  authProfile?: MUiEngineAuthProfile | null;
  apiContracts?: MUiEngineApiContract[] | null;
  ruleBindings?: MUiEngineRuleBinding[] | null;
  generationHints?: MUiEngineGenerationHints | null;
}

export interface MUiEngineCapability {
  capabilityKey: string;
  displayName: string;
  isEnabled: boolean;
  requiredTier: string;
  componentOverrides: Record<string, string>;
  actionOverrides: Record<string, string>;
}

export interface MUiEngineAppShell {
  rootLayout: string;
  slots: string[];
  theme?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export interface MUiEngineAuthProfile {
  tokenSource: "header" | "cookie" | "localStorage";
  tokenKey: string;
  refreshPath?: string | null;
  tenantHeaderKey: string;
  correlationIdKey: string;
  failurePolicy: "redirect" | "401" | "retry";
}

export interface MUiEngineApiContract {
  operationId: string;
  endpointPath: string;
  httpMethod: string;
  requestSchemaRef?: string | null;
  responseSchemaRef?: string | null;
  tags: string[];
}

export interface MUiEngineRuleBinding {
  endpointRoute: string;
  workflowName?: string | null;
  contextType?: string | null;
  orderedRules: string[];
}

export interface MUiEngineGenerationHints {
  outputBasePath?: string | null;
  coreOutputPath?: string | null;
  apiOutputPath?: string | null;
  modelsOutputPath?: string | null;
  featuresOutputPath?: string | null;
  watchEnabled: boolean;
}

export interface MUiEngineComponentRegistry {
  components: Record<string, MUiEngineComponentDescriptor>;
}

export interface MUiEngineComponentDescriptor {
  componentType: string;
  bundleUrl: string;
  cssUrl?: string | null;
  customElementTag?: string | null;
  isLazyLoaded?: boolean;
  requiredTier: string;
}

export interface MUiEngineContractInfo {
  runtimeSchemaVersion: MUiEngineSchemaVersion | string;
  supportedSchemaVersions: string[];
  currentManifestEndpoint: string;
  userManifestEndpointTemplate: string;
  schemaHashEndpoint?: string;
  notifyChangeEndpoint?: string;
  realtimeHubEndpoint?: string;
  generatedAtUtc: string;
}

export interface MUiEngineCatalogApiDescriptor {
  route: string;
  httpMethod: string;
  controllerName: string;
  actionName: string;
  requestType?: string | null;
  responseType?: string | null;
  authSchemes: string[];
  policies: string[];
  requiresTenantId: boolean;
}

export interface MUiEngineCatalogRuleDescriptor {
  code: string;
  name: string;
  order: number;
  dependsOn: string[];
  hookPoint: string;
  ruleType: string;
  contextType: string;
  source: "code-first" | "rulegen" | "runtime-json" | string;
  isEnabled: boolean;
  isCompensatable: boolean;
}

export interface MUiEngineCatalogRuleRef {
  code: string;
  order: number;
  hookPoint: string;
}

export interface MUiEngineCatalogBinding {
  endpointRoute: string;
  httpMethod: string;
  contextType?: string | null;
  workflowName?: string | null;
  rules: MUiEngineCatalogRuleRef[];
}

export interface MUiEngineCatalogGraph {
  nodes: MUiEngineCatalogGraphNode[];
  edges: MUiEngineCatalogGraphEdge[];
}

export interface MUiEngineCatalogGraphNode {
  id: string;
  type: "endpoint" | "rule" | string;
  label: string;
  data: Record<string, string | null>;
}

export interface MUiEngineCatalogGraphEdge {
  from: string;
  to: string;
  edgeType: "triggers" | "depends-on" | "part-of" | string;
}

export interface MUiEngineNavigationGroup {
  groupName: string;
  groupDisplayName: string;
  items: MUiEngineNavigationNode[];
}

export interface MUiEngineNavigationNode {
  nodeKey: string;
  uiKey: string;
  parentUiKey?: string | null;
  title: string;
  route: string;
  type: MPermissionType;
  icon?: string | null;
  order: number;
  isVisible: boolean;
  isEnabled: boolean;
  disabledReason?: string | null;
  screenKey?: string | null;
  actionKeys: string[];
  children: MUiEngineNavigationNode[];
}

export interface MUiEngineScreen {
  screenKey: string;
  uiKey: string;
  title: string;
  route: string;
  isVisible: boolean;
  isEnabled: boolean;
  disabledReason?: string | null;
  dataSourceKey?: string | null;
  actionKeys: string[];
  layout: MUiEngineLayout;
  components: MUiEngineComponent[];
}

export interface MUiEngineLayout {
  template: string;
  areas: MUiEngineLayoutArea[];
}

export interface MUiEngineLayoutArea {
  areaKey: string;
  purpose: string;
  order: number;
}

export interface MUiEngineComponent {
  componentKey: string;
  uiKey: string;
  screenKey: string;
  componentType: string;
  slot: string;
  order: number;
  dataSourceKey?: string | null;
  actionKeys: string[];
  props: Record<string, string>;
}

export interface MUiEngineAction {
  actionKey: string;
  uiKey: string;
  permissionName: string;
  label: string;
  route: string;
  actionType: string;
  isVisible: boolean;
  isEnabled: boolean;
  disabledReason?: string | null;
  targetScreenKey?: string | null;
}

export interface MUiEngineDataSource {
  dataSourceKey: string;
  uiKey: string;
  screenKey: string;
  endpointPath: string;
  httpMethod: string;
  requestModel?: string | null;
  responseModel?: string | null;
}
