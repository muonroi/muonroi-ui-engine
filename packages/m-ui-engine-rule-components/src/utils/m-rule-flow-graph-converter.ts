import type { MRuleFlowEdge, MRuleFlowGraph, MRuleFlowNode, MRuleFlowNodeType } from "../models/rule-flow.js";

const M_DEFAULT_GRAPH: MRuleFlowGraph = {
  nodes: [
    MCreateNode("trigger", { x: 80, y: 180 }, { label: "Start" }),
    MCreateNode("end", { x: 760, y: 180 }, { label: "End" })
  ],
  edges: [
    {
      id: "edge-trigger-end",
      source: "trigger-1",
      target: "end-1",
      edgeType: "always"
    }
  ],
  metadata: {
    version: 1
  }
};

type MRuleSetLike = Record<string, unknown>;

export class MRuleFlowGraphConverter {
  public static fromRuleSet(ruleSet: unknown): MRuleFlowGraph {
    const objectRuleSet = MAsObject(ruleSet);
    const graphCandidate = objectRuleSet.flowGraph;
    if (MIsGraph(graphCandidate)) {
      return MNormalizeGraph({
        ...graphCandidate,
        metadata: {
          ...graphCandidate.metadata,
          workflowName: MReadString(objectRuleSet.workflowName) ?? graphCandidate.metadata.workflowName
        }
      });
    }

    const workflowName = MReadString(objectRuleSet.workflowName) ?? MReadString(objectRuleSet.WorkflowName) ?? "wf.new";
    const rules = MReadRuleCodes(objectRuleSet);
    if (rules.length === 0) {
      return {
        ...M_DEFAULT_GRAPH,
        metadata: {
          ...M_DEFAULT_GRAPH.metadata,
          workflowName
        }
      };
    }

    const nodes: MRuleFlowNode[] = [MCreateNode("trigger", { x: 80, y: 180 }, { label: "Start" })];
    const edges: MRuleFlowEdge[] = [];
    let previousNodeId = "trigger-1";

    for (let index = 0; index < rules.length; index += 1) {
      const ruleCode = rules[index];
      const node = MCreateNode("condition", { x: 220 + index * 220, y: 180 }, { label: ruleCode, ruleCode, nodeId: ruleCode });
      nodes.push(node);
      edges.push({
        id: `edge-${previousNodeId}-${node.id}`,
        source: previousNodeId,
        target: node.id,
        edgeType: "always"
      });
      previousNodeId = node.id;
    }

    const endNode = MCreateNode("end", { x: 220 + rules.length * 220, y: 180 }, { label: "End" });
    nodes.push(endNode);
    edges.push({
      id: `edge-${previousNodeId}-${endNode.id}`,
      source: previousNodeId,
      target: endNode.id,
      edgeType: "always"
    });

    return {
      nodes,
      edges,
      metadata: {
        version: 1,
        workflowName
      }
    };
  }

  public static toRuleSet(graph: MRuleFlowGraph, existingRuleSet?: unknown): MRuleSetLike {
    const source = MAsObject(existingRuleSet);
    const orderedRuleCodes = MCollectOrderedRuleCodes(MNormalizeGraph(graph));
    const workflowName =
      graph.metadata.workflowName ??
      graph.metadata.ruleSetCode ??
      MReadString(source.workflowName) ??
      MReadString(source.WorkflowName) ??
      "wf.new";

    return {
      ...source,
      workflowName,
      rules: orderedRuleCodes,
      flowGraph: MNormalizeGraph(graph)
    };
  }

  public static serialize(graph: MRuleFlowGraph): string {
    return JSON.stringify(MNormalizeGraph(graph), null, 2);
  }
}

function MCollectOrderedRuleCodes(graph: MRuleFlowGraph): string[] {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, MRuleFlowEdge[]>();
  for (const edge of graph.edges) {
    const bucket = outgoing.get(edge.source) ?? [];
    bucket.push(edge);
    outgoing.set(edge.source, bucket);
  }

  const visited = new Set<string>();
  const ruleCodes: string[] = [];
  let currentId = graph.nodes.find((node) => node.type === "trigger")?.id ?? graph.nodes[0]?.id;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const currentNode = nodesById.get(currentId);
    if (currentNode && currentNode.type !== "trigger" && currentNode.type !== "end") {
      const code = currentNode.ruleCode?.trim() || currentNode.label.trim();
      if (code.length > 0 && !ruleCodes.includes(code)) {
        ruleCodes.push(code);
      }
    }

    const nextEdge = (outgoing.get(currentId) ?? [])
      .slice()
      .sort((left, right) => left.target.localeCompare(right.target))[0];
    currentId = nextEdge?.target;
  }

  if (ruleCodes.length > 0) {
    return ruleCodes;
  }

  return graph.nodes
    .filter((node) => node.type !== "trigger" && node.type !== "end")
    .map((node) => node.ruleCode?.trim() || node.label.trim())
    .filter((code) => code.length > 0);
}

function MReadRuleCodes(ruleSet: MRuleSetLike): string[] {
  const rules = Array.isArray(ruleSet.rules) ? ruleSet.rules : Array.isArray(ruleSet.Rules) ? ruleSet.Rules : [];
  return rules
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (MAsObject(item).RuleName && typeof MAsObject(item).RuleName === "string") {
        return MAsObject(item).RuleName as string;
      }

      return MReadString(MAsObject(item).ruleCode) ?? MReadString(MAsObject(item).code) ?? "";
    })
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function MNormalizeGraph(graph: MRuleFlowGraph): MRuleFlowGraph {
  return {
    nodes: graph.nodes.map((node, index) => ({
      ...node,
      id: node.id || `${node.type}-${index + 1}`,
      label: node.label.trim() || `${MTitleCase(node.type)} ${index + 1}`,
      position: {
        x: Number.isFinite(node.position?.x) ? node.position.x : index * 220,
        y: Number.isFinite(node.position?.y) ? node.position.y : 180
      },
      data: {
        ...(node.data ?? {}),
        outputFields:
          node.type === "condition"
            ? (node.data?.contractOverride?.responseFields ?? [])
                .filter((field) => !field.isResultPayload && typeof field.valueExpression === "string" && field.valueExpression.trim().length > 0)
                .map((field) => ({
                  path: field.path,
                  valueExpression: field.valueExpression,
                  dataType: field.dataType,
                  runtimeWritten: true
                }))
            : (node.data as any)?.outputFields,
        contractRef:
          node.type !== "trigger" && node.type !== "end" && node.ruleCode
            ? {
                sourceType: node.type === "decision-table" ? "decision-table" : node.type === "sub-flow" ? "flow" : "rule",
                sourceCode: node.ruleCode
              }
            : (node.data?.contractRef ?? undefined)
      }
    })),
    edges: graph.edges.map((edge, index) => ({
      ...edge,
      id: edge.id || `edge-${index + 1}`,
      edgeType: edge.edgeType ?? "always"
    })),
    metadata: {
      version: graph.metadata?.version ?? 1,
      workflowName: graph.metadata?.workflowName ?? graph.metadata?.ruleSetCode
    }
  };
}

function MCreateNode(
  type: MRuleFlowNodeType,
  position: { x: number; y: number },
  options: { label: string; ruleCode?: string; nodeId?: string }
): MRuleFlowNode {
  const suffix = type === "trigger" || type === "end" ? "1" : `${Math.abs(position.x)}`;
  return {
    id: options.nodeId?.trim() || `${type}-${suffix}`,
    type,
    label: options.label,
    ruleCode: options.ruleCode,
    position,
    data: options.ruleCode
      ? {
          contractRef: {
            sourceType: "rule",
            sourceCode: options.ruleCode
          }
        }
      : {}
  };
}

function MTitleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MReadString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function MAsObject(value: unknown): Record<string, any> {
  return value !== null && typeof value === "object" ? (value as Record<string, any>) : {};
}

function MIsGraph(value: unknown): value is MRuleFlowGraph {
  const candidate = MAsObject(value);
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges) && candidate.metadata !== undefined;
}
