export type MRuleFlowNodeType = "trigger" | "condition" | "action" | "decision-table" | "sub-flow" | "end";

export type MRuleFlowEdgeType = "always" | "on-true" | "on-false" | "on-error";

export interface MRuleFlowGraph {
  nodes: MRuleFlowNode[];
  edges: MRuleFlowEdge[];
  metadata: MRuleFlowMetadata;
}

export interface MRuleFlowNode {
  id: string;
  type: MRuleFlowNodeType;
  label: string;
  feelExpression?: string;
  ruleCode?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
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
