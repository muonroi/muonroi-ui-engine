import type React from "react";
import type {
  MRuleFlowConditionConfig,
  MRuleFlowContractField,
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
  MRuleFlowSubFlowConfig
} from "../../models.js";
import { MCreateEmptyRuleFlowGraph } from "../../models.js";

export type MCanvasNodeData = MRuleFlowNodeData & {
  label: string;
  ruleCode?: string;
  nodeType: MRuleFlowNodeType;
};

export type MInspectorTab = "general" | "request" | "response" | "expression" | "mappings";

export const M_NODE_TITLES: Record<MRuleFlowNodeType, string> = {
  trigger: "Trigger",
  condition: "Condition",
  action: "Action",
  "decision-table": "Decision Table",
  "sub-flow": "Sub Flow",
  liquid: "Liquid",
  end: "End"
};

export const M_NODE_ACCENTS: Record<MRuleFlowNodeType, string> = {
  trigger: "#16a34a",
  condition: "#7c3aed",
  action: "#2563eb",
  "decision-table": "#ea580c",
  "sub-flow": "#0891b2",
  liquid: "#0f766e",
  end: "#dc2626"
};

export const M_NODE_DEFAULT_LABELS: Record<MRuleFlowNodeType, string> = {
  trigger: "Create request",
  condition: "New Condition",
  action: "New Action",
  "decision-table": "Decision Table",
  "sub-flow": "Sub Flow",
  liquid: "Liquid Transform",
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
  return {
    ...candidate,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    expression: MNormalizeExpression(candidate.expression, typeof candidate.feelExpression === "string" ? candidate.feelExpression : undefined),
    contractRef: MNormalizeContractReference(candidate.contractRef),
    requestContract: MNormalizeContractSchema(candidate.requestContract),
    responseContract: MNormalizeContractSchema(candidate.responseContract),
    conditionConfig: MNormalizeConditionConfig(candidate.conditionConfig),
    subFlowConfig: MNormalizeSubFlowConfig(candidate.subFlowConfig),
    liquidConfig: MNormalizeLiquidConfig(candidate.liquidConfig)
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
    required: Boolean(candidate.required),
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    example: typeof candidate.example === "string" ? candidate.example : undefined,
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
    inputMappings: Array.isArray(candidate.inputMappings)
      ? candidate.inputMappings.map(MNormalizeMappingRow).filter(Boolean) as MRuleFlowMappingRow[]
      : [],
    outputMappings: Array.isArray(candidate.outputMappings)
      ? candidate.outputMappings.map(MNormalizeMappingRow).filter(Boolean) as MRuleFlowMappingRow[]
      : []
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

export function MEnsureExpression(data: Partial<MCanvasNodeData>): MRuleFlowExpression {
  const legacyFeelExpression = typeof data.feelExpression === "string" ? data.feelExpression : undefined;
  return MNormalizeExpression(data.expression, legacyFeelExpression, data.nodeType ?? "action");
}

export function MEnsureSubFlowConfig(value: MRuleFlowSubFlowConfig | undefined): MRuleFlowSubFlowConfig {
  return value ?? {
    targetFlowCode: "",
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
  if (nodeType === "sub-flow") {
    return "mappings";
  }

  if (nodeType === "condition" || nodeType === "liquid") {
    return "expression";
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
  return "rule";
}

export function MAvailableInspectorTabs(nodeType: MRuleFlowNodeType): MInspectorTab[] {
  const tabs: MInspectorTab[] = ["general", "request", "response"];
  if (nodeType !== "trigger" && nodeType !== "end") {
    tabs.push("expression");
  }
  if (nodeType === "sub-flow") {
    tabs.push("mappings");
  }
  return tabs;
}

export function MInspectorTabTitle(tab: MInspectorTab): string {
  return tab === "general" ? "General" : tab === "request" ? "Request Schema" : tab === "response" ? "Response Schema" : tab === "expression" ? "Expression" : "Mappings";
}

export function MCreateDefaultExpression(nodeType: MRuleFlowNodeType): MRuleFlowExpression {
  return {
    language: nodeType === "liquid" ? "liquid" : "feel",
    body: ""
  };
}

export function MIsNodeType(value: string): value is MRuleFlowNodeType {
  return value === "trigger" || value === "condition" || value === "action" || value === "decision-table" || value === "sub-flow" || value === "liquid" || value === "end";
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
