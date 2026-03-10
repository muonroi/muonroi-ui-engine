import { describe, expect, it } from "vitest";
import "../src/registry.js";
import {
  MEnsureRuleFlowGraph,
  MSerializeRuleFlowGraph
} from "../src/components/rule-flow/MuRuleFlowEditor.js";
import { MRuleFlowGraphConverter } from "../src/utils/m-rule-flow-graph-converter.js";

describe("rule flow registry", () => {
  it("registers the rule flow custom element", () => {
    expect(customElements.get("mu-rule-flow-designer")).toBeDefined();
  });
});

describe("rule flow normalization", () => {
  it("normalizes empty payloads into an empty graph", () => {
    const graph = MEnsureRuleFlowGraph(null);
    expect(graph.metadata.version).toBe(1);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it("keeps supported node and edge types during normalization", () => {
    const graph = MEnsureRuleFlowGraph({
      metadata: { version: 2, ruleSetCode: "wf.sample" },
      nodes: [
        {
          id: "start",
          type: "trigger",
          label: "Start",
          position: { x: 20, y: 30 },
          data: {}
        },
        {
          id: "check",
          type: "condition",
          label: "Check Score",
          ruleCode: "CHECK_SCORE",
          feelExpression: "score > 600",
          position: { x: 120, y: 30 },
          data: {}
        }
      ],
      edges: [
        {
          id: "edge-1",
          source: "start",
          target: "check",
          edgeType: "on-true",
          label: "true"
        }
      ]
    });

    expect(graph.metadata.ruleSetCode).toBe("wf.sample");
    expect(graph.nodes[1]?.type).toBe("condition");
    expect(graph.nodes[1]?.ruleCode).toBe("CHECK_SCORE");
    expect(graph.edges[0]?.edgeType).toBe("on-true");
  });

  it("serializes a normalized graph as JSON", () => {
    const json = MSerializeRuleFlowGraph(
      MEnsureRuleFlowGraph({
        metadata: { version: 1, ruleSetCode: "wf.json" },
        nodes: [],
        edges: []
      })
    );

    expect(json).toContain("\"ruleSetCode\": \"wf.json\"");
  });

  it("converts a ruleset export into a flow graph with rule nodes", () => {
    const graph = MRuleFlowGraphConverter.fromRuleSet({
      workflowName: "FCD-CreateV2-Rules",
      rules: ["FCD_V2_TAX_VALID", "FCD_V2_LINER_VALID"]
    });

    expect(graph.metadata.workflowName).toBe("FCD-CreateV2-Rules");
    expect(graph.nodes.some((node) => node.ruleCode === "FCD_V2_TAX_VALID")).toBe(true);
    expect(graph.nodes.some((node) => node.ruleCode === "FCD_V2_LINER_VALID")).toBe(true);
    expect(graph.edges).toHaveLength(3);
  });
});
