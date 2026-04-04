import type { Edge, Node } from "@xyflow/react";
import type { MRuleFlowGraph } from "../../models.js";
import {
  MEnsureRuleFlowGraph,
  MNormalizeNodeType,
  type MCanvasNodeData,
  type MInspectorTab
} from "./rule-flow-helpers.js";

export * from "./rule-flow-helpers.js";

export function MGraphToCanvasNodes(graph: MRuleFlowGraph): Node<MCanvasNodeData>[] {
  const normalized = MEnsureRuleFlowGraph(graph);
  return normalized.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.label,
      ruleCode: node.ruleCode,
      nodeType: MNormalizeNodeType(node.type),
      ...node.data
    }
  }));
}

export function MGraphToCanvasEdges(graph: MRuleFlowGraph): Edge[] {
  const normalized = MEnsureRuleFlowGraph(graph);
  return normalized.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? edge.edgeType,
    data: {
      edgeType: edge.edgeType
    }
  }));
}

export type { MCanvasNodeData, MInspectorTab };
