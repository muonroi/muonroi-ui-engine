import { describe, expect, it } from "vitest";
import "../src/registry.js";
import {
  MEnsureRuleFlowGraph,
  MImportRuleFlowGraph,
  MSerializeRuleFlowGraph
} from "../src/components/rule-flow/MuRuleFlowEditor.js";
import { MApplyRuleFlowAuthoringLayers, MOrderRuleFlowGraph, MValidateGraphForPublish } from "../src/components/rule-flow/rule-flow-authoring.js";
import { MRuleFlowGraphConverter } from "../src/utils/m-rule-flow-graph-converter.js";

type MConvertedConditionNode = {
  id: string;
  data?: {
    outputFields?: Array<{
      path: string;
      valueExpression: string;
      dataType?: string;
      runtimeWritten?: boolean;
    }>;
  };
};

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

  it("imports a valid flow graph and rejects invalid graph shapes", () => {
    const imported = MImportRuleFlowGraph(
      JSON.stringify({
        metadata: { version: 1, ruleSetCode: "wf.import" },
        nodes: [
          { id: "start", type: "trigger", label: "Start", position: { x: 10, y: 10 }, data: {} },
          { id: "rule-a", type: "condition", label: "Rule A", ruleCode: "RULE_A", position: { x: 120, y: 10 }, data: {} },
          { id: "end", type: "end", label: "End", position: { x: 240, y: 10 }, data: {} }
        ],
        edges: [
          { id: "edge-1", source: "start", target: "rule-a", edgeType: "always" },
          { id: "edge-2", source: "rule-a", target: "end", edgeType: "always" }
        ]
      })
    );

    expect(imported.metadata.ruleSetCode).toBe("wf.import");
    expect(() =>
      MImportRuleFlowGraph(
        JSON.stringify({
          nodes: [{ id: "rule-a", type: "condition", label: "Rule A", position: { x: 0, y: 0 }, data: {} }],
          edges: []
        })
      )
    ).toThrow(/exactly one trigger/i);
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

  it("computes execution order from dependency graph and rejects dependency cycles", () => {
    const result = MOrderRuleFlowGraph(
      MEnsureRuleFlowGraph({
        nodes: [
          { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
          { id: "a", type: "condition", label: "A", ruleCode: "RULE_A", position: { x: 120, y: 0 }, data: {} },
          { id: "b", type: "condition", label: "B", ruleCode: "RULE_B", position: { x: 240, y: 0 }, data: { dependsOn: ["RULE_A"] } },
          { id: "end", type: "end", label: "End", position: { x: 360, y: 0 }, data: {} }
        ],
        edges: [
          { id: "edge-1", source: "start", target: "a", edgeType: "always" },
          { id: "edge-2", source: "a", target: "b", edgeType: "always" },
          { id: "edge-3", source: "b", target: "end", edgeType: "always" }
        ]
      }),
      {}
    );

    expect(result.isValid).toBe(true);
    const orderedB = result.graph.nodes.find((node) => node.id === "b");
    expect(orderedB?.data.order).toBe(2);

    const cyclic = MOrderRuleFlowGraph(
      MEnsureRuleFlowGraph({
        nodes: [
          { id: "a", type: "condition", label: "A", ruleCode: "RULE_A", position: { x: 0, y: 0 }, data: { dependsOn: ["RULE_B"] } },
          { id: "b", type: "condition", label: "B", ruleCode: "RULE_B", position: { x: 120, y: 0 }, data: { dependsOn: ["RULE_A"] } }
        ],
        edges: []
      }),
      {}
    );

    expect(cyclic.isValid).toBe(false);
    expect(cyclic.issues[0]?.code).toBe("MRF008");
  });

  it("validates required mappings and expression references before publish", () => {
    const invalidAction = MValidateGraphForPublish(
      MEnsureRuleFlowGraph({
        metadata: { version: 1, ruleSetCode: "wf.validate.action" },
        nodes: [
          { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
          { id: "act", type: "action", label: "Action", ruleCode: "RULE_ACTION", position: { x: 120, y: 0 }, data: {} },
          { id: "end", type: "end", label: "End", position: { x: 240, y: 0 }, data: {} }
        ],
        edges: [
          { id: "e1", source: "start", target: "act", edgeType: "always" },
          { id: "e2", source: "act", target: "end", edgeType: "always" }
        ]
      }),
      {
        currentFlowContract: {
          requestContract: {
            contractName: "flow-input",
            fields: [{ path: "booking.id", label: "booking.id", dataType: "string", required: true }]
          }
        },
        nodeContractsById: new Map([
          ["act", {
            requestScope: {
              contractName: "act-input",
              fields: [{ path: "orderId", label: "orderId", dataType: "string", required: true }]
            }
          }]
        ])
      }
    );

    expect(invalidAction.isValid).toBe(false);
    expect(invalidAction.issues.some((issue) => issue.code === "MRF001")).toBe(true);

    const invalidCondition = MValidateGraphForPublish(
      MEnsureRuleFlowGraph({
        metadata: { version: 1, ruleSetCode: "wf.validate.condition" },
        nodes: [
          { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
          { id: "cond", type: "condition", label: "Condition", ruleCode: "RULE_COND", position: { x: 120, y: 0 }, data: { expression: { language: "feel", body: "missing.value > 0" } } },
          { id: "end", type: "end", label: "End", position: { x: 240, y: 0 }, data: {} }
        ],
        edges: [
          { id: "e1", source: "start", target: "cond", edgeType: "always" },
          { id: "e2", source: "cond", target: "end", edgeType: "on-true" }
        ]
      }),
      {
        currentFlowContract: {
          requestContract: {
            contractName: "flow-input",
            fields: [{ path: "booking.id", label: "booking.id", dataType: "string" }]
          }
        }
      }
    );

    expect(invalidCondition.isValid).toBe(false);
    expect(invalidCondition.issues.some((issue) => issue.code === "MRF005")).toBe(true);
  });

  it("serializes condition output facts with value expressions into graph JSON", () => {
    const ruleSet = MRuleFlowGraphConverter.toRuleSet({
      metadata: { version: 1, workflowName: "wf.condition-output", ruleSetCode: "wf.condition-output" },
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
        {
          id: "cond",
          type: "condition",
          label: "Condition",
          ruleCode: "COND_RULE",
          position: { x: 120, y: 0 },
          data: {
            expression: { language: "feel", body: "result.isPass = true" },
            contractOverride: {
              responseFields: [
                {
                  path: "hello",
                  label: "hello",
                  dataType: "string",
                  valueExpression: "\"world\"",
                  runtimeWritten: true
                }
              ]
            }
          }
        },
        { id: "end", type: "end", label: "End", position: { x: 240, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "start", target: "cond", edgeType: "always" },
        { id: "e2", source: "cond", target: "end", edgeType: "on-true" }
      ]
    });

    const flowGraph = ruleSet.flowGraph as { nodes?: MConvertedConditionNode[] };
    const conditionNode = (flowGraph.nodes ?? []).find((node) => node.id === "cond");
    expect(conditionNode?.data?.outputFields).toEqual([
      {
        path: "hello",
        valueExpression: "\"world\"",
        dataType: "string",
        runtimeWritten: true
      }
    ]);
  });

  it("normalizes outputFields back into the condition output contract", () => {
    const graph = MEnsureRuleFlowGraph({
      metadata: { version: 1, workflowName: "wf.condition-output" },
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
        {
          id: "cond",
          type: "condition",
          label: "Condition",
          position: { x: 120, y: 0 },
          data: {
            outputFields: [
              {
                path: "hello",
                valueExpression: "\"world\"",
                dataType: "string",
                runtimeWritten: true
              }
            ]
          }
        },
        { id: "end", type: "end", label: "End", position: { x: 240, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "start", target: "cond", edgeType: "always" },
        { id: "e2", source: "cond", target: "end", edgeType: "on-true" }
      ]
    });

    const conditionNode = graph.nodes.find((node) => node.id === "cond");
    expect(conditionNode?.data.contractOverride?.responseFields).toEqual([
      expect.objectContaining({
        path: "hello",
        valueExpression: "\"world\"",
        dataType: "string",
        runtimeWritten: true
      })
    ]);
  });

  it("falls back to rule contracts when flow-level authoring contracts are unavailable", () => {
    const layered = MApplyRuleFlowAuthoringLayers(
      MEnsureRuleFlowGraph({
        metadata: { version: 1, ruleSetCode: "wf.rule-fallback" },
        nodes: [
          { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
          { id: "rule-a", type: "condition", label: "Rule A", ruleCode: "RULE_A", position: { x: 120, y: 0 }, data: {} },
          { id: "end", type: "end", label: "End", position: { x: 240, y: 0 }, data: {} }
        ],
        edges: [
          { id: "e1", source: "start", target: "rule-a", edgeType: "always" },
          { id: "e2", source: "rule-a", target: "end", edgeType: "on-true" }
        ]
      }),
      {
        nodeContractsById: new Map([
          ["rule-a", {
            nodeId: "rule-a",
            flowCode: "wf.rule-fallback",
            nodeType: "condition",
            ruleCode: "RULE_A",
            requestScope: {
              contractName: "rule-a-input",
              fields: [{ path: "header.taxCode", label: "header.taxCode", dataType: "string", required: true }]
            },
            responseDelta: {
              contractName: "rule-a-output",
              fields: [{ path: "validated.taxCode", label: "validated.taxCode", dataType: "string", runtimeWritten: true }]
            }
          }]
        ])
      }
    );

    const trigger = layered.nodes.find((node) => node.id === "start");
    const rule = layered.nodes.find((node) => node.id === "rule-a");
    expect(trigger?.data.contractLayer?.upstreamScope?.fields[0]?.path).toBe("header.taxCode");
    expect(rule?.data.contractLayer?.upstreamScope?.fields.some((field) => field.path === "header.taxCode")).toBe(true);
    expect(rule?.data.contractLayer?.outputContract?.fields.some((field) => field.path === "validated.taxCode")).toBe(true);
  });
});
