import type React from "react";
import type {
  MContractValidationIssue,
  MEffectiveInputMapping,
  MRuleFlowConditionConfig,
  MRuleFlowConnectorConfig,
  MRuleFlowContractField,
  MRuleFlowContractOverride,
  MRuleFlowContractReference,
  MRuleFlowContractSchema,
  MRuleFlowEdge,
  MRuleFlowExpression,
  MRuleFlowExpressionLanguage,
  MRuleFlowGraph,
  MRuleFlowLiquidConfig,
  MRuleFlowMappingRow,
  MRuleFlowNode,
  MRuleFlowNodeData,
  MRuleFlowNodeType,
  MRuleFlowSubFlowConfig,
  MNodeContractLayer,
  MNodeEffectiveInput
} from "../../models.js";
import { MCreateEmptyRuleFlowGraph } from "../../models.js";

export type MCanvasNodeData = MRuleFlowNodeData & {
  label: string;
  ruleCode?: string;
  nodeType: MRuleFlowNodeType;
  _theme?: "light" | "dark";
};

export type MInspectorTab = "general" | "input-scope" | "effective-input" | "output-contract" | "expression";

export const M_NODE_TITLES: Record<MRuleFlowNodeType, string> = {
  trigger: "Trigger",
  condition: "Condition",
  action: "Action",
  "decision-table": "Decision Table",
  "sub-flow": "Sub Flow",
  liquid: "Liquid",
  connector: "Connector",
  end: "End"
};

export const M_NODE_ACCENTS: Record<MRuleFlowNodeType, string> = {
  trigger: "#16a34a",
  condition: "#7c3aed",
  action: "#2563eb",
  "decision-table": "#ea580c",
  "sub-flow": "#0891b2",
  liquid: "#0f766e",
  connector: "#9333ea",
  end: "#dc2626"
};

export const M_NODE_DEFAULT_LABELS: Record<MRuleFlowNodeType, string> = {
  trigger: "Create request",
  condition: "New Condition",
  action: "New Action",
  "decision-table": "Decision Table",
  "sub-flow": "Sub Flow",
  liquid: "Liquid Transform",
  connector: "New Connector",
  end: "End"
};

export const M_BASE_NODE_STYLE: React.CSSProperties = {
  minWidth: 188,
  borderRadius: 18,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "#ffffff",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.10)",
  padding: "12px 14px"
};

export function MEnsureRuleFlowGraph(graph: unknown): MRuleFlowGraph {
  if (!graph || typeof graph !== "object") {
    return MCreateEmptyRuleFlowGraph();
  }

  const candidate = graph as Partial<MRuleFlowGraph>;
  return {
    nodes: Array.isArray(candidate.nodes)
      ? candidate.nodes.map((node, index) => MNormalizeGraphNode(node, index))
      : [],
    edges: Array.isArray(candidate.edges)
      ? candidate.edges
          .filter((edge): edge is MRuleFlowEdge => Boolean(edge) && typeof edge.source === "string" && typeof edge.target === "string")
          .map((edge, index) => ({
            id: typeof edge.id === "string" && edge.id ? edge.id : `edge-${index + 1}`,
            source: edge.source,
            target: edge.target,
            label: typeof edge.label === "string" ? edge.label : undefined,
            edgeType: MNormalizeEdgeType(edge.edgeType)
          }))
      : [],
    metadata: {
      version: Math.max(1, candidate.metadata?.version ?? 1),
      tenantId: candidate.metadata?.tenantId,
      ruleSetCode: candidate.metadata?.ruleSetCode,
      workflowName: candidate.metadata?.workflowName,
      lastModifiedAt: candidate.metadata?.lastModifiedAt,
      lastModifiedBy: candidate.metadata?.lastModifiedBy
    }
  };
}

export function MSerializeRuleFlowGraph(graph: MRuleFlowGraph): string {
  return JSON.stringify(MEnsureRuleFlowGraph(graph), null, 2);
}

export function MImportRuleFlowGraph(payload: string): MRuleFlowGraph {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new Error(`Invalid rule flow JSON: ${(error as Error).message}`);
  }

  const graph = MEnsureRuleFlowGraph(parsed);
  const triggerCount = graph.nodes.filter((node) => node.type === "trigger").length;
  const endCount = graph.nodes.filter((node) => node.type === "end").length;
  if (triggerCount !== 1) {
    throw new Error("Imported flow must contain exactly one trigger node.");
  }
  if (endCount < 1) {
    throw new Error("Imported flow must contain at least one end node.");
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (nodeIds.size !== graph.nodes.length) {
    throw new Error("Imported flow contains duplicate node ids.");
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`Imported flow edge '${edge.id}' references missing nodes.`);
    }
  }

  return graph;
}

export function MCreateRuleFlowGraphSignature(graph: MRuleFlowGraph): string {
  const normalized = MEnsureRuleFlowGraph(graph);
  return JSON.stringify({
    nodes: normalized.nodes
      .map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        ruleCode: node.ruleCode ?? "",
        feelExpression: node.feelExpression ?? "",
        position: node.position,
        data: MNormalizeNodeData(node.data)
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    edges: normalized.edges
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? "",
        edgeType: edge.edgeType
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    metadata: {
      version: normalized.metadata.version,
      tenantId: normalized.metadata.tenantId ?? "",
      ruleSetCode: normalized.metadata.ruleSetCode ?? "",
      workflowName: normalized.metadata.workflowName ?? ""
    }
  });
}

function MNormalizeGraphNode(node: Partial<MRuleFlowNode>, index: number): MRuleFlowNode {
  const type = MNormalizeNodeType(node.type);
  const data = MNormalizeNodeData(node.data);
  const expression = MNormalizeExpression(data.expression, node.feelExpression, type);
  const position = node.position ?? { x: Number.NaN, y: Number.NaN };

  return {
    id: typeof node.id === "string" && node.id ? node.id : `node-${index + 1}`,
    type,
    label: typeof node.label === "string" && node.label ? node.label : M_NODE_DEFAULT_LABELS[type],
    feelExpression: expression.language === "feel" ? expression.body : undefined,
    ruleCode: typeof node.ruleCode === "string" ? node.ruleCode : undefined,
    expressionLanguage: node.expressionLanguage === "feel" || node.expressionLanguage === "javascript" ? node.expressionLanguage : undefined,
    position: {
      x: Number.isFinite(position?.x) ? position.x : 40 + index * 48,
      y: Number.isFinite(position?.y) ? position.y : 60 + (index % 4) * 88
    },
    data: {
      ...data,
      expression
    }
  };
}

export function MNormalizeNodeData(data: unknown): MRuleFlowNodeData {
  const candidate = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const outputFields = Array.isArray(candidate.outputFields)
    ? candidate.outputFields.map(MNormalizeContractField).filter(Boolean) as MRuleFlowContractField[]
    : [];
  const contractOverride = MNormalizeContractOverride(candidate.contractOverride);
  const responseFields = contractOverride?.responseFields?.length
    ? contractOverride.responseFields
    : outputFields.length
      ? outputFields
      : undefined;
  return {
    ...candidate,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    expression: MNormalizeExpression(candidate.expression, typeof candidate.feelExpression === "string" ? candidate.feelExpression : undefined),
    contractRef: MNormalizeContractReference(candidate.contractRef),
    requestContract: MNormalizeContractSchema(candidate.requestContract),
    responseContract: MNormalizeContractSchema(candidate.responseContract),
    contractOverride: contractOverride || responseFields
      ? {
          ...contractOverride,
          responseFields
        }
      : undefined,
    inputMappings: Array.isArray(candidate.inputMappings)
      ? candidate.inputMappings.map(MNormalizeMappingRow).filter(Boolean) as MRuleFlowMappingRow[]
      : undefined,
    contractLayer: MNormalizeNodeContractLayer(candidate.contractLayer),
    dependsOn: Array.isArray(candidate.dependsOn)
      ? candidate.dependsOn.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
      : undefined,
    order: typeof candidate.order === "number" && Number.isFinite(candidate.order) ? candidate.order : undefined,
    conditionConfig: MNormalizeConditionConfig(candidate.conditionConfig),
    subFlowConfig: MNormalizeSubFlowConfig(candidate.subFlowConfig),
    liquidConfig: MNormalizeLiquidConfig(candidate.liquidConfig),
    connectorConfig: MNormalizeConnectorConfig(candidate.connectorConfig)
  };
}

export function MNormalizeContractOverride(value: unknown): MRuleFlowContractOverride | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return {
    requestFields: Array.isArray(candidate.requestFields)
      ? candidate.requestFields.map(MNormalizeContractField).filter(Boolean) as MRuleFlowContractField[]
      : undefined,
    responseFields: Array.isArray(candidate.responseFields)
      ? candidate.responseFields.map(MNormalizeContractField).filter(Boolean) as MRuleFlowContractField[]
      : undefined
  };
}

export function MNormalizeContractReference(value: unknown): MRuleFlowContractReference | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const sourceType = candidate.sourceType;
  const sourceCode = candidate.sourceCode;
  if (typeof sourceType !== "string" || typeof sourceCode !== "string" || !sourceCode.trim()) {
    return undefined;
  }

  return {
    sourceType: MNormalizeContractSourceType(sourceType),
    sourceCode: sourceCode.trim(),
    label: typeof candidate.label === "string" ? candidate.label : undefined
  };
}

export function MNormalizeContractSchema(value: unknown): MRuleFlowContractSchema | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const contractName = typeof candidate.contractName === "string" && candidate.contractName.trim() ? candidate.contractName.trim() : "";
  if (!contractName) {
    return undefined;
  }

  return {
    contractName,
    title: typeof candidate.title === "string" ? candidate.title : undefined,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    rootType: typeof candidate.rootType === "string" ? candidate.rootType : undefined,
    fields: Array.isArray(candidate.fields) ? candidate.fields.map(MNormalizeContractField).filter(Boolean) as MRuleFlowContractField[] : []
  };
}

export function MNormalizeContractField(value: unknown): MRuleFlowContractField | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const path = typeof candidate.path === "string" && candidate.path.trim() ? candidate.path.trim() : "";
  const label = typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim() : path;
  const dataType = typeof candidate.dataType === "string" && candidate.dataType.trim() ? candidate.dataType.trim() : "unknown";
  if (!path) {
    return null;
  }

  return {
    path,
    label,
    dataType,
    valueExpression: typeof candidate.valueExpression === "string" ? candidate.valueExpression : undefined,
    runtimeWritten: candidate.runtimeWritten === true ? true : undefined,
    required: Boolean(candidate.required),
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    example: typeof candidate.example === "string" ? candidate.example : undefined,
    exposeToParent: candidate.exposeToParent === false ? false : undefined,
    isResultPayload: candidate.isResultPayload === true ? true : undefined,
    sourceNodeId: typeof candidate.sourceNodeId === "string" ? candidate.sourceNodeId : undefined,
    sourceNodeLabel: typeof candidate.sourceNodeLabel === "string" ? candidate.sourceNodeLabel : undefined,
    sourceNodeType: typeof candidate.sourceNodeType === "string" && MIsNodeType(candidate.sourceNodeType) ? candidate.sourceNodeType : undefined,
    sourceKind:
      candidate.sourceKind === "flow-input" ||
      candidate.sourceKind === "node-output" ||
      candidate.sourceKind === "result-payload" ||
      candidate.sourceKind === "sub-flow-output" ||
      candidate.sourceKind === "inline"
        ? candidate.sourceKind
        : undefined,
    children: Array.isArray(candidate.children)
      ? candidate.children.map(MNormalizeContractField).filter(Boolean) as MRuleFlowContractField[]
      : undefined
  };
}

export function MNormalizeExpression(
  value: unknown,
  legacyFeelExpression?: string,
  nodeType: MRuleFlowNodeType = "action"
): MRuleFlowExpression {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.language === "string" && typeof candidate.body === "string") {
      return {
        language: MNormalizeExpressionLanguage(candidate.language),
        body: candidate.body
      };
    }
  }

  if (typeof legacyFeelExpression === "string" && legacyFeelExpression.trim()) {
    return {
      language: "feel",
      body: legacyFeelExpression
    };
  }

  return MCreateDefaultExpression(nodeType);
}

export function MNormalizeConditionConfig(value: unknown): MRuleFlowConditionConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return {
    successLabel: typeof candidate.successLabel === "string" ? candidate.successLabel : undefined,
    failureLabel: typeof candidate.failureLabel === "string" ? candidate.failureLabel : undefined,
    failureMessage: typeof candidate.failureMessage === "string" ? candidate.failureMessage : undefined
  };
}

export function MNormalizeSubFlowConfig(value: unknown): MRuleFlowSubFlowConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return {
    targetFlowCode: typeof candidate.targetFlowCode === "string" ? candidate.targetFlowCode : undefined,
    childTriggerSchema: MNormalizeContractSchema(candidate.childTriggerSchema),
    inputMappings: Array.isArray(candidate.inputMappings)
      ? candidate.inputMappings.map(MNormalizeMappingRow).filter(Boolean) as MRuleFlowMappingRow[]
      : [],
    outputMappings: Array.isArray(candidate.outputMappings)
      ? candidate.outputMappings.map(MNormalizeMappingRow).filter(Boolean) as MRuleFlowMappingRow[]
      : []
  };
}

export function MNormalizeConnectorConfig(value: unknown): MRuleFlowConnectorConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return {
    connectorType: typeof candidate.connectorType === "string" ? candidate.connectorType : undefined,
    connectorConfig: candidate.connectorConfig && typeof candidate.connectorConfig === "object"
      ? candidate.connectorConfig as Record<string, unknown>
      : undefined,
    credentialId: typeof candidate.credentialId === "string" ? candidate.credentialId : undefined
  };
}

export function MEnsureConnectorConfig(value: MRuleFlowConnectorConfig | undefined): MRuleFlowConnectorConfig {
  return value ?? {
    connectorType: "",
    connectorConfig: {},
    credentialId: undefined
  };
}

export function MNormalizeLiquidConfig(value: unknown): MRuleFlowLiquidConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return {
    template: typeof candidate.template === "string" ? candidate.template : undefined,
    outputFormat:
      candidate.outputFormat === "json" || candidate.outputFormat === "text" || candidate.outputFormat === "object"
        ? candidate.outputFormat
        : undefined
  };
}

export function MNormalizeMappingRow(value: unknown): MRuleFlowMappingRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : `map-${Math.random().toString(36).slice(2, 9)}`,
    sourcePath: typeof candidate.sourcePath === "string" ? candidate.sourcePath : "",
    targetPath: typeof candidate.targetPath === "string" ? candidate.targetPath : "",
    transform: typeof candidate.transform === "string" ? candidate.transform : undefined,
    language: typeof candidate.language === "string" ? MNormalizeExpressionLanguage(candidate.language) : undefined
  };
}

export function MNormalizeEffectiveInputMapping(value: unknown): MEffectiveInputMapping | null {
  const normalized = MNormalizeMappingRow(value);
  if (!normalized || !value || typeof value !== "object") {
    return normalized as MEffectiveInputMapping | null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    ...normalized,
    targetField: typeof candidate.targetField === "string" ? candidate.targetField : undefined,
    sourceDataType: typeof candidate.sourceDataType === "string" ? candidate.sourceDataType : undefined,
    targetDataType: typeof candidate.targetDataType === "string" ? candidate.targetDataType : undefined,
    sourceNodeId: typeof candidate.sourceNodeId === "string" ? candidate.sourceNodeId : undefined,
    sourceNodeLabel: typeof candidate.sourceNodeLabel === "string" ? candidate.sourceNodeLabel : undefined,
    required: candidate.required === true ? true : undefined,
    status:
      candidate.status === "mapped" || candidate.status === "missing" || candidate.status === "type-mismatch" || candidate.status === "suggested"
        ? candidate.status
        : undefined,
    transformSuggestion: typeof candidate.transformSuggestion === "string" ? candidate.transformSuggestion : undefined
  };
}

export function MNormalizeContractValidationIssue(value: unknown): MContractValidationIssue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const code = typeof candidate.code === "string" && candidate.code.trim() ? candidate.code.trim() : "";
  const message = typeof candidate.message === "string" && candidate.message.trim() ? candidate.message.trim() : "";
  if (!code || !message) {
    return null;
  }

  return {
    code,
    message,
    severity: candidate.severity === "warning" || candidate.severity === "info" ? candidate.severity : "error",
    nodeId: typeof candidate.nodeId === "string" ? candidate.nodeId : undefined,
    fieldPath: typeof candidate.fieldPath === "string" ? candidate.fieldPath : undefined,
    sourcePath: typeof candidate.sourcePath === "string" ? candidate.sourcePath : undefined,
    targetPath: typeof candidate.targetPath === "string" ? candidate.targetPath : undefined,
    relatedNodeId: typeof candidate.relatedNodeId === "string" ? candidate.relatedNodeId : undefined
  };
}

export function MNormalizeNodeEffectiveInput(value: unknown): MNodeEffectiveInput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const contractName = typeof candidate.contractName === "string" && candidate.contractName.trim() ? candidate.contractName.trim() : "";
  if (!contractName) {
    return undefined;
  }

  return {
    contractName,
    title: typeof candidate.title === "string" ? candidate.title : undefined,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    mode:
      candidate.mode === "auto" ||
      candidate.mode === "manual" ||
      candidate.mode === "expression" ||
      candidate.mode === "decision-table" ||
      candidate.mode === "sub-flow"
        ? candidate.mode
        : undefined,
    fields: Array.isArray(candidate.fields) ? candidate.fields.map(MNormalizeContractField).filter(Boolean) as MRuleFlowContractField[] : [],
    mappings: Array.isArray(candidate.mappings)
      ? candidate.mappings.map(MNormalizeEffectiveInputMapping).filter(Boolean) as MEffectiveInputMapping[]
      : []
  };
}

export function MNormalizeNodeContractLayer(value: unknown): MNodeContractLayer | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return {
    upstreamScope: MNormalizeContractSchema(candidate.upstreamScope),
    effectiveInput: MNormalizeNodeEffectiveInput(candidate.effectiveInput),
    outputContract: MNormalizeContractSchema(candidate.outputContract),
    validationIssues: Array.isArray(candidate.validationIssues)
      ? candidate.validationIssues.map(MNormalizeContractValidationIssue).filter(Boolean) as MContractValidationIssue[]
      : undefined
  };
}

export function MEnsureExpression(data: Partial<MCanvasNodeData>): MRuleFlowExpression {
  const legacyFeelExpression = typeof data.feelExpression === "string" ? data.feelExpression : undefined;
  return MNormalizeExpression(data.expression, legacyFeelExpression, data.nodeType ?? "action");
}

export function MEnsureSubFlowConfig(value: MRuleFlowSubFlowConfig | undefined): MRuleFlowSubFlowConfig {
  return value ?? {
    targetFlowCode: "",
    childTriggerSchema: undefined,
    inputMappings: [],
    outputMappings: []
  };
}

export function MEnsureLiquidConfig(value: MRuleFlowLiquidConfig | undefined): MRuleFlowLiquidConfig {
  return value ?? {
    outputFormat: "json"
  };
}

export function MFlattenContractFields(fields: MRuleFlowContractField[], bucket: MRuleFlowContractField[] = []): MRuleFlowContractField[] {
  for (const field of fields) {
    bucket.push(field);
    if (field.children?.length) {
      MFlattenContractFields(field.children, bucket);
    }
  }

  return bucket;
}

export function MCreateContractCacheKey(reference: MRuleFlowContractReference): string {
  return `${reference.sourceType}:${reference.sourceCode}`.toLowerCase();
}

export function MInferContractReference(
  nodeType: MRuleFlowNodeType,
  ruleCode: string,
  existing: MRuleFlowContractReference | undefined
): MRuleFlowContractReference | undefined {
  const sourceCode = ruleCode.trim();
  if (!sourceCode) {
    return existing;
  }

  return {
    sourceType: existing?.sourceType ?? MDefaultContractSourceType(nodeType),
    sourceCode,
    label: existing?.label
  };
}

export function MDefaultInspectorTabForNode(nodeType: MRuleFlowNodeType): MInspectorTab {
  if (nodeType === "trigger") {
    return "input-scope";
  }

  if (nodeType === "condition" || nodeType === "action" || nodeType === "decision-table" || nodeType === "sub-flow" || nodeType === "liquid" || nodeType === "connector") {
    return "effective-input";
  }

  return "general";
}

export function MDefaultContractSourceType(nodeType: MRuleFlowNodeType): MRuleFlowContractReference["sourceType"] {
  if (nodeType === "sub-flow") {
    return "flow";
  }
  if (nodeType === "decision-table") {
    return "decision-table";
  }
  if (nodeType === "liquid") {
    return "api";
  }
  if (nodeType === "connector") {
    return "api";
  }
  return "rule";
}

export function MAvailableInspectorTabs(nodeType: MRuleFlowNodeType): MInspectorTab[] {
  const tabs: MInspectorTab[] = ["general", "input-scope", "effective-input", "output-contract"];
  if (nodeType !== "trigger" && nodeType !== "end") {
    tabs.push("expression");
  }
  return tabs;
}

export function MInspectorTabTitle(tab: MInspectorTab): string {
  return tab === "general"
    ? "General"
    : tab === "input-scope"
      ? "Input Scope"
      : tab === "effective-input"
        ? "Effective Input"
        : tab === "output-contract"
          ? "Output Contract"
          : "Expression";
}

export function MCreateDefaultExpression(nodeType: MRuleFlowNodeType): MRuleFlowExpression {
  return {
    language: nodeType === "liquid" ? "liquid" : "feel",
    body: ""
  };
}

export function MIsNodeType(value: string): value is MRuleFlowNodeType {
  return value === "trigger" || value === "condition" || value === "action" || value === "decision-table" || value === "sub-flow" || value === "liquid" || value === "connector" || value === "end";
}

export function MNormalizeNodeType(value: unknown): MRuleFlowNodeType {
  return typeof value === "string" && MIsNodeType(value) ? value : "action";
}

export function MNormalizeEdgeType(value: unknown): MRuleFlowEdge["edgeType"] {
  return value === "always" || value === "on-true" || value === "on-false" || value === "on-error" ? value : "always";
}

export function MNormalizeExpressionLanguage(value: unknown): MRuleFlowExpressionLanguage {
  return value === "feel" || value === "liquid" || value === "plain-text" ? value : "feel";
}

export function MNormalizeContractSourceType(value: unknown): MRuleFlowContractReference["sourceType"] {
  return value === "rule" || value === "flow" || value === "decision-table" || value === "api" || value === "inline" ? value : "rule";
}
