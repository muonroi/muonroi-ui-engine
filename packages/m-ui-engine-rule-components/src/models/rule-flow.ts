export type MRuleFlowNodeType = "trigger" | "condition" | "action" | "decision-table" | "sub-flow" | "liquid" | "connector" | "end";

export type MRuleFlowEdgeType = "always" | "on-true" | "on-false" | "on-error";

export type MRuleFlowExpressionLanguage = "feel" | "liquid" | "scriban" | "plain-text" | "javascript" | "json";

export type MRuleFlowContractSourceType = "rule" | "flow" | "decision-table" | "api" | "inline";

export interface MRuleFlowGraph {
  nodes: MRuleFlowNode[];
  edges: MRuleFlowEdge[];
  metadata: MRuleFlowMetadata;
}

export interface MRuleFlowPosition {
  x: number;
  y: number;
}

export interface MRuleFlowContractField {
  path: string;
  label: string;
  dataType: string;
  valueExpression?: string;
  runtimeWritten?: boolean;
  required?: boolean;
  description?: string;
  example?: string;
  exposeToParent?: boolean;
  isResultPayload?: boolean;
  sourceNodeId?: string;
  sourceNodeLabel?: string;
  sourceNodeType?: MRuleFlowNodeType;
  sourceKind?: "flow-input" | "node-output" | "result-payload" | "sub-flow-output" | "inline";
  children?: MRuleFlowContractField[];
}

export interface MRuleFlowContractSchema {
  contractName: string;
  title?: string;
  description?: string;
  rootType?: string;
  fields: MRuleFlowContractField[];
}

export interface MRuleCatalogItem {
  code: string;
  displayName: string;
  category?: string;
  icon?: string;
  tags: string[];
  description?: string;
  sourceKey?: string;
  inputSchema?: MRuleFlowContractSchema;
  outputSchema?: MRuleFlowContractSchema;
}

export interface MRuleCatalogGroup {
  category: string;
  items: MRuleCatalogItem[];
}

export interface MRuleFlowContractReference {
  sourceType: MRuleFlowContractSourceType;
  sourceCode: string;
  label?: string;
}

export interface MRuleFlowExpression {
  language: MRuleFlowExpressionLanguage;
  body: string;
}

export interface MRuleFlowConditionConfig {
  successLabel?: string;
  failureLabel?: string;
  failureMessage?: string;
}

export interface MRuleFlowMappingRow {
  id: string;
  sourcePath: string;
  targetPath: string;
  transform?: string;
  language?: MRuleFlowExpressionLanguage;
}

export type MContractValidationSeverity = "error" | "warning" | "info";

export interface MContractValidationIssue {
  code: string;
  severity: MContractValidationSeverity;
  message: string;
  nodeId?: string;
  fieldPath?: string;
  sourcePath?: string;
  targetPath?: string;
  relatedNodeId?: string;
}

export interface MEffectiveInputMapping extends MRuleFlowMappingRow {
  targetField?: string;
  sourceDataType?: string;
  targetDataType?: string;
  sourceNodeId?: string;
  sourceNodeLabel?: string;
  required?: boolean;
  status?: "mapped" | "missing" | "type-mismatch" | "suggested";
  transformSuggestion?: string;
}

export interface MNodeEffectiveInput {
  contractName: string;
  title?: string;
  description?: string;
  mode?: "auto" | "manual" | "expression" | "decision-table" | "sub-flow";
  fields: MRuleFlowContractField[];
  mappings: MEffectiveInputMapping[];
}

export interface MNodeContractLayer {
  upstreamScope?: MRuleFlowContractSchema;
  effectiveInput?: MNodeEffectiveInput;
  outputContract?: MRuleFlowContractSchema;
  validationIssues?: MContractValidationIssue[];
}

export interface MRuleFlowContractOverride {
  requestFields?: MRuleFlowContractField[];
  responseFields?: MRuleFlowContractField[];
}

export interface MRuleFlowSubFlowConfig {
  targetFlowCode?: string;
  childTriggerSchema?: MRuleFlowContractSchema;
  inputMappings: MRuleFlowMappingRow[];
  outputMappings: MRuleFlowMappingRow[];
}

export interface MRuleFlowLiquidConfig {
  template?: string;
  outputFormat?: "json" | "text" | "object";
}

export interface MRuleFlowConnectorConfig {
  connectorType?: string;
  connectorConfig?: Record<string, unknown>;
  credentialId?: string;
}

export interface MRuleFlowNodeData {
  description?: string;
  expression?: MRuleFlowExpression;
  contractRef?: MRuleFlowContractReference;
  requestContract?: MRuleFlowContractSchema;
  responseContract?: MRuleFlowContractSchema;
  contractOverride?: MRuleFlowContractOverride;
  inputMappings?: MRuleFlowMappingRow[];
  contractLayer?: MNodeContractLayer;
  dependsOn?: string[];
  order?: number;
  conditionConfig?: MRuleFlowConditionConfig;
  subFlowConfig?: MRuleFlowSubFlowConfig;
  liquidConfig?: MRuleFlowLiquidConfig;
  connectorConfig?: MRuleFlowConnectorConfig;
  [key: string]: unknown;
}

export interface MRuleFlowNode {
  id: string;
  type: MRuleFlowNodeType;
  label: string;
  feelExpression?: string;
  ruleCode?: string;
  expressionLanguage?: "feel" | "javascript";
  position: MRuleFlowPosition;
  data: MRuleFlowNodeData;
}

export interface MRuleFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  edgeType: MRuleFlowEdgeType;
}

export interface MRuleFlowMetadata {
  version: number;
  tenantId?: string;
  ruleSetCode?: string;
  workflowName?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export function MCreateEmptyRuleFlowGraph(): MRuleFlowGraph {
  return {
    nodes: [],
    edges: [],
    metadata: {
      version: 1
    }
  };
}
